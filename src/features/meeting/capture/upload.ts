/**
 * 업로드 계층 — 15초 조각(`recorder.ts`)을 모아 서버 presign(CAP-04)으로 받은 URL에
 * **브라우저가 S3로 직접 PUT**하고, 성공하면 complete(CAP-07)로 알린다(WORKFLOW §3-3).
 *
 * ⚠️ presign은 **배치**로 받는다(기본 20개=5분치) — 조각마다 새로 부르면 15초마다
 *    왕복이 끼어든다. 배치가 바닥나기 전에 다음 배치를 미리 받아 둔다.
 * ⚠️ **순서대로, 하나씩 올린다.** 동시에 여러 개를 올리면 늦게 끝난 것 때문에 순서가
 *    뒤집혀 BE의 결원 판정(`missingSeqs`)이 실제로는 안 밀린 조각까지 결원으로 본다.
 * ⚠️ **실패해도 녹음은 안 멈춘다.** 오디오가 정본이라고 해서 여기서 회의를 막으면 자막·
 *    녹음을 둘 다 잃는다 — 연속 실패만 화면에 알리고(`onFailure`) 다음 조각은 계속 받는다.
 * ⚠️ **Content-Type이 서명에 들어간다**(BE `CapS3ObjectStorageAdapter`가 `PutObjectRequest`에
 *    `contentType`을 실어 presign한다) — PUT 헤더가 여기서 요청한 값과 다르면 S3가
 *    서명 불일치로 거절한다. presign 요청·PUT 헤더가 항상 같은 상수를 써야 한다.
 */

import { completeCaptureUploadAction, presignCaptureUploadAction } from "./actions";
import { SLICE_MS } from "./recorder";
import type { CapturePart } from "./types";

/** 15초 × 20 = 5분치 — 한 배치의 크기 */
const BATCH_COUNT = 20;

/** 이 개수 이하로 남으면 다음 배치를 미리 받는다(바닥나고서 받으면 그사이 조각이 밀린다) */
const REFILL_THRESHOLD = 3;

/** presign 요청·PUT 헤더가 공유하는 값 — `recorder.ts`가 이 형식으로 녹음한다 */
export const RECORDING_CONTENT_TYPE = "audio/webm";

export interface UploadHandlers {
  /** 연속 실패 — 녹음은 계속되지만 화면에 남긴다(§정직성) */
  onFailure(message: string): void;
}

export interface SliceUploader {
  /** 조각 하나를 큐에 넣는다 — 호출 순서대로 올라간다 */
  enqueue(blob: Blob): void;
  /** 큐에 남은 조각을 마저 올릴 때까지 기다린다 — 종료 직전에 부른다 */
  flush(): Promise<void>;
}

/** 연속 실패 이 횟수부터 화면에 알린다 — 한두 번의 튐은 흔하다(§captions와 같은 기준) */
const MAX_CONSECUTIVE_FAILURES = 3;

/** 조각 하나(PUT+complete)를 이만큼 재시도한다 — 그래도 안 되면 이 조각만 포기한다 */
const MAX_UPLOAD_ATTEMPTS = 3;

/** 재시도 사이 간격 — S3·네트워크가 순간적으로 튄 경우를 위한 최소한의 여유 */
const RETRY_DELAY_MS = 500;

/** S3 PUT 하나가 이 시간을 넘기면 멈춰선 것으로 본다 — `fetch`엔 기본 timeout이 없다 */
const PUT_TIMEOUT_MS = 20_000;

/**
 * 풀에 든 조각 — **발급 당시의 `segmentSeq`를 같이 들고 다닌다.**
 * ⚠️ 배치마다 `segmentSeq`가 바뀔 수 있다(녹음자 교체 등, `CaptureUploadService`
 *    `willChangeSegment`) — 전역 변수 하나로 두면 새 배치가 그 값을 덮어써서, 아직
 *    풀에 남아 있던 **이전 배치의 조각**이 **새 세그먼트 번호**로 complete될 수 있다.
 */
interface PooledPart extends CapturePart {
  segmentSeq: number;
}

/**
 * presigned URL 경로에서 오브젝트 키를 뽑는다.
 *
 * ⚠️ presign 응답엔 키가 따로 안 온다 — BE는 서명된 URL만 주고, complete에 실어 보낼 키는
 *    이 URL 자신에서 읽어야 한다(`CaptureUploadService.buildS3Key`가 서버 안에서만 안다).
 */
