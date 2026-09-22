"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CAPTURE_FAILURE_MESSAGE } from "@/constants/meeting";

import {
  completeMeetingAction,
  getActiveCaptureAction,
  getPartsUploadStatusAction,
  type PartsUploadStatus,
  pauseCaptureSessionAction,
  resumeCaptureSessionAction,
  startCaptureSessionAction,
  submitCaptionsAction,
} from "./actions";
import { createLevelMeter, type LevelMeter } from "./level";
import {
  CAPTURE_PHASE,
  type CapturePhase,
  closedSegmentCountOf,
  formatRecordedTime,
  isCapturing,
  nextUtteranceStart,
  recordedMsOf,
  type RecordingSpan,
} from "./phase";
import { type CaptureRecorder, createCaptureRecorder, isRecordingSupported } from "./recorder";
import { createSttEngine, isSttSupported, type SttEngine, type TranscriptChunk } from "./stt";
import type { ActiveCapture, CaptionChunkInput } from "./types";
import { createSliceUploader, type SliceUploader } from "./upload";

/**
 * 캡처 화면의 손발 — 단계·시간·자막을 한 곳에서 든다.
 *
 * ⚠️ 화면(컴포넌트)은 브라우저 API를 모른다. 여기가 `stt`·`recorder` 두 계층을 부르고,
 *    컴포넌트는 값과 핸들러만 받는다(CLAUDE.md §로직은 커스텀 훅).
 * ⚠️ 서버 호출은 전부 `actions.ts`를 거친다 — 이 파일은 BE shape도 경로도 모른다(§격리막).
 * ⚠️ **자막이 못 올라가도 회의는 계속된다.** 자막은 정본이 아니라 실시간 표시·폴백용이라
 *    (BE `CaptionChunk` 주석), 전송 실패를 화면 전체 오류로 키우지 않는다 — 대신 조용히
 *    삼키지도 않는다(§정직성): 실패한 배치는 다시 보낸다. 같은 `seq`는 BE가 건너뛴다.
 */

/** 지원 여부 — 화면이 안내를 띄울 때 무엇이 없는지 말해야 한다 */
export interface CaptureSupport {
  stt: boolean;
  recording: boolean;
}

export interface UseCaptureResult {
  phase: CapturePhase;
  support: CaptureSupport;
  /** 실제 녹음 누적 ms — 일시정지는 빠진다 */
  recordedMs: number;
  chunks: TranscriptChunk[];
  /** 아직 확정 전인 말 — 화면에 흐리게 비추고 서버로는 안 보낸다 */
  partial: string;
  /** 되돌릴 수 없는 실패 한 줄 — 화면에 남긴다(토스트는 사라진다) */
  error: string | null;
  enter(): void;
  start(): Promise<void>;
  pause(): void;
  resume(): void;
  /**
   * 종료 — **서버가 받았는지까지 알려 준다**(2026-08-12).
   *
   * ⚠️ 로컬 정리(마이크·STT 끄기·상태 ENDED)는 **무조건** 먼저 끝낸다. 서버가 안 받아도
   *    마이크는 꺼야 한다.
   * ⚠️ 그 뒤 종료 알림(MEET-08) 결과를 돌려준다 — 부르는 쪽이 이 값을 보고 **목록으로
   *    보낼지 말지**를 정한다. 실패했는데 "요약 중입니다"라고 말하면, 서버는 회의가 끝난 줄도
   *    모르는데 사람은 다 끝난 줄 안다(§정직성).
   */
  end(): Promise<{ ok: boolean; error?: string }>;
  /**
   * 새로고침·크래시로 잃은 진행 중 캡처(CAP-09) — 없으면 `null`.
   *
   * ⚠️ **이 훅이 화면 흐름을 자동으로 바꾸지 않는다** — 값만 노출한다. 실제 안내(복구 카드·
   *    버튼 라벨)는 `capture-view`가 이 값과 `phase`를 보고 그린다. 훅에서 `phase`를 자동으로
   *    돌리면 사용자가 [녹음 시작]을 눌러 명시적으로 이어받는 흐름이 사라진다(§정직성).
   * ⚠️ 다른 회의 정보가 실려 올 수 있다 — 화면이 `String(meetingId) !== capture.meetingId`로
   *    거른 뒤 안내 문구를 정한다.
   */
  activeCapture: ActiveCapture | null;
  /**
   * 복구할 캡처의 서버 업로드 상태(CAP-08) — **같은 회의의 진행 캡처가 있을 때만** 채워진다.
   *
   * ⚠️ 안내 전용 값이다 — 재개는 presign(CAP-04)이 서버 `lastSeq + 1`부터 이어 발급해서
   *    이 값 없이도 성립한다(`getPartsUploadStatusAction` 주석).
   */
  uploadStatus: PartsUploadStatus | null;
}

