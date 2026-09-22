/**
 * 캡처 화면의 **단계와 시간 셈**(WORKFLOW §3-3).
 *
 * 브라우저 API를 안 부르는 순수 로직만 둔다 — 마이크·STT는 옆의 `stt.ts`·`recorder.ts`가
 * 맡는다. 여기가 순수해야 `jsdom` 없이 시간 경계(10분·일시정지)를 테스트할 수 있다.
 */

/**
 * Host가 밟는 다섯 자리.
 *
 * ⚠️ `constants/meeting.ts`의 `CAPTURE_STATUS`와 **다른 것**이다. 그건 서버가 아는 세션
 *    상태(IDLE·RECORDING·SUBMITTING·DONE)이고, 이건 **화면이 지금 무엇을 그리는가**다 —
 *    `BEFORE_START`와 `READY`는 서버가 보기엔 똑같이 IDLE이지만 화면은 전혀 다르다.
 */
export const CAPTURE_PHASE = {
  /**
   * 아직 준비 화면이다 — 가운데 한 장에 [준비 완료] 하나뿐인 화면.
   * ⚠️ 전에는 `BEFORE_ENTER`("입장")였다(2026-08-11 개명). 이 화면은 서버를 안 부르는
   *    **브라우저·마이크 안내**일 뿐인데 "입장"이라 부르니 회의에 들어가는 별도 단계처럼
   *    읽혔다 — 회의가 실제로 시작되는 자리는 [녹음 시작] 하나뿐이다(팀 워크플로우 2단계).
   */
  BEFORE_START: "BEFORE_START",
  /** 준비를 마쳤고 아직 녹음 전 */
  READY: "READY",
  RECORDING: "RECORDING",
  PAUSED: "PAUSED",
  /** [회의 종료 및 제출]을 눌렀다 — 되돌아올 수 없다 */
  ENDED: "ENDED",
} as const;
export type CapturePhase = (typeof CAPTURE_PHASE)[keyof typeof CAPTURE_PHASE];

/**
 * 실제 녹음이 도는 중인가 — 마이크·STT를 켜 둘지 이걸로 판단한다.
 * ⚠️ 부르는 쪽이 `phase === "RECORDING"`을 직접 쓰지 않게 한다. 나중에 도는 자리가
 *    늘면(예: 재연결 중) 조건이 화면마다 갈린다.
 */
export function isCapturing(phase: CapturePhase): boolean {
  return phase === CAPTURE_PHASE.RECORDING;
}

/** 자막·참가자 같은 **작업 화면**을 그리는 단계인가 — 준비 화면과 종료 후는 아니다 */
export function showsWorkspace(phase: CapturePhase): boolean {
  return (
    phase === CAPTURE_PHASE.READY ||
    phase === CAPTURE_PHASE.RECORDING ||
    phase === CAPTURE_PHASE.PAUSED
  );
}

/**
 * [회의 종료 및 제출]을 누를 수 있는가.
 *
 * ⚠️ **녹음을 한 번은 시작해야 열린다**(§3-3). 아무것도 안 녹음하고 종료하면 스크립트도
 *    파일도 없는 회의가 "완료"로 굳는데, 종료는 되돌릴 수 없어서 회의를 새로 열어야 한다.
 */
export function canSubmit(phase: CapturePhase): boolean {
  return phase === CAPTURE_PHASE.RECORDING || phase === CAPTURE_PHASE.PAUSED;
}

/**
 * 녹음 구간 하나 — 열려 있으면 `to`가 `null`이다.
 * ⚠️ 시각은 **epoch ms**로 든다. `Date` 객체를 상태에 담으면 리렌더마다 새 참조가 되어
 *    `useEffect` 의존성이 매번 바뀐다.
 */
export interface RecordingSpan {
  from: number;
  to: number | null;
}

/**
 * **실제 녹음 누적 시간**(ms) — 일시정지 구간은 빼고 센다(§3-3).
 *
 * ⚠️ 10분 세그먼트도 벽시계가 아니라 이 값으로 끊는다. 벽시계로 끊으면 30분 일시정지한
 *    회의가 아무 소리도 안 든 10분짜리 파일을 세 개 만든다.
 * ⚠️ `now`를 인자로 받는다 — 안에서 `Date.now()`를 부르면 테스트가 시각을 못 잡는다.
 */
export function recordedMsOf(spans: readonly RecordingSpan[], now: number): number {
  return spans.reduce((total, span) => total + Math.max(0, (span.to ?? now) - span.from), 0);
}

/** 세그먼트 하나의 길이 — 10분마다 완결 파일 하나(§3-3) */
export const SEGMENT_MS = 10 * 60 * 1000;

/**
 * 지금까지 **닫힌** 세그먼트 수. 실제 녹음 10분을 채울 때마다 하나씩 는다.
 *
 * ⚠️ **정확히 10분이 되는 순간 하나가 닫힌다**(`floor(600000/600000) = 1`). 9분 59초까지는
 *    0이다 — 경계를 `ceil`이나 `round`로 세면 9분 30초에 이미 닫힌 것으로 봐서, 서버가
 *    아직 안 온 조각까지 포함된 파일을 확정한다.
 */
export function closedSegmentCountOf(recordedMs: number): number {
  return Math.floor(recordedMs / SEGMENT_MS);
}

/**
 * `12:34` · 한 시간을 넘기면 `1:02:03`.
 *
 * ⚠️ 분·초는 **두 자리로 채운다**. `1:2:3`은 읽는 사람이 한 번 더 해석해야 한다.
 * ⚠️ 시간은 안 채운다 — `01:02:03`은 앞자리가 뭘 뜻하는지 헷갈린다.
 */
export function formatRecordedTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * 다음 **발화 시작 시각** — 자막 한 줄에 찍히는 값이다.
 *
 * 자막 시각은 문장이 확정된 순간(= 말이 **끝난** 시각)이 아니라 **감지한 시점**이다(팀 확정).
 * 10초에 시작해 2초간 말하면 `00:10`이지 `00:12`가 아니다.
 *
 * ⚠️ **빈 문자열은 시작 시각을 지운다.** 중간 결과는 확정 없이 사라지는 길이 여럿이다 —
 *    일시정지, 세션이 조용해서 스스로 닫히는 경우, STT가 죽는 경우. 그때 안 지우면 그 문장의
 *    시작 ms가 남아 **다음 문장이 앞 문장의 시각을 물려받는다**(00:20에 말하다 멈추고 5분 쉰 뒤
 *    한 말이 `00:20`으로 찍힌다) — 고치려던 것이 정반대가 된다.
 * ⚠️ 이미 잡아 둔 값은 **덮어쓰지 않는다.** 한 문장이 여러 중간 결과로 자라는 동안 시작 시각은
 *    처음 그대로여야 한다.
 */
export function nextUtteranceStart(
  current: number | null,
  text: string,
  elapsedMs: number,
): number | null {
  if (!text) return null;
  return current ?? elapsedMs;
}
