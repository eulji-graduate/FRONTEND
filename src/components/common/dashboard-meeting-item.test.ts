import { formatMeetingDate } from "./dashboard-meeting-item";

describe("formatMeetingDate", () => {
  it("월 일(요일) 시:분 형식으로 포맷한다", () => {
    expect(formatMeetingDate("2026-08-20T10:00:00")).toBe("8월 20일(목) 10:00");
  });

  it("한 자리 시·분도 두 자리로 채운다", () => {
    expect(formatMeetingDate("2026-09-01T09:05:00")).toBe("9월 1일(화) 09:05");
  });
});
