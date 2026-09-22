/**
 * 녹음 계층 — **여기 한 곳만 마이크와 `MediaRecorder`를 안다**(WORKFLOW §3-3).
 *
 * ⚠️ **`timeslice`로 10분을 쪼개지 않는다.** `timeslice` 조각은 헤더가 없어 독립 재생이
 *    안 된다 — 10분 완결 파일은 `stop → start`로 구간을 새로 여는 **세그먼트** 방식이다.
 * ⚠️ 거기에 더해 **15초 조각도 함께 흘려보낸다**(`start(15000)`). 크래시 때 유실을
 *    10분 → 15초로 줄이려는 절충이고, 서버가 세그먼트가 닫힐 때 조각들을 이어 붙여
 *    10분 완결 파일을 만든다(백엔드 확정).
 * ⚠️ **일시정지는 파일을 안 쪼갠다.** `pause/resume`은 하나의 연속 파일로 이어진다 —
 *    조용한 구간만 빠진다.
 * ⚠️ **MIME 타입을 고정한다**(`upload.ts`의 `RECORDING_CONTENT_TYPE`). BE presign이
 *    Content-Type을 서명에 실어서(`CapS3ObjectStorageAdapter`), 브라우저 기본값에
 *    맡기면 `;codecs=opus` 같은 접미사가 실제 녹음과 presign 요청 사이에서 어긋나
 *    S3가 서명 불일치로 PUT을 거절한다.
 */

import { RECORDING_CONTENT_TYPE } from "./upload";

export interface RecorderHandlers {
  /** 15초마다 나오는 조각 — 서버가 모아서 세그먼트를 만든다 */
  onSlice(blob: Blob): void;
  /** 10분(실제 녹음)이 차서 세그먼트가 닫혔다 — 서버가 그 구간을 확정한다 */
  onSegmentClosed(index: number): void;
  /** 마이크를 못 얻었다 — 화면이 안내를 띄운다 */
  onFatal(message: string): void;
}

export interface CaptureRecorder {
  /**
   * 마이크를 열고 첫 구간을 연다 — **열렸는지 돌려준다.**
   * ⚠️ `void`로 두면 부르는 쪽이 실패를 모른 채 "녹음 중"으로 넘어간다. 아무것도 안 담기는
   *    회의를 30분 진행하고 나서야 아는 일이 생긴다(§정직성).
   */
  start(): Promise<boolean>;
  pause(): void;
  resume(): void;
  /** 세그먼트를 닫고 다음 구간을 연다 — 10분 경계에서 부른다 */
  rotate(index: number): void;
  /**
   * 마이크를 끈다 — **마지막 조각까지 다 받은 뒤에 끝난다.**
   * ⚠️ `void`로 두면 부르는 쪽이 `stop()` 직후 곧바로 다음 일을 해서, 비동기로 뒤늦게
   *    오는 마지막 `dataavailable`(=마지막 15초 조각)이 갈 곳을 잃는다(§use-capture `end()`).
   */
  stop(): Promise<void>;
  /**
   * 열려 있는 마이크 스트림 — `start()`가 성공한 뒤에만 있다.
   *
   * ⚠️ 음량계(`level.ts`)가 **같은 스트림**을 물어야 한다. 따로 `getUserMedia`를 부르면
   *    마이크가 두 번 열려 장치 점유·표시등이 어긋나고, 무엇보다 **녹음과 다른 소리를
   *    재게 된다** — 그 값이 화자 판정의 근거라 어긋나면 엉뚱한 사람이 붙는다.
   */
  readonly stream: MediaStream | null;
}

/** 15초 조각(§3-3) */
export const SLICE_MS = 15_000;

/** 이 브라우저가 녹음을 하는가 */
export function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    navigator.mediaDevices?.getUserMedia !== undefined
  );
}

/**
 * 마이크를 열고 녹음기를 만든다.
 *
 * ⚠️ 스트림은 **한 번만 얻고 계속 쓴다.** 세그먼트마다 `getUserMedia`를 다시 부르면 구간
 *    사이에 권한 창이 다시 뜨거나 소리가 끊긴다.
 * ⚠️ 미지원 브라우저면 `null` — 조용히 되는 척하는 가짜 녹음기를 만들지 않는다(§정직성).
 */
