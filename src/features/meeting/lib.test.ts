import {
  checkMeetingTitle,
  formatMeetingSchedule,
  MEETING_TITLE_MAX_LENGTH,
  meetingListRange,
  validateMeetingEditDraft,
} from "./lib";
import type { MeetingEditDraft } from "./types";

describe("formatMeetingSchedule", () => {
  it("우리 날짜 표기와 시각 범위를 한 줄로 잇는다", () => {
    const start = new Date("2026-07-14T10:00:00+09:00");
    const end = new Date("2026-07-14T10:30:00+09:00");

    expect(formatMeetingSchedule(start, end)).toBe("7월 14일(화) 10:00 – 10:30");
  });

  /*
    ⚠️ `toISOString()`으로 조립했다면 여기서 틀린다 — 한국 아침 회의(00:00 UTC 이전)가
       전날 날짜로 적힌다.
  */
  it("한국 아침 회의가 전날로 밀리지 않는다", () => {
    const start = new Date("2026-08-14T08:00:00+09:00"); // UTC로는 13일 23:00
    const end = new Date("2026-08-14T08:30:00+09:00");

    expect(formatMeetingSchedule(start, end)).toBe("8월 14일(금) 08:00 – 08:30");
  });
});

describe("meetingListRange", () => {
  it("오늘을 가운데 두고 앞뒤로 3개월을 연다", () => {
    expect(meetingListRange(new Date("2026-08-13T10:00:00+09:00"))).toEqual({
      from: "2026-05-13",
      to: "2026-11-13",
    });
  });

  /*
    ⚠️ `setMonth`로 옮기면 여기서 틀린다 — 2월 31일이 3월 3일로 넘쳐 기간이 사흘 좁아진다.
       월말은 그 달의 마지막 날로 눌러 담아야 경계의 회의가 목록에서 안 빠진다.
  */
  it("월말이 다음 달로 넘치지 않는다", () => {
    expect(meetingListRange(new Date("2026-05-31T10:00:00+09:00"))).toEqual({
      from: "2026-02-28",
      to: "2026-08-31",
    });
  });

  it("+3개월이 12월 1일로 밀리지 않는다", () => {
    expect(meetingListRange(new Date("2026-08-31T10:00:00+09:00")).to).toBe("2026-11-30");
  });
});

/** 제목 계약이 어긋나면 화면이 통과시킨 값을 서버가 400으로 되돌린다(MEET-05) */
describe("checkMeetingTitle", () => {
  it("앞뒤 공백을 떼고 통과시킨다 — BE도 같은 자리를 자른다", () => {
    expect(checkMeetingTitle("  8월 스프린트 킥오프  ")).toEqual({
      ok: true,
      title: "8월 스프린트 킥오프",
    });
  });

  it("공백만 있는 제목은 막는다 — BE가 필수 컬럼을 지우는 요청으로 본다", () => {
    expect(checkMeetingTitle("   ")).toEqual({
      ok: false,
      error: "회의 제목을 입력해 주세요.",
    });
  });

  it("빈 문자열도 같은 이유로 막는다", () => {
    expect(checkMeetingTitle("").ok).toBe(false);
  });

  it("200자는 통과하고 201자는 막는다 — BE `@Size(max = 200)`과 같은 경계다", () => {
    expect(checkMeetingTitle("가".repeat(MEETING_TITLE_MAX_LENGTH)).ok).toBe(true);
    expect(checkMeetingTitle("가".repeat(MEETING_TITLE_MAX_LENGTH + 1))).toEqual({
      ok: false,
      error: "회의 제목은 200자까지 입력할 수 있습니다.",
    });
  });

  /* ⚠️ 자르고 나서 재야 한다 — 공백 포함 201자인데 실제 저장은 200자인 값을 막으면 안 된다 */
  it("공백을 뗀 뒤의 길이로 잰다", () => {
    expect(checkMeetingTitle(` ${"가".repeat(MEETING_TITLE_MAX_LENGTH)} `).ok).toBe(true);
  });
});

/** 회의 수정(MEET-05, #436) 폼 검증 — 회의실 예약 개설(`validateRoomReservationDraft`)과 같은 형식 규칙. */
describe("validateMeetingEditDraft", () => {
  function draft(overrides: Partial<MeetingEditDraft> = {}): MeetingEditDraft {
    return {
      title: "스프린트 계획",
      roomId: "room-large",
      date: "2026-08-20",
      startTime: "10:00",
      projectId: "1",
      recordingConsent: false,
      ...overrides,
    };
  }

  it("다 채우면 통과한다", () => {
    expect(validateMeetingEditDraft(draft())).toEqual({});
  });

  it("제목이 비면 checkMeetingTitle과 같은 문구로 막는다", () => {
    expect(validateMeetingEditDraft(draft({ title: "  " })).title).toBe(
      "회의 제목을 입력해 주세요.",
    );
  });

  it("회의실을 안 고르면 막는다", () => {
    expect(validateMeetingEditDraft(draft({ roomId: "" })).roomId).toBe("회의실을 선택해 주세요");
  });

  it("날짜가 비거나 형식이 어긋나면 막는다", () => {
    expect(validateMeetingEditDraft(draft({ date: "" })).date).toBe("날짜를 선택해 주세요");
    expect(validateMeetingEditDraft(draft({ date: "2026-13-40" })).date).toBe(
      "올바른 날짜가 아니에요",
    );
  });

  it("시작 시간이 30분 단위가 아니면 막는다", () => {
    expect(validateMeetingEditDraft(draft({ startTime: "" })).startTime).toBe(
      "시작 시간을 선택해 주세요",
    );
    expect(validateMeetingEditDraft(draft({ startTime: "10:15" })).startTime).toBe(
      "수정은 30분 단위로만 가능합니다",
    );
  });

  it("프로젝트를 안 고르면 막는다", () => {
    expect(validateMeetingEditDraft(draft({ projectId: "" })).projectId).toBe(
      "프로젝트를 선택해 주세요",
    );
  });
});
