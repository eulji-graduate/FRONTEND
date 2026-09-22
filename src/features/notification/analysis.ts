import { z } from "zod";

import { PROCESSING_STATUS, type ProcessingStatus } from "@/constants/meeting";

import { ANALYSIS_CARD_STATE, type AnalysisCardState, type AnalysisTracking } from "./types";

/**
 * 요약 진행 카드의 **상태 기계** — 순수 함수만 둔다(그래서 테스트가 있다).
 *
 * ⚠️ **여기가 소스 교체의 이음매다.** 지금 카드를 움직이는 건 CAP-06 폴링이지만, 이 파일은
 *    "무엇이 들어오면 카드가 어떻게 바뀌는가"만 안다 — 폴링이든 SSE든 `advance()`에 같은
 *    `ProcessingStatus`를 넣으면 된다. BE `NotificationType`에 분석 이벤트가 들어오면
 *    `event.ts`의 `toAnalysisSignal`이 그 값을 만들어 이 함수로 흘려보내고, **폴링만
 *    빠진다** — 카드·배너 렌더는 한 줄도 안 바뀐다.
 * ⚠️ **왜 폴링부터인가.** BE `NotificationType`은 지금 4종뿐이고 분석 완료·실패가 없다
 *    (2026-08-13 실코드 확인). SSE에만 걸면 카드가 「요약 중」에서 영영 안 바뀐다 —
 *    몇 초 만에 사라지는 지금 토스트보다 나쁘다(§정직성).
 */

/**
 * 폴링 간격.
 *
 * ⚠️ 요약은 분 단위로 걸린다(BE가 큐로 돌린다). 1~2초로 두면 회의 하나에 수백 번을
 *    두드리면서도 사람이 체감하는 건 똑같다 — 5초면 "누른 것 같지도 않은데 바뀌어 있다"에
 *    충분하다.
 */
export const ANALYSIS_POLL_INTERVAL_MS = 5_000;

/**
 * 쫓기를 포기하는 상한(10분).
 *
 * ⚠️ **끝없이 돌리지 않는다.** BE가 큐를 잃거나 상태를 안 바꾸면 스피너가 영원히 돈다 —
 *    그건 「요약 중」이라는 거짓말이다. 상한을 넘기면 `UNAVAILABLE`로 접고 사람에게
 *    [다시 시도]를 준다.
 */
export const ANALYSIS_POLL_MAX_MS = 10 * 60 * 1_000;

/**
 * 연속 실패 허용 횟수.
 * ⚠️ 한 번 실패는 흔하다(배포·네트워크 튐). 세 번 연속이면 그건 상태다 — 조용히 계속
 *    두드리지 않고 화면에 말한다.
 */
export const ANALYSIS_MAX_FAILURES = 3;

/**
 * CAP-06의 `status`를 카드 상태로 접는다.
 *
 * ⚠️ **`NOT_STARTED`는 `RUNNING`이다.** 회의를 막 끝냈으면 계층 기록이 아직 없어 이 값이
 *    온다(BE `ProcessingStatus.of` — layers가 비면 NOT_STARTED). 완료로 읽으면 요약이
 *    없는데 다 됐다고 말하게 되고, 실패로 읽으면 멀쩡한 회의를 깨진 것으로 만든다.
 */
export function toAnalysisCardState(status: ProcessingStatus): AnalysisCardState {
  switch (status) {
    case PROCESSING_STATUS.DONE:
      return ANALYSIS_CARD_STATE.DONE;
    case PROCESSING_STATUS.FAILED:
      return ANALYSIS_CARD_STATE.FAILED;
    case PROCESSING_STATUS.NOT_STARTED:
    case PROCESSING_STATUS.RUNNING:
      return ANALYSIS_CARD_STATE.RUNNING;
  }
}

/** 끝난 카드인가 — 끝났으면 더 두드리지 않는다. */
export function isSettled(state: AnalysisCardState): boolean {
  return state !== ANALYSIS_CARD_STATE.RUNNING;
}

/** 상한을 넘겼는가 — 넘겼으면 더 기다리는 척하지 않는다. */
export function isExpired(tracking: AnalysisTracking, now: number): boolean {
  return now - tracking.startedAt >= ANALYSIS_POLL_MAX_MS;
}

/** 상한을 넘긴 카드를 접는다 — 「요약 중」을 영원히 돌리지 않는다(§정직성). */
export function expire(tracking: AnalysisTracking): AnalysisTracking {
  return { ...tracking, state: ANALYSIS_CARD_STATE.UNAVAILABLE };
}