/** 1초마다 다시 그린다 — 경과 시간이 흘러야 녹음 중인 게 보인다 */
const TICK_MS = 1_000;

/**
 * 모인 자막을 내보내는 주기.
 *
 * ⚠️ 2초다. 더 짧으면 배치의 뜻이 없고, 더 길면 참석자 화면에 자막이 늦게 뜬다 —
 *    이 값이 곧 **다른 사람이 내 말을 보기까지 걸리는 시간**이다.
 */
const CAPTION_FLUSH_MS = 2_000;

/**
 * 음량계를 못 만들었을 때 실어 보낼 값(dBFS).
 *
 * ⚠️ `null`을 보내면 BE가 422로 튕겨 **자막이 통째로 안 남는다.** 못 잰 것과 무음은
 *    다르지만, 둘 중에는 자막을 남기는 쪽이 낫다 — 화자 판정만 못 하고 글은 남는다.
 */
const SILENT_RMS_DBFS = -100;

export function useCapture(meetingId: string, initialSeq = 0): UseCaptureResult {
  const [phase, setPhase] = useState<CapturePhase>(CAPTURE_PHASE.BEFORE_START);
  const [spans, setSpans] = useState<RecordingSpan[]>([]);
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [partial, setPartial] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  /*
    ⚠️ **CAP-09 결과 — 새로고침·크래시 복구용**(2026-08-16 신규).
       마운트 시 한 번만 부른다(진행 중 캡처의 정본은 서버라 폴링 불필요). 결과는 값으로만
       노출하고 흐름은 화면이 정한다 — 훅이 자동으로 phase를 바꾸면 사용자의 [녹음 시작]
       클릭이 사라져 이어받기 의사표시가 없어진다(§정직성).
  */
  const [activeCapture, setActiveCapture] = useState<ActiveCapture | null>(null);
  /** CAP-08 — 같은 회의 복구일 때만 채워지는 업로드 상태(안내 전용, 아래 복구 효과 참조) */
  const [uploadStatus, setUploadStatus] = useState<PartsUploadStatus | null>(null);

  /*
    ⚠️ 지원 여부는 **첫 렌더에 한 번만** 본다(`useState` 지연 초기화). 캡처 화면은
       `next/dynamic(ssr:false)`로만 들어와서 서버 렌더가 아예 없다 — 그래서 렌더 중에
       `window`를 물어도 하이드레이션이 어긋날 자리가 없다.
    ⚠️ 효과 안에서 `setState`로 채우지 않는다. 첫 그림이 "지원함"으로 한 번 그려졌다가
       바로 다시 그려져, 미지원 브라우저에서 안내가 깜빡인다.
  */
  const [support] = useState<CaptureSupport>(() => ({
    stt: isSttSupported(),
    recording: isRecordingSupported(),
  }));

  /* 콜백이 최신 구간을 읽을 창구 — 상태를 의존성에 걸면 STT가 문장마다 재시작된다 */
  const spansRef = useRef<RecordingSpan[]>([]);
  useEffect(() => {
    spansRef.current = spans;
  }, [spans]);

  const sttRef = useRef<SttEngine | null>(null);
  const recorderRef = useRef<CaptureRecorder | null>(null);
  const uploaderRef = useRef<SliceUploader | null>(null);
  /** 이미 닫은 세그먼트 수 — 같은 경계에서 두 번 닫지 않으려고 든다 */
  const closedRef = useRef(0);

  const levelRef = useRef<LevelMeter | null>(null);

  /**
   * 아직 서버로 못 보낸 자막 — **배치로 모아서** 보낸다(CAP-11).
   *
   * ⚠️ 문장마다 한 번씩 부르지 않는다. 말이 빠른 회의는 초당 여러 문장이 확정되는데,
   *    낱개로 보내면 왕복이 그만큼 늘고 순서가 뒤집힌다. BE도 배치 API로 만들어 뒀다.
   * ⚠️ **실패하면 큐에 되돌려 놓는다.** 같은 `seq`가 다시 와도 BE가 조용히 건너뛰므로
   *    재전송이 안전하다 — 조용히 버리면 그 문장은 영영 없다(§정직성).
   */
  const pendingRef = useRef<CaptionChunkInput[]>([]);
  const sendingRef = useRef(false);
  /**
   * (회의, 사람)마다 0부터 이어 붙는 순번 — BE 중복 판정의 키다.
   *
   * ⚠️ **회의 단위 카운터다. 화면 세션 단위가 아니다.** 처음엔 `start()`마다 0으로 되돌렸는데,
   *    새로고침하고 다시 녹음하면 앞서 저장된 번호와 정면으로 겹쳤다 — BE는 같은
   *    `(회의, 사람, seq)`를 **조용히 건너뛰므로**(멱등) 이후 발화가 통째로 저장되지 않고
   *    프론트는 성공으로 표시했다. 서버에 이미 있는 내 자막의 다음 번호에서 이어 간다.
   */
  const seqRef = useRef(initialSeq);

  const flushCaptions = useCallback(async () => {
    if (sendingRef.current || pendingRef.current.length === 0) return;
    sendingRef.current = true;
    const batch = pendingRef.current;
    pendingRef.current = [];
    /*
      ⚠️ **`finally`로 잠금을 반드시 푼다.** Server Action 호출은 액션 안의 `try`와 별개로
         **전송 자체가 거부될 수 있다**(네트워크 끊김·직렬화 실패). 그때 잠금이 `true`로
         남으면 이후 모든 전송이 조용히 no-op이 되어 **회의 내내 자막이 한 줄도 안 나간다.**
      ⚠️ 거부된 배치도 큐로 되돌린다 — 같은 `seq`는 BE가 건너뛰므로 재전송이 안전하다.
    */
    try {
      const result = await submitCaptionsAction(Number(meetingId), batch);
      if (!result.ok) {
        /* 보낸 순서를 지켜 되돌린다 — 뒤에 쌓인 것보다 앞이다 */
        pendingRef.current = [...batch, ...pendingRef.current];
      }
    } catch {
      pendingRef.current = [...batch, ...pendingRef.current];
    } finally {
      sendingRef.current = false;
    }
  }, [meetingId]);

  /**
   * **끝까지 비운다** — 일시정지·종료·화면 이탈에서 쓴다.
   *
   * ⚠️ `flushCaptions`는 이미 보내는 중이면 **아무것도 안 하고 즉시 끝난다.** 그대로
   *    종료를 부르면 그 사이 쌓인 큐가 안 나간다.
   * ⚠️ 종료 뒤에는 2초 인터벌이 멈춰 **재전송할 주체가 없다** — 여기서 몇 번 더 시도한다.
   *    그래도 남으면 조용히 버리지 않고 화면에 남긴다(§정직성).
   */
  const drainCaptions = useCallback(async () => {
    for (let i = 0; i < 50 && sendingRef.current; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    for (let i = 0; i < 3 && pendingRef.current.length > 0; i += 1) {
      await flushCaptions();
    }
    if (pendingRef.current.length > 0) {
      setError("자막 일부를 서버에 보내지 못했습니다.");
    }
  }, [flushCaptions]);

  /* 2초마다 모인 것을 내보낸다 — 녹음 중일 때만 돈다 */
  useEffect(() => {
    if (!isCapturing(phase)) return;
    const timer = window.setInterval(() => void flushCaptions(), CAPTION_FLUSH_MS);
    return () => window.clearInterval(timer);
  }, [phase, flushCaptions]);

  const recordedMs = recordedMsOf(spans, now);

  /* 녹음 중일 때만 시계를 돌린다 — 멈춘 화면에서 1초마다 리렌더할 이유가 없다 */
  useEffect(() => {
    if (!isCapturing(phase)) return;
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, [phase]);

  /*
    10분(실제 녹음)이 찰 때마다 세그먼트를 닫는다.
    ⚠️ 벽시계가 아니라 `recordedMs` 기준이다 — 일시정지가 길어도 빈 파일이 안 생긴다.
  */
  useEffect(() => {
    if (!isCapturing(phase)) return;
    const closed = closedSegmentCountOf(recordedMs);
    if (closed <= closedRef.current) return;
    closedRef.current = closed;
    recorderRef.current?.rotate(closed);
  }, [phase, recordedMs]);

  /**
   * 지금 말하는 중인 문장이 **시작된** 시각(녹음 기준 ms). 아직 없으면 `null`.
   *
   * ⚠️ 확정된 순간을 찍으면 **말이 끝난 시각**이 된다. 10초에 시작해 2초 동안 말한 문장이
   *    `00:12`로 남는데, 팀이 정한 건 "10초에 안녕하세요라고 하면 `00:10`"이다 —
   *    문장을 **감지한 시점**이 기준이다.
   */
  const utteranceStartRef = useRef<number | null>(null);

  /** 녹음 시작 기준 지금까지의 경과(ms) — 일시정지는 빠진다 */
  const elapsedNow = useCallback(() => recordedMsOf(spansRef.current, Date.now()), []);

  /*
    말이 시작되는 순간을 잡아 둔다 — 중간 결과가 처음 뜨는 때다.
    ⚠️ 이미 잡아 뒀으면 덮어쓰지 않는다. 한 문장이 이어지는 동안 중간 결과는 여러 번 온다.
  */
  const markPartial = useCallback(
    (text: string) => {
      /*
        ⚠️ **빈 문자열로 오면 시작 시각도 지운다.** 중간 결과는 확정 없이 사라지는 길이 여럿이다
           — 일시정지(`stt.stop()`), 세션이 조용해서 스스로 닫히는 경우. 그때 지우지 않으면
           그 문장의 시작 ms가 남아 **다음 문장이 앞 문장의 시각을 물려받는다**:
           00:20에 말하다 멈추고 5분 쉰 뒤 한 말이 `00:20`으로 찍힌다.
           시각을 "감지한 시점"으로 맞추려던 것이 오히려 정반대가 된다.
      */
      const previousStart = utteranceStartRef.current;
      utteranceStartRef.current = nextUtteranceStart(previousStart, text, elapsedNow());
      /*
        ⚠️ **말이 시작되는 순간 음량 창을 연다.** 전에는 문장이 확정될 때 열었는데, 그러면
           다음 문장의 구간이 **직전 문장이 끝난 시각부터** 시작해 그 사이 침묵이 통째로
           평균에 섞였다 — 조용한 사람으로 잘못 잡힌다. `rms`는 화자 판정의 유일한 근거다.
      */
      if (previousStart === null && utteranceStartRef.current !== null) {
        levelRef.current?.mark();
      }
      setPartial(text);
    },
    [elapsedNow],
  );

  /*
    ⚠️ 자막 시각은 **녹음 시작 기준 경과 시간**이다(팀 확정). 벽시계(`10:04`)로 찍으면 나중에
       기록을 볼 때 녹음의 어느 지점인지 알 수 없다.
    ⚠️ 일시정지 구간은 빠진다. 위 타이머·10분 세그먼트와 **같은 시계**를 쓴다 — 자막만 다른
       기준으로 세면 나중에 오디오와 자막이 어긋난다.
    ⚠️ 구간을 `spansRef`로 읽는다. `spans` 상태를 의존성에 넣으면 문장이 쌓일 때마다 STT
       엔진에 새 콜백이 물려 재시작이 걸린다.
  */
  const pushChunk = useCallback(
    (text: string) => {
      // 중간 결과 없이 바로 확정되는 짧은 말은 잡아 둔 게 없다 — 그때는 지금이 곧 시작이다
      const startedAt = utteranceStartRef.current ?? elapsedNow();
      utteranceStartRef.current = null;

      const endedAt = elapsedNow();
      const at = formatRecordedTime(startedAt);
      setChunks((prev) => [
        ...prev,
        // 같은 문장이 반복돼도 키가 겹치지 않게 순번을 쓴다
        { id: `chunk-${prev.length}-${Date.now()}`, at, atMs: startedAt, text },
      ]);

      /*
        ⚠️ **오프셋은 실제 녹음 누적 시간(`recordedMs`)이다** — 벽시계가 아니다.
           일시정지하면 오디오 파일도 그만큼 이어 붙으므로(pause/resume은 파일을 안 쪼갠다,
           §3-3), 자막도 같은 시계를 써야 나중에 정본과 시간창이 맞는다. 벽시계로 찍으면
           쉰 시간만큼 자막이 뒤로 밀려 화자가 엉뚱한 문장에 붙는다.
        ⚠️ `rms`는 **빼먹으면 422다.** 화자 판정의 유일한 근거라 BE가 NOT NULL로 잡았다.
           음량계가 없는 브라우저에서는 무음값이라도 실어 보낸다 — 자막까지 잃을 수는 없다.
      */
      pendingRef.current.push({
        seq: seqRef.current,
        startMs: Math.round(startedAt),
        endMs: Math.round(endedAt),
        text,
        rms: levelRef.current?.read() ?? SILENT_RMS_DBFS,
      });
      seqRef.current += 1;
    },
    [elapsedNow],
  );

  /*
    ⚠️ **화면 이탈 전용이다.** 정리 함수는 동기라 `recorder.stop()`의 마지막 조각을
       기다릴 수 없다 — 여기서는 마이크 표시등을 최대한 빨리 끄는 게 우선이고, 놓치는
       마지막 조각은 감수한다. `end()`는 이 함수를 안 쓰고 따로 순서를 지켜 기다린다
       (아래 참고, CodeRabbit 지적 2026-08-16).
  */
  const teardown = useCallback(() => {
    sttRef.current?.stop();
    sttRef.current = null;
    /* ⚠️ 음량계를 녹음기보다 **먼저** 놓는다 — 스트림이 닫힌 뒤 읽으면 예외가 난다 */
    levelRef.current?.close();
    levelRef.current = null;
    void recorderRef.current?.stop();
    recorderRef.current = null;
    uploaderRef.current = null;
  }, []);

  /**
   * 이미 화면을 떠났는가.
   * ⚠️ `recorderRef`를 먼저 채우는 것만으로는 부족하다 — 정리가 먼저 돌면 그 ref를 비우지만
   *    `getUserMedia`는 그 뒤에 성공해서 **주인 없는 마이크**가 열린 채 남는다.
   */
  const unmountedRef = useRef(false);

  /*
    ⚠️ 정리 효과가 최신 전송 함수를 볼 수 있게 ref로 들고 간다 — 의존성에 직접 넣으면
       자막이 쌓일 때마다 **마이크 정리 효과가 다시 돌아** 녹음이 끊긴다.
  */
  const flushRef = useRef(flushCaptions);
  useEffect(() => {
    flushRef.current = flushCaptions;
  }, [flushCaptions]);

  /* 화면을 떠나면 마이크를 반드시 끈다 — 안 끄면 표시등이 계속 켜져 있다 */
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      /*
        ⚠️ **떠나기 전에 남은 자막을 한 번 더 쏜다.** 전송 주기가 2초라 그 사이에 확정된
           문장이 그대로 사라졌다 — 사이드바로 잠깐 옮겼다 돌아와도 복구되지 않는다.
        ⚠️ 결과를 기다릴 수 없다(정리 함수는 동기다). 못 가면 못 가는 것이고, 같은 `seq`는
           BE가 건너뛰므로 다시 보내도 안전하다.
      */
      void flushRef.current();
      teardown();
    };
  }, [teardown]);

  const enter = useCallback(() => setPhase(CAPTURE_PHASE.READY), []);

  /*
    ⚠️ **CAP-09 새로고침·크래시 복구 조회**(2026-08-16 신규).
       마운트 시 한 번만 부른다 — 이 값의 정본은 서버라 폴링이 필요 없고, 캡처 화면은
       `next/dynamic(ssr:false)`로만 들어오므로 이 효과는 항상 브라우저에서 돈다.
    ⚠️ `alive` 플래그로 언마운트 경합을 막는다 — 응답이 늦게 오면 언마운트된 뒤 setState가
       된다.
    ⚠️ 실패는 조용히 무시한다 — 복구 안내가 없더라도 캡처 화면의 나머지 흐름은 돌아야 한다.
       (오류 배너를 여기서 띄우면 진짜 캡처 오류와 섞여 시끄러워진다.)
  */
  useEffect(() => {
    let alive = true;
    void getActiveCaptureAction().then((result) => {
      if (!alive) return;
      if (!result.ok || !result.data) return;
      setActiveCapture(result.data);
      /*
        ⚠️ **CAP-08은 같은 회의일 때만 이어 부른다**(2026-08-19). BE가 "현재 녹음자"만
           허용하는 조회라, 다른 회의 안내(그쪽 세션은 그대로라는 문구)에는 쓸 일도 권한도
           없다. 실패는 CAP-09와 같은 이유로 조용히 넘긴다 — 안내가 조금 얇아질 뿐,
           복구 흐름 자체는 presign이 이어 발급해서 성립한다.
      */
      if (String(result.data.meetingId) !== meetingId) return;
      void getPartsUploadStatusAction(result.data.meetingId).then((status) => {
        if (!alive) return;
        if (status.ok && status.data) setUploadStatus(status.data);
      });
    });
    return () => {
      alive = false;
    };
  }, [meetingId]);

  /*
    ⚠️ **마이크가 열린 뒤에 "녹음 중"으로 넘어간다.** 먼저 넘어가 두면 권한이 막힌 브라우저에서
       배지는 `녹음 중`, 타이머는 도는데 담기는 건 아무것도 없다 — 화면이 거짓말을 한다
       (§정직성). 실패하면 `READY`에 머물고 이유만 남긴다.
    ⚠️ STT는 CAP-01이 **성공한 뒤에** 켠다(2026-08-16 정정). 전에는 CAP-01 실패도 "녹음은
       계속한다"고 삼켰는데, 그러면 서버는 이 회의를 여전히 `SCHEDULED`로 알고 있어
       [회의 종료 및 제출]이 항상 `MT-013`으로 거절된다 — 그 시점의 유일한 복구
       버튼([다시 시도])도 종료(MEET-08)만 다시 부르고 입장(CAP-01)은 재시도하지 않아
       **영영 못 끝나는 막다른 길**이 됐다. 서버가 이 회의를 모르는 채로 로컬만 도는
       녹음을 아예 시작하지 않는 게 맞다.
  */
  const start = useCallback(async () => {
    setError(null);

    const recorder = createCaptureRecorder({
      /*
        ⚠️ **`uploaderRef`가 아직 없을 수 있다.** CAP-01이 성공하기 전까지는 `null`이라
           조각을 조용히 버린다 — 마이크가 15초를 채우는 것보다 CAP-01 왕복이 훨씬 빨라
           실제로는 거의 안 일어나지만, 혹시 그 사이에 조각이 와도 없는 업로더에 넣지
           않는다(아래에서 CAP-01이 실패하면 마이크 자체를 닫는다).
        ⚠️ **세그먼트가 닫혀도(10분 경계) BE에 따로 알리지 않는다.** BE는 조각 개수로
           스스로 10분어치를 끊어 붙인다(`SttBlockCutTrigger`, "10분/40청크") — FE의
           `rotate()`는 `MediaRecorder` 헤더를 새로 여는 로컬 사정일 뿐, 같은 시간
           기준(`recordedMs`)을 쓰므로 경계가 자연히 맞아떨어진다.
      */
      onSlice: (blob) => uploaderRef.current?.enqueue(blob),
      onSegmentClosed: () => {},
      onFatal: setError,
    });

    if (!recorder) {
      setError("이 브라우저에서는 녹음을 시작할 수 없습니다.");
      return;
    }

    /*
      ⚠️ **기다리기 전에 붙들어 둔다.** `getUserMedia`가 응답하는 동안 화면을 떠나면 정리
         효과가 `null`을 보고 아무것도 안 멈춘다 — 그 뒤에 마이크가 열려 표시등이 계속 켜진다.
    */
    recorderRef.current = recorder;

    const opened = await recorder.start();
    if (!opened) {
      recorderRef.current = null;
      return; // 이유는 `onFatal`이 이미 남겼다
    }

    /* 기다리는 사이에 떠났으면 방금 연 마이크를 바로 닫는다 */
    if (unmountedRef.current) {
      void recorder.stop();
      recorderRef.current = null;
      return;
    }

    /*
      CAP-01 — 오디오는 안 보내고 **상태만** 알린다(§3-3). 서버가 이걸 알아야 참석자 STT
      트리거·새로고침 복구·녹음자 점유가 가능하다.
      ⚠️ **여기서 거절되면 마이크를 도로 닫고 아무것도 시작하지 않는다.** 서버가 이
         회의를 `SCHEDULED`로 알고 있는 채로 STT·타이머만 로컬에서 돌면, 나중에 종료를
         눌러도 서버가 "시작되지 않은 회의"라며 영원히 거절한다(위 주석 참고) — 마이크만
         켜진 회의보다 아예 시작이 안 된 쪽이 사용자가 다시 시도할 수 있어 낫다.
    */
    try {
      const session = await startCaptureSessionAction(Number(meetingId));
      if (!session.ok) {
        void recorder.stop();
        recorderRef.current = null;
        setError(session.error ?? "녹음 시작을 서버에 알리지 못했습니다.");
        return;
      }
    } catch {
      void recorder.stop();
      recorderRef.current = null;
      setError("서버에 연결하지 못했습니다. 다시 시도해 주세요.");
      return;
    }

    /* CAP-01 응답을 기다리는 사이에 떠났으면 방금 연 마이크를 바로 닫는다 */
    if (unmountedRef.current) {
      void recorder.stop();
      recorderRef.current = null;
      return;
    }

    /*
      ⚠️ **CAP-01 성공 뒤에 만든다.** `onSlice`가 이 값을 읽는 시점(15초 뒤)엔 이미 있어야
         하고, 위에서 실패하면 여기까지 안 온다 — `null`인 채로 조각을 흘려도 조용히
         버려질 뿐 잘못된 회의로 잘못 올라가는 일은 없다.
    */
    uploaderRef.current = createSliceUploader(Number(meetingId), { onFailure: setError });

    utteranceStartRef.current = null;
    const stt = createSttEngine({
      onChunk: pushChunk,
      onPartial: markPartial,
      onFatal: setError,
    });
    stt?.start();
    sttRef.current = stt;

    /*
      ⚠️ 음량계는 **녹음기와 같은 스트림**을 문다(`recorder.stream`). 자막의 `rms`가
         여기서 나오고, 그 값이 화자 판정의 유일한 근거다.
      ⚠️ 못 만들어도 녹음을 막지 않는다 — 자막은 무음값으로 나간다.
    */
    levelRef.current = recorder.stream ? createLevelMeter(recorder.stream) : null;
    levelRef.current?.mark();

    pendingRef.current = [];

    const at = Date.now();
    setNow(at);
    setSpans((prev) => [...prev, { from: at, to: null }]);
    setPhase(CAPTURE_PHASE.RECORDING);
  }, [pushChunk, markPartial, meetingId]);

  const pause = useCallback(() => {
    sttRef.current?.stop();
    // ⚠️ `stt.stop()`이 `onPartial("")`로 이미 비우지만, STT가 없는 경우(미지원·이미 죽음)엔
    //    그 경로가 안 돈다 — 여기서 한 번 더 확실히 끊는다.
    utteranceStartRef.current = null;
    recorderRef.current?.pause();
    /*
      CAP-02 — ⚠️ BE 주석대로 **모인 자막을 먼저 내보낸 뒤** 일시정지를 알린다.
      먼저 알리면 서버가 그 구간을 닫아 버려 뒤늦게 올라온 것이 갈 곳을 잃는다.
    */
    void drainCaptions()
      .then(() => pauseCaptureSessionAction(Number(meetingId)))
      /* ⚠️ 조용히 삼키지 않는다 — 서버가 모르면 새로고침 복구·이어받기가 어긋난다 */
      .then((result) => {
        if (!result.ok) setError(result.error ?? "일시정지를 서버에 알리지 못했습니다.");
      })
      /* ⚠️ 전송 자체가 거부돼도 말은 남긴다 — 조용하면 서버가 아는 줄로 착각한다 */
      .catch(() => setError("서버에 연결하지 못했습니다. 일시정지를 알리지 못했습니다."));
    const at = Date.now();
    setSpans((prev) => prev.map((span) => (span.to === null ? { ...span, to: at } : span)));
    setNow(at);
    setPhase(CAPTURE_PHASE.PAUSED);
  }, [drainCaptions, meetingId]);

  const resume = useCallback(() => {
    sttRef.current?.start();
    recorderRef.current?.resume();
    /* ⚠️ 쉬는 동안 마이크가 조용했으니 음량 창을 새로 연다 — 안 그러면 첫 문장이 무음으로 잡힌다 */
    levelRef.current?.mark();
    void resumeCaptureSessionAction(Number(meetingId))
      .then((result) => {
        if (!result.ok) setError(result.error ?? "재개를 서버에 알리지 못했습니다.");
      })
      .catch(() => setError("서버에 연결하지 못했습니다. 재개를 알리지 못했습니다."));
    const at = Date.now();
    setNow(at);
    setSpans((prev) => [...prev, { from: at, to: null }]);
    setPhase(CAPTURE_PHASE.RECORDING);
  }, [meetingId]);

  const end = useCallback(async () => {
    /*
      ⚠️ **`teardown()`을 안 쓴다**(CodeRabbit 지적, 2026-08-16 — 종료 순서를 직렬화하라).
         `teardown()`은 화면 이탈용이라 `recorder.stop()`을 기다리지 않는데, 여기서 그러면
         `.stop()` 뒤에 비동기로 오는 **마지막 15초 조각**이 이미 비운 `uploaderRef`를 보고
         조용히 사라진다. 짧은 회의는 그 마지막 조각이 유일한 오디오일 수도 있다.
      ⚠️ **오디오를 먼저 다 올린 뒤에만 종료를 알린다.** 전에는 업로드 큐와 종료 알림을
         `Promise.all`로 나란히 돌렸는데, 그러면 서버가 아직 안 받은 조각이 남은 채로
         회의가 DONE 처리될 수 있다 — 뒤이은 STT 블록 조립이 그 구간을 놓친다.
    */
    sttRef.current?.stop();
    sttRef.current = null;
    /* ⚠️ 음량계를 녹음기보다 **먼저** 놓는다 — 스트림이 닫힌 뒤 읽으면 예외가 난다 */
    levelRef.current?.close();
    levelRef.current = null;

    const uploader = uploaderRef.current;
    try {
      /*
        ⚠️ **여기서 기다린다.** `recorder.stop()`이 반환하는 프라미스는 마지막
           `dataavailable`(→`onSlice`→`uploader.enqueue`)까지 다 받은 뒤에야 풀린다 —
           그 전에 `uploaderRef`를 비우면 방금 잡힌 마지막 조각이 갈 곳을 잃는다.
      */
      await recorderRef.current?.stop();
    } catch {
      /* 로컬 정리 실패는 사용자가 할 수 있는 일이 없다 — 알림을 계속 보내는 게 더 중요하다 */
    }
    recorderRef.current = null;
    uploaderRef.current = null;

    const at = Date.now();
    /*
      ⚠️ **열려 있는 구간만 닫는다.** 무조건 마지막 구간의 `to`를 덮어쓰면, 일시정지해 둔
         상태에서 종료할 때 이미 닫힌 구간이 다시 열려 **쉬던 시간까지 녹음 시간에 들어간다** —
         10분 세그먼트 경계도 같이 밀린다.
    */
    setSpans((prev) => prev.map((span) => (span.to === null ? { ...span, to: at } : span)));
    setNow(at);
    setPhase(CAPTURE_PHASE.ENDED);

    /*
      MEET-08 — 오디오·자막을 마저 보내고서야 종료를 알린다.
      ⚠️ **AI 분석을 프론트가 부르지 않는다**(§3-3 4번). 서버가 종료 처리 안에서 큐에 걸고
         실패해도 재시도한다 — 사용자가 창을 닫아도 안전하다.
      ⚠️ 되돌릴 수 없다. 확인 창을 거친 뒤에만 여기로 온다(§3-3 종료 정책).
      ⚠️ **결과를 삼키지 않고 돌려준다**(2026-08-12, 적대적 리뷰). 전에는 `void`로 흘려보내
         실패해도 화면이 "요약 중입니다"라고 말하고 목록으로 떠났다 — 서버는 이 회의가 끝난
         줄 모르니 요약도 액션 분배도 영영 안 돈다. 부르는 쪽이 보고 판단하게 한다.
      ⚠️ 전송 자체가 거부되는 경우(브라우저→Next 단절)도 여기서 받는다.
    */
    try {
      /*
        ⚠️ **오디오 큐가 다 끝난 뒤에만 완료를 알린다**(순서 있음, `Promise.all` 아니다).
           `uploader.flush()` 자체는 개별 조각 실패까지 막지 않는다(연속 실패는
           `onFailure`로 이미 화면에 알렸다) — 여기서는 "큐가 비었는가"만 기다린다.
      */
      await (uploader?.flush() ?? Promise.resolve());

      const result = await drainCaptions().then(() => completeMeetingAction(Number(meetingId)));
      if (result.ok) return { ok: true };

      const message = result.error ?? CAPTURE_FAILURE_MESSAGE.MEETING_END;
      setError(message);
      return { ok: false, error: message };
    } catch {
      const message = CAPTURE_FAILURE_MESSAGE.MEETING_END;
      setError(message);
      return { ok: false, error: message };
    }
  }, [drainCaptions, meetingId]);

  return {
    phase,
    support,
    recordedMs,
    chunks,
    partial,
    error,
    enter,
    start,
    pause,
    resume,
    end,
    activeCapture,
    uploadStatus,
  };
}