function keyOf(presignedUrl: string): string {
  const { pathname } = new URL(presignedUrl);
  return decodeURIComponent(pathname.replace(/^\//, ""));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createSliceUploader(meetingId: number, handlers: UploadHandlers): SliceUploader {
  let pool: PooledPart[] = [];
  let refilling: Promise<void> | null = null;
  let consecutiveFailures = 0;
  /** 순서를 지키는 직렬 큐 — 각 조각은 앞 조각이 끝난 뒤에만 시작한다 */
  let chain: Promise<void> = Promise.resolve();

  const reportFailure = () => {
    consecutiveFailures += 1;
    if (consecutiveFailures === MAX_CONSECUTIVE_FAILURES) {
      handlers.onFailure("녹음 파일을 서버에 올리지 못하고 있습니다. 자막은 계속 기록됩니다.");
    }
  };

  /*
    ⚠️ **여기서 절대 안 던진다.** `presignCaptureUploadAction`은 스스로 값으로 실패를
       돌려주지만(actions.ts의 규칙), 그래도 예기치 못하게 거부되면 `refilling`이
       rejected 프라미스로 남는다 — `nextPart`의 `await refill()`이 그걸 그대로 던지면
       `uploadOne`이 죽고, 그 뒤로는 `chain`의 `.then()`이 하나도 안 돌아 **큐 전체가
       멈춘다**(CodeRabbit 지적, 2026-08-16). 실패도 "빈 배치"로 흡수한다.
  */
  const refill = (): Promise<void> => {
    if (refilling) return refilling;
    refilling = presignCaptureUploadAction(meetingId, BATCH_COUNT, RECORDING_CONTENT_TYPE)
      .then((result) => {
        if (result.ok && result.data) {
          const { segmentSeq, parts } = result.data;
          pool = [...pool, ...parts.map((part) => ({ ...part, segmentSeq }))];
        }
      })
      .catch(() => {
        /* 배치를 못 받았다 — 빈손으로 끝낸다, `nextPart`가 `null`로 받아 실패 처리한다 */
      })
      .finally(() => {
        refilling = null;
      });
    return refilling;
  };

  const nextPart = async (): Promise<PooledPart | null> => {
    // 여유 있게 미리 채운다 — 기다리지 않는다(바닥나기 전이라 급하지 않다)
    if (pool.length > 0 && pool.length <= REFILL_THRESHOLD) void refill();
    // 정말 바닥났으면 이번엔 기다린다 — 줄 새 조각을 그냥 버릴 수는 없다
    if (pool.length === 0) await refill();
    const [part, ...rest] = pool;
    if (!part) return null;
    pool = rest;
    return part;
  };

  /** 조각 하나를 한 번 PUT+complete한다 — 성공하면 `true` */
  const attemptOnce = async (part: PooledPart, blob: Blob): Promise<boolean> => {
    try {
      const response = await fetch(part.presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": RECORDING_CONTENT_TYPE },
        body: blob,
        // ⚠️ 기본 timeout이 없다 — S3가 응답 없이 멈추면 flush()·end()가 영원히 안 끝난다
        signal: AbortSignal.timeout(PUT_TIMEOUT_MS),
      });
      if (!response.ok) return false;

      const completed = await completeCaptureUploadAction(meetingId, part.seq, {
        segmentSeq: part.segmentSeq,
        s3Key: keyOf(part.presignedUrl),
        sizeBytes: blob.size,
      });
      return completed.ok;
    } catch {
      return false;
    }
  };

  /*
    ⚠️ **실패한 조각을 그냥 버리지 않는다.** 전엔 PUT이든 complete든 한 번 실패하면 그
       조각은 영영 안 올라가고 다음 조각이 더 큰 seq로 complete돼, 서버가 실제로는
       없는 공백을 결원(`missingSeqs`)으로 본다(CodeRabbit 지적, 2026-08-16). **같은
       presigned URL로 몇 번 더 시도**한다 — PUT에 실패했든(파일이 안 올라감) 아직
       S3엔 있는데 complete만 실패했든, URL 자체는 재사용해도 안전하다(성공한 PUT을
       또 해도 같은 객체를 덮어쓸 뿐이다).
  */
  const uploadOne = async (blob: Blob) => {
    const part = await nextPart();
    if (!part) {
      reportFailure();
      return;
    }

    for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
      const ok = await attemptOnce(part, blob);
      if (ok) {
        consecutiveFailures = 0;
        return;
      }
      if (attempt < MAX_UPLOAD_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }

    // 여기까지 왔으면 이 조각은 포기한다 — 그래도 녹음·다음 조각은 계속돼야 한다
    reportFailure();
  };

  return {
    enqueue(blob) {
      chain = chain.then(() => uploadOne(blob));
    },
    flush() {
      return chain;
    },
  };
}

/**
 * 복구 안내 한 줄 — CAP-08 결과를 사람이 읽을 문장으로 옮긴다(2026-08-19, #650).
 *
 * ⚠️ 분량은 `조각 수 × SLICE_MS`(15초)로 **계산한 근사치**다 — 마지막 조각이 15초를 다
 *    못 채웠을 수 있어 "약"을 뗄 수 없다. 서버는 조각 길이를 라이브로 안 알려준다
 *    (BE `gapMs`는 라이브 조회에서 항상 0).
 * ⚠️ `missingCount`는 재전송 목록이 아니라 **비어 있는 구간의 개수**다 — 크래시로 로컬
 *    원본이 사라져 되살릴 수 없으므로, 사실을 숨기지 않고 문장에 남긴다(§정직성).
 * ⚠️ `lastSeq === 0`이면 올라간 것이 없다고 말한다 — 0개(약 00:00)라고 쓰면 계산은 맞지만
 *    읽는 사람이 "뭔가 올라가긴 했나"를 한 번 더 물어야 한다.
 */
export function describeUploadedParts(status: { lastSeq: number; missingCount: number }): string {
  if (status.lastSeq <= 0) return "아직 서버에 올라간 녹음 조각은 없습니다.";

  const total = Math.floor((status.lastSeq * SLICE_MS) / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const length =
    minutes > 0 ? `약 ${minutes}분${seconds > 0 ? ` ${seconds}초` : ""}` : `약 ${seconds}초`;

  const base = `지금까지 녹음 조각 ${status.lastSeq}개(${length})가 서버에 올라가 있습니다.`;
  if (status.missingCount === 0) return base;
  return `${base} 이 중 ${status.missingCount}개 구간은 전송되지 못해 복구되지 않습니다.`;
}