export function createCaptureRecorder(handlers: RecorderHandlers): CaptureRecorder | null {
  if (!isRecordingSupported()) return null;

  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;

  const openSegment = () => {
    if (!stream) return;
    // ⚠️ 지원 여부는 `start()`가 이미 확인했다 — 여기 오는 시점엔 항상 지원된다.
    const instance = new MediaRecorder(stream, { mimeType: RECORDING_CONTENT_TYPE });
    instance.ondataavailable = (event) => {
      if (event.data.size > 0) handlers.onSlice(event.data);
    };
    recorder = instance;
    // 15초마다 조각이 떨어진다 — 세그먼트 자체는 stop/start로만 끊는다
    instance.start(SLICE_MS);
  };

  return {
    async start() {
      /*
        ⚠️ **지원 안 하면 아예 시작하지 않는다**(CodeRabbit 지적, 2026-08-16). presign
           요청·PUT 헤더가 항상 `RECORDING_CONTENT_TYPE` 고정이라, 브라우저가 다른 형식으로
           녹음하면 나중에 S3가 서명 불일치로 PUT을 거절한다 — 마이크만 켜진 채 업로드가
           전부 실패하는 것보다, 애초에 시작 안 하는 쪽이 낫다. Chrome 계열에서는 사실상
           항상 지원되는 형식이라 실사용에서 이 분기를 탈 일은 거의 없다.
      */
      if (!MediaRecorder.isTypeSupported(RECORDING_CONTENT_TYPE)) {
        handlers.onFatal("이 브라우저에서는 녹음 형식을 지원하지 않습니다.");
        return false;
      }

      try {
        /*
          ⚠️ **기본값에 맡기지 않는다.** 회의실 노트북 마이크는 에어컨·타자 소리를 그대로
             담는데, 이 파일이 곧 **정본 자막의 재료**다 — 회의 중 서버가 하는 일이
             받아쓰기와 적재이기 때문이다(§3-3). 화면의 실시간 자막보다 이쪽이 중요하다.
          ⚠️ 말소리는 단일 채널이면 충분하다. 스테레오로 담으면 파일만 두 배가 된다.
        */
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
      } catch {
        handlers.onFatal("마이크를 열지 못했습니다. 브라우저 권한을 확인해 주세요.");
        return false;
      }
      openSegment();
      return true;
    },
    pause() {
      if (recorder?.state === "recording") recorder.pause();
    },
    resume() {
      if (recorder?.state === "paused") recorder.resume();
    },
    rotate(index: number) {
      const closing = recorder;
      if (!closing) return;

      /*
        ⚠️ **닫혔다는 통보는 `onstop` 뒤에 보낸다.** `stop()` 직후에 바로 알리면, 그 구간의
           **마지막 조각이 통보보다 늦게** 도착한다 — 서버가 이미 이어 붙인 파일을 확정한
           뒤에 남은 조각이 와서 그 소리가 통째로 빠지거나 다음 구간에 붙는다.
        ⚠️ 다음 구간은 통보 뒤에 연다. 먼저 열면 새 조각과 옛 조각이 섞인다.
      */
      closing.onstop = () => {
        handlers.onSegmentClosed(index);
        openSegment();
      };
      closing.stop();
      recorder = null;
    },
    get stream() {
      return stream;
    },
    stop() {
      const closing = recorder;
      recorder = null;

      const closeStream = () => {
        // 마이크 표시등을 끈다 — 트랙을 안 멈추면 회의가 끝나도 계속 켜져 있다
        stream?.getTracks().forEach((track) => track.stop());
        stream = null;
      };

      /*
        ⚠️ **`onstop` 뒤에 끝난다.** `.stop()`을 부른 직후에도 마지막으로 잡힌 조각은
           `dataavailable`로 비동기 전달된 뒤에야 `onstop`이 온다 — 스트림을 그 전에 끊으면
           안전하지만(이미 버퍼링된 조각엔 영향 없다), **부르는 쪽이 "다 끝났다"고 알기엔
           너무 이르다.** `use-capture.ts`의 `end()`가 이 완료를 기다린 뒤에야 업로드 큐
           참조를 정리한다 — 그래야 이 마지막 조각의 `onSlice`가 살아있는 업로더를 본다.
      */
      return new Promise<void>((resolve) => {
        if (!closing || closing.state === "inactive") {
          closeStream();
          resolve();
          return;
        }
        closing.onstop = () => {
          closeStream();
          resolve();
        };
        closing.stop();
      });
    },
  };
}
