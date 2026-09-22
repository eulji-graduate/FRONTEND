import { type BeStalledSummaryMeeting, toRetrySummaryResult, toStalledSummaryInfo } from "./mapper";

/** MEET-15 응답 원소 그대로 — 필드 이름을 BE 실코드에 맞춰 둔다 */
const BASE: BeStalledSummaryMeeting = {
  meetingId: 30,
  title: "9월 스프린트 리뷰",
  isStalled: true,
};

describe("toStalledSummaryInfo", () => {
  it("id를 문자열로 바꾸고 화면이 쓰는 필드만 남긴다", () => {
    expect(toStalledSummaryInfo(BASE)).toEqual({
      meetingId: "30",
      meetingTitle: "9월 스프린트 리뷰",
      isStalled: true,
    });
  });

  it("isStalled가 false면 그대로 옮긴다 — 문구는 화면(StalledSummaryList)이 가른다", () => {
    expect(toStalledSummaryInfo({ ...BASE, isStalled: false }).isStalled).toBe(false);
  });
});

/**
 * ANLZ-02는 **200으로도 실패가 온다**(큐가 없어 요청 스레드에서 그대로 돈다) —
 * `status`를 안 보고 성공으로 접으면 요약이 없는데 생겼다고 말하게 된다.
 */
describe("toRetrySummaryResult", () => {
  it("DONE이면 요약이 채워진 것이다", () => {
    expect(toRetrySummaryResult({ status: "DONE", message: null })).toEqual({
      outcome: "resumed",
      message: "다시 분석했습니다",
    });
  });

  /* ⚠️ 중복 방어가 동작한 것이라 오류가 아니다 — 기다리면 결과가 나온다 */
  it("ALREADY_RUNNING은 실패가 아니라 '아직'이다", () => {
    expect(
      toRetrySummaryResult({ status: "ALREADY_RUNNING", message: "이미 분석이 진행 중입니다." }),
    ).toEqual({ outcome: "running", message: "이미 분석이 진행 중입니다." });
  });

  it("SUPERSEDED도 다른 실행이 그 일을 하고 있다는 뜻이다", () => {
    expect(toRetrySummaryResult({ status: "SUPERSEDED", message: null }).outcome).toBe("running");
  });

  it("FAILED는 BE 문장을 그대로 들고 온다 — 문구를 새로 짓지 않는다", () => {
    expect(
      toRetrySummaryResult({ status: "FAILED", message: "분석 계층 호출에 실패했습니다." }),
    ).toEqual({ outcome: "failedAgain", message: "분석 계층 호출에 실패했습니다." });
  });

  /* ⚠️ 돌릴 대상이 없어 아예 안 부른 것도 "요약이 없다"는 사실은 같다 */
  it("SKIPPED를 성공으로 접지 않는다", () => {
    expect(toRetrySummaryResult({ status: "SKIPPED", message: "발화가 없습니다." })).toEqual({
      outcome: "failedAgain",
      message: "발화가 없습니다.",
    });
  });

  /* ⚠️ BE가 값을 늘렸을 때 조용히 "됐습니다"라고 말하는 쪽이 훨씬 나쁘다 */
  it("모르는 status는 성공으로 접지 않는다", () => {
    expect(toRetrySummaryResult({ status: "QUEUED", message: null }).outcome).toBe("failedAgain");
  });

  it("message가 없으면 우리 문구로 대신한다", () => {
    expect(toRetrySummaryResult({ status: "FAILED", message: null }).message).toBe(
      "다시 분석했지만 또 멈췄습니다",
    );
  });
});
