import { AI_SUMMARY_STATUS, MEETING_STATUS } from "@/constants/meeting";

import {
  canEditMeeting,
  canEditMeetingAttendees,
  meetingCardAffordanceOf,
  meetingStatusOf,
} from "./status";

/** 상태가 틀리면 "완료 카드만 상세 진입" 규칙(WORKFLOW §3-2)이 통째로 틀린다 */
describe("meetingStatusOf", () => {
  const start = new Date("2026-08-11T13:00:00");

  it("시작 전이면 예정이다", () => {
    expect(
      meetingStatusOf({ start, endedAt: null, canceledAt: null }, new Date("2026-08-11T12:59:00")),
    ).toBe(MEETING_STATUS.SCHEDULED);
  });

  it("시작 시각부터는 진행중이다", () => {
    expect(
      meetingStatusOf({ start, endedAt: null, canceledAt: null }, new Date("2026-08-11T13:00:00")),
    ).toBe(MEETING_STATUS.IN_PROGRESS);
  });

  /*
    ⚠️ 예약한 30분이 지나도 완료가 아니다 — 회의가 길어진 것일 수 있다. 시간으로 완료를
       만들면 스크립트도 산출물도 없는 회의가 "완료 카드"로 열린다.
  */
  it("끝나는 시각이 지나도 종료를 안 눌렀으면 진행중이다", () => {
    expect(
      meetingStatusOf({ start, endedAt: null, canceledAt: null }, new Date("2026-08-11T18:00:00")),
    ).toBe(MEETING_STATUS.IN_PROGRESS);
  });

  it("종료를 눌렀으면 시각과 무관하게 완료다", () => {
    expect(
      meetingStatusOf(
        { start, endedAt: "2026-08-11T13:28:00.000Z", canceledAt: null },
        new Date("2026-08-11T13:10:00"),
      ),
    ).toBe(MEETING_STATUS.DONE);
  });

  it("취소됐으면 시작 전이었어도 취소다 — 종료보다 먼저 본다", () => {
    expect(
      meetingStatusOf(
        { start, endedAt: null, canceledAt: "2026-08-11T12:00:00.000Z" },
        new Date("2026-08-11T12:59:00"),
      ),
    ).toBe(MEETING_STATUS.CANCELED);
  });
});

describe("meetingCardAffordanceOf", () => {
  const base = { status: MEETING_STATUS.DONE, isHost: true } as const;

  it("예정·진행중은 분석 값과 무관하게 live다", () => {
    expect(
      meetingCardAffordanceOf({ ...base, status: MEETING_STATUS.SCHEDULED, aiSummaryStatus: null }),
    ).toBe("live");
    expect(
      meetingCardAffordanceOf({
        ...base,
        status: MEETING_STATUS.IN_PROGRESS,
        aiSummaryStatus: null,
      }),
    ).toBe("live");
  });

  it("검토 대기는 Host에게만 검토 자리를 준다", () => {
    expect(meetingCardAffordanceOf({ ...base, aiSummaryStatus: AI_SUMMARY_STATUS.REVIEWED })).toBe(
      "review",
    );
    expect(
      meetingCardAffordanceOf({
        ...base,
        isHost: false,
        aiSummaryStatus: AI_SUMMARY_STATUS.REVIEWED,
      }),
    ).toBe("open");
  });

  it("요약이 어디까지 왔든 목록 카드는 열린다 — 그 이야기는 상세가 한다", () => {
    for (const status of [
      AI_SUMMARY_STATUS.PENDING,
      AI_SUMMARY_STATUS.SUMMARIZING,
      AI_SUMMARY_STATUS.FAILED,
    ]) {
      expect(meetingCardAffordanceOf({ ...base, aiSummaryStatus: status })).toBe("open");
    }
  });

  it("분배까지 끝나야 회의록이 열린다", () => {
    expect(
      meetingCardAffordanceOf({ ...base, aiSummaryStatus: AI_SUMMARY_STATUS.DISTRIBUTED }),
    ).toBe("open");
  });

  it("분석 값이 빈 옛 완료 회의는 막지 않는다", () => {
    expect(meetingCardAffordanceOf({ ...base, aiSummaryStatus: null })).toBe("open");
  });

  it("취소된 회의는 host라도 live가 아니라 open이다 — [녹음하기]를 안 띄운다", () => {
    expect(
      meetingCardAffordanceOf({ ...base, status: MEETING_STATUS.CANCELED, aiSummaryStatus: null }),
    ).toBe("open");
  });
});

/**
 * 수정 관문이 느슨하면 BE가 409 `MT-014`로 되돌리는 자리에 버튼이 뜬다(§정직성).
 * ⚠️ `pendingReason`이 상태를 대신한다 — `"SCHEDULED"`만 아직 시작 전이라는 뜻이다(§view-types).
 */
describe("canEditMeeting", () => {
  it("host의 시작 전 회의만 고칠 수 있다", () => {
    expect(canEditMeeting({ isHost: true, pendingReason: "SCHEDULED" })).toBe(true);
  });

  it("참석자는 시작 전이어도 못 고친다 — 조작은 Host의 일이다", () => {
    expect(canEditMeeting({ isHost: false, pendingReason: "SCHEDULED" })).toBe(false);
  });

  /* ⚠️ 진행중·요약중·실패·취소·완료(null)는 전부 BE가 409로 막는 자리다 */
  it("시작한 뒤로는 host라도 못 고친다", () => {
    for (const reason of ["IN_PROGRESS", "SUMMARIZING", "FAILED", "CANCELED", null] as const) {
      expect(canEditMeeting({ isHost: true, pendingReason: reason })).toBe(false);
    }
  });

  /* ⚠️ 참석자 교체(MEET-09)는 진행중도 되지만 수정(MEET-05)은 아니다 — 관문이 다르다 */
  it("참석자 교체보다 좁다 — 진행중 회의에서 갈린다", () => {
    const inProgress = { isHost: true, pendingReason: "IN_PROGRESS" } as const;
    expect(canEditMeetingAttendees(inProgress)).toBe(true);
    expect(canEditMeeting(inProgress)).toBe(false);
  });
});
