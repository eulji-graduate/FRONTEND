// 서버 액션은 next 런타임 함수를 부른다 — jsdom엔 없으니 목으로 대체하고 호출만 검증한다.
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
// 이 파일만 실서버 분기를 본다(`actions.online-real.test.ts`와 같은 패턴).
jest.mock("@/mocks/config", () => ({ isMock: false }));
jest.mock("@/features/auth/session", () => ({ requireAccessToken: jest.fn() }));
jest.mock("@/lib/mock-actor", () => ({ getMockActor: jest.fn(() => ({ id: 1, role: "OWNER" })) }));
jest.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    code?: string;
    constructor(status: number, message: string, code?: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
  serverApi: jest.fn(),
}));

import { requireAccessToken } from "@/features/auth/session";
import { ApiError, serverApi } from "@/lib/api";

import { updateMeetingScheduleAction } from "./actions";

const requireAccessTokenMock = requireAccessToken as unknown as jest.Mock;
const serverApiMock = serverApi as unknown as jest.Mock;

const VALID_FORM = () => {
  const data = new FormData();
  data.append("meetingId", "42");
  data.append("title", "스프린트 계획 수정");
  data.append("roomId", "3");
  data.append("date", "2026-08-20");
  data.append("startTime", "10:00");
  data.append("projectId", "1");
  data.append("recordingConsent", "on");
  return data;
};

const INITIAL = { errors: {}, saved: null } as const;

/**
 * 회의 시간·회의실·프로젝트·녹음 동의 수정(MEET-05, #436) — 실서버 분기.
 * ⚠️ 제목만 고치는 `updateMeetingAction`은 `actions.ts`에 이미 실서버 테스트가 없다(응답을
 *    안 읽는 얇은 PATCH라 mock 분기 테스트로 충분히 커버된다) — 이 액션은 필드가 여섯 개라
 *    보내는 JSON 모양과 코드별 필드 매핑을 실제로 검증할 값이 있다.
 */
describe("회의 시간·회의실·프로젝트·녹음 동의 수정(#436) — 실서버 분기(!isMock)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAccessTokenMock.mockResolvedValue("token");
  });

  it("성공하면 6필드를 그대로 PATCH로 보내고 응답을 안 읽는다(revalidatePath로 다시 읽는다)", async () => {
    serverApiMock.mockResolvedValue({
      meetingId: 42,
      status: "SCHEDULED",
      startAt: "2026-08-20T10:00:00",
      endAt: "2026-08-20T10:30:00",
      meetingRoom: { meetingRoomId: 3, name: "소회의실 B" },
    });

    const result = await updateMeetingScheduleAction(INITIAL, VALID_FORM());

    expect(result.errors).toEqual({});
    expect(result.saved).toEqual({ title: "스프린트 계획 수정" });

    const [url, init] = serverApiMock.mock.calls[0];
    expect(url).toBe("/api/meetings/42");
    expect(init.method).toBe("PATCH");
    expect(init.json).toEqual({
      title: "스프린트 계획 수정",
      projectId: 1,
      meetingRoomId: 3,
      startAt: "2026-08-20T10:00:00",
      endAt: "2026-08-20T10:30:00",
      recordingConsent: true,
    });
  });

  it("녹음 동의 체크를 안 하면 false로 보낸다", async () => {
    serverApiMock.mockResolvedValue({});
    const data = VALID_FORM();
    data.delete("recordingConsent");

    await updateMeetingScheduleAction(INITIAL, data);

    const [, init] = serverApiMock.mock.calls[0];
    expect(init.json.recordingConsent).toBe(false);
  });

  it("형식이 어긋난 폼은 BE 호출보다 먼저 막힌다", async () => {
    const data = VALID_FORM();
    data.set("startTime", "10:15");

    const result = await updateMeetingScheduleAction(INITIAL, data);

    expect(result.errors.startTime).toBe("수정은 30분 단위로만 가능합니다");
    expect(serverApiMock).not.toHaveBeenCalled();
  });

  it("MT-002는 roomId 칸 오류로 바뀐다(중복 예약)", async () => {
    serverApiMock.mockRejectedValue(new ApiError(409, "중복 예약", "MT-002"));

    const result = await updateMeetingScheduleAction(INITIAL, VALID_FORM());

    expect(result.errors.roomId).toBe("그 시간에는 이미 예약된 회의실입니다");
  });

  it("MT-005는 startTime 칸 오류로 바뀐다(30분 그리드)", async () => {
    serverApiMock.mockRejectedValue(new ApiError(400, "그리드 오류", "MT-005"));

    const result = await updateMeetingScheduleAction(INITIAL, VALID_FORM());

    expect(result.errors.startTime).toBe("수정은 30분 단위로만 가능합니다");
  });

  it("MT-012는 startTime 칸 오류로 바뀐다(과거 시각)", async () => {
    serverApiMock.mockRejectedValue(new ApiError(400, "과거 시각", "MT-012"));

    const result = await updateMeetingScheduleAction(INITIAL, VALID_FORM());

    expect(result.errors.startTime).toBe("지난 시간은 선택할 수 없습니다");
  });

  it("PJ-001은 projectId 칸 오류로 바뀐다", async () => {
    serverApiMock.mockRejectedValue(new ApiError(404, "존재하지 않는 프로젝트", "PJ-001"));

    const result = await updateMeetingScheduleAction(INITIAL, VALID_FORM());

    expect(result.errors.projectId).toBe("존재하지 않는 프로젝트입니다");
  });

  it("MT-014(이미 시작된 회의)는 슬롯 없는 오류라 title 칸으로 떨어진다", async () => {
    serverApiMock.mockRejectedValue(
      new ApiError(409, "이미 시작된 회의는 수정할 수 없습니다", "MT-014"),
    );

    const result = await updateMeetingScheduleAction(INITIAL, VALID_FORM());

    expect(result.errors.title).toBe("이미 시작된 회의는 수정할 수 없습니다");
  });
});