/**
 * 지금 한 번 더 물어봐야 하는가.
 *
 * ⚠️ **탭이 숨어 있으면 쉰다.** 안 보는 화면을 5초마다 두드릴 이유가 없다 — 돌아오면
 *    바로 한 번 물어보므로(훅의 `visibilitychange`) 사람이 잃는 건 없다.
 */
export function shouldPoll(
  tracking: AnalysisTracking | null,
  now: number,
  isDocumentHidden: boolean,
): boolean {
  if (!tracking) return false;
  if (isSettled(tracking.state)) return false;
  if (isDocumentHidden) return false;
  return !isExpired(tracking, now);
}

/** 한 번 물어본 결과 — 성공이면 BE가 준 상태가 실린다. */
export type AnalysisProbe = { ok: true; status: ProcessingStatus } | { ok: false };

/**
 * 결과 하나를 받아 카드를 다음 상태로 옮긴다.
 *
 * ⚠️ **끝난 카드는 안 움직인다.** 마지막 응답이 늦게 도착해 완료를 다시 「요약 중」으로
 *    되돌리는 일을 막는다 — 사람은 이미 완료를 봤다.
 * ⚠️ **성공하면 실패 횟수를 0으로 되돌린다.** 누적으로 세면 10분 동안 드문드문 실패한
 *    멀쩡한 회의가 「확인 못 함」으로 접힌다.
 */
export function advance(tracking: AnalysisTracking, probe: AnalysisProbe): AnalysisTracking {
  if (isSettled(tracking.state)) return tracking;

  const attempt = tracking.attempt + 1;

  if (!probe.ok) {
    const failures = tracking.failures + 1;
    return {
      ...tracking,
      attempt,
      failures,
      state:
        failures >= ANALYSIS_MAX_FAILURES
          ? ANALYSIS_CARD_STATE.UNAVAILABLE
          : ANALYSIS_CARD_STATE.RUNNING,
    };
  }

  return { ...tracking, attempt, failures: 0, state: toAnalysisCardState(probe.status) };
}

/** [다시 시도] — 시계와 실패 횟수를 처음으로 되돌린다(회의는 그대로). */
export function restart(tracking: AnalysisTracking, now: number): AnalysisTracking {
  return {
    ...tracking,
    state: ANALYSIS_CARD_STATE.RUNNING,
    startedAt: now,
    attempt: 0,
    failures: 0,
  };
}

/** 회의 하나를 새로 쫓기 시작한다(회의 종료 직후 캡처 화면이 부른다). */
export function startTracking(meetingId: string, title: string, now: number): AnalysisTracking {
  return {
    meetingId,
    title,
    state: ANALYSIS_CARD_STATE.RUNNING,
    startedAt: now,
    attempt: 0,
    failures: 0,
  };
}

/**
 * 새로고침을 건너뛰기 위해 저장해 둔 값을 되살린다.
 *
 * ⚠️ **왜 저장하나.** 카드가 있는 이유가 "화면을 옮겨 다녀도 진행이 따라온다"인데,
 *    새로고침 한 번에 사라지면 그 약속이 반만 지켜진다.
 * ⚠️ **`sessionStorage`다.** 탭을 닫으면 같이 사라져야 한다 — 어제 끝난 회의 카드가
 *    다음 날 아침에 떠 있으면 그건 알림이 아니라 쓰레기다. 토큰이 아니므로
 *    `localStorage` 금지 규칙(§렌더링·데이터)과는 다른 얘기다.
 * ⚠️ **모양이 어긋나면 버린다.** 옛 버전이 남긴 값으로 카드가 이상한 상태에 갇히지 않게
 *    `safeParse`로 본다(§zod).
 */
const trackingSchema = z.object({
  /* ⚠️ **문자열이다** — 숫자로 들면 목 id(`meeting-3`)가 `NaN`이 된다(`types.ts` 주석) */
  meetingId: z.string(),
  title: z.string(),
  state: z.enum([
    ANALYSIS_CARD_STATE.RUNNING,
    ANALYSIS_CARD_STATE.DONE,
    ANALYSIS_CARD_STATE.FAILED,
    ANALYSIS_CARD_STATE.UNAVAILABLE,
  ]),
  startedAt: z.number(),
  attempt: z.number(),
  failures: z.number(),
});

export function restoreTracking(raw: string | null): AnalysisTracking | null {
  if (!raw) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = trackingSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
