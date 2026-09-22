import { PROCESSING_STATUS } from "@/constants/meeting";

import {
  advance,
  ANALYSIS_MAX_FAILURES,
  ANALYSIS_POLL_MAX_MS,
  expire,
  isExpired,
  isSettled,
  restart,
  restoreTracking,
  shouldPoll,
  startTracking,
  toAnalysisCardState,
} from "./analysis";
import { ANALYSIS_CARD_STATE, type AnalysisTracking } from "./types";

const NOW = 1_700_000_000_000;

/*
  ⚠️ id는 **목 모양(`meeting-7`)** 이다. 숫자로 들면 `Number("meeting-7")`이 `NaN`이 되어
     프로바이더의 회의 대조가 전부 빗나간다 — 숫자 id로만 테스트하면 그게 안 잡힌다.
*/
const MEETING_ID = "meeting-7";

function running(overrides: Partial<AnalysisTracking> = {}): AnalysisTracking {
  return { ...startTracking(MEETING_ID, "주간 회의", NOW), ...overrides };
}

describe("CAP-06 상태 → 카드 상태", () => {
  /*
    회의를 막 끝내면 계층 기록이 없어 NOT_STARTED가 온다. 완료로 접으면 요약이 없는데
    다 됐다고 말하게 되고, 실패로 접으면 멀쩡한 회의가 깨진 것으로 보인다.
  */
  it("아직 시작 전이어도 사람에게는 요약 중이다", () => {
    expect(toAnalysisCardState(PROCESSING_STATUS.NOT_STARTED)).toBe(ANALYSIS_CARD_STATE.RUNNING);
    expect(toAnalysisCardState(PROCESSING_STATUS.RUNNING)).toBe(ANALYSIS_CARD_STATE.RUNNING);
  });

  it("끝났거나 깨진 것은 그대로 옮긴다", () => {
    expect(toAnalysisCardState(PROCESSING_STATUS.DONE)).toBe(ANALYSIS_CARD_STATE.DONE);
    expect(toAnalysisCardState(PROCESSING_STATUS.FAILED)).toBe(ANALYSIS_CARD_STATE.FAILED);
  });

  it("요약 중일 때만 끝나지 않은 것으로 본다", () => {
    expect(isSettled(ANALYSIS_CARD_STATE.RUNNING)).toBe(false);
    expect(isSettled(ANALYSIS_CARD_STATE.DONE)).toBe(true);
    expect(isSettled(ANALYSIS_CARD_STATE.FAILED)).toBe(true);
    expect(isSettled(ANALYSIS_CARD_STATE.UNAVAILABLE)).toBe(true);
  });
});

describe("카드 상태 기계", () => {
  it("완료가 오면 스피너를 멈추고 완료로 바꾼다", () => {
    const next = advance(running(), { ok: true, status: PROCESSING_STATUS.DONE });
    expect(next.state).toBe(ANALYSIS_CARD_STATE.DONE);
    expect(next.attempt).toBe(1);
  });

  /* 늦게 도착한 응답이 이미 본 완료를 「요약 중」으로 되돌리면 안 된다 */
  it("끝난 카드는 다시 안 움직인다", () => {
    const done = running({ state: ANALYSIS_CARD_STATE.DONE });
    expect(advance(done, { ok: true, status: PROCESSING_STATUS.RUNNING })).toBe(done);
  });

  it("한두 번 실패는 계속 쫓고, 연속 세 번이면 확인 못 했다고 말한다", () => {
    let tracking = running();
    for (let i = 1; i < ANALYSIS_MAX_FAILURES; i += 1) {
      tracking = advance(tracking, { ok: false });
      expect(tracking.state).toBe(ANALYSIS_CARD_STATE.RUNNING);
      expect(tracking.failures).toBe(i);
    }
    tracking = advance(tracking, { ok: false });
    expect(tracking.state).toBe(ANALYSIS_CARD_STATE.UNAVAILABLE);
  });

  /* 드문드문 실패한 멀쩡한 회의가 「확인 못 함」으로 접히면 안 된다 */
  it("한 번이라도 성공하면 실패 횟수를 되돌린다", () => {
    const failedTwice = running({ failures: ANALYSIS_MAX_FAILURES - 1 });
    const recovered = advance(failedTwice, { ok: true, status: PROCESSING_STATUS.RUNNING });
    expect(recovered.failures).toBe(0);
    expect(recovered.state).toBe(ANALYSIS_CARD_STATE.RUNNING);
  });

  it("[다시 시도]는 시계와 실패 횟수를 처음으로 되돌린다", () => {
    const dead = running({ state: ANALYSIS_CARD_STATE.UNAVAILABLE, failures: 5, attempt: 12 });
    const again = restart(dead, NOW + 60_000);
    expect(again).toMatchObject({
      state: ANALYSIS_CARD_STATE.RUNNING,
      startedAt: NOW + 60_000,
      attempt: 0,
      failures: 0,
      meetingId: MEETING_ID,
    });
  });
});

describe("언제 물어보는가", () => {
  it("끝났거나 탭이 숨어 있으면 안 물어본다", () => {
    expect(shouldPoll(running(), NOW, false)).toBe(true);
    expect(shouldPoll(running(), NOW, true)).toBe(false);
    expect(shouldPoll(running({ state: ANALYSIS_CARD_STATE.DONE }), NOW, false)).toBe(false);
    expect(shouldPoll(null, NOW, false)).toBe(false);
  });

  /* 스피너를 영원히 돌리는 건 「요약 중」이라는 거짓말이다 */
  it("상한을 넘기면 그만 묻고 확인 못 했다고 접는다", () => {
    const old = running();
    const late = NOW + ANALYSIS_POLL_MAX_MS;
    expect(isExpired(old, late)).toBe(true);
    expect(shouldPoll(old, late, false)).toBe(false);
    expect(expire(old).state).toBe(ANALYSIS_CARD_STATE.UNAVAILABLE);
  });
});

describe("새로고침 뒤 되살리기", () => {
  it("저장해 둔 값을 그대로 돌려준다", () => {
    const saved = running({ attempt: 3 });
    expect(restoreTracking(JSON.stringify(saved))).toEqual(saved);
  });

  /*
    ⚠️ **회의 id는 저장과 비교를 견뎌야 한다.** 숫자로 들고 있던 시절에는 목 id가 `NaN`이라
       `JSON.stringify`가 `null`로 적어(새로고침하면 카드가 사라졌다) 되살리지도 못했고,
       `NaN === NaN`이 거짓이라 폴링 응답이 자기 카드를 못 찾아 「요약 중」에서 멈췄다.
  */
  it("목 회의 id(meeting-7)도 그대로 되살아나고 자기 자신과 같다", () => {
    const tracking = running();
    const restored = restoreTracking(JSON.stringify(tracking));
    expect(restored?.meetingId).toBe(MEETING_ID);
    expect(restored?.meetingId === tracking.meetingId).toBe(true);
  });

  /* 옛 버전이 남긴 값으로 카드가 이상한 상태에 갇히지 않게 한다 */
  it("없거나 깨졌거나 모양이 어긋나면 버린다", () => {
    expect(restoreTracking(null)).toBeNull();
    expect(restoreTracking("{")).toBeNull();
    expect(restoreTracking(JSON.stringify({ meetingId: 7, state: "WHATEVER" }))).toBeNull();
  });
});
