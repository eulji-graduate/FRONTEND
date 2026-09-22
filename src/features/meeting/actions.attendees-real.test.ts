jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/mocks/config", () => ({ isMock: false }));
jest.mock("@/features/auth/session", () => ({ requireAccessToken: jest.fn() }));
jest.mock("@/features/shell/viewer", () => ({ getViewer: jest.fn() }));
jest.mock("@/features/member/manage-server", () => ({ getManagedMember: jest.fn() }));
jest.mock("@/features/rooms/server", () => ({ getReservableMembers: jest.fn() }));
jest.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  serverApi: jest.fn(),
}));

import { AUTHORITY } from "@/constants/authority";
import { getManagedMember } from "@/features/member/manage-server";
import { getReservableMembers } from "@/features/rooms/server";
import { getViewer } from "@/features/shell/viewer";
import { ApiError, serverApi } from "@/lib/api";

import { updateMeetingAttendeesAction } from "./actions";

/**
 * 참석자 명단 교체(MEET-09) — **실서버 참석자 재검증**.
 *
 * ⚠️ 기존 `actions.test.ts`는 파일 전체가 `isMock: true`라 이 분기(2026-08-13, `GET
 *    /api/meetings/{id}` 조회 + `GET /api/members/my-team` 로스터 검증)는 그쪽에서
 *    한 번도 실행되지 않는다 — 별도 파일로 잠근다.
 */

const getViewerMock = getViewer as unknown as jest.Mock;
const getManagedMemberMock = getManagedMember as unknown as jest.Mock;
const getReservableMembersMock = getReservableMembers as unknown as jest.Mock;
const serverApiMock = serverApi as unknown as jest.Mock;

const HOST_LEADER = { id: 2, role: AUTHORITY.LEADER, teamName: "개발팀" };

function meetingDetail(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    meetingId: 100,
    title: "스프린트 회의",
    status: "SCHEDULED",
    startAt: "2026-08-14T10:00:00",
    endAt: "2026-08-14T10:30:00",
    pendingActionCount: 0,
    summaryStatus: null,
    project: { projectId: 1, tag: "GOODS" },
    meetingRoom: { meetingRoomId: 1, name: "소회의실 B" },
    host: { memberId: HOST_LEADER.id, name: "김서준" },
    attendees: [],
    recordingConsent: false,
    ...overrides,
  };
}

function form(meetingId: number, attendeeIds: number[]): FormData {
  const data = new FormData();
  data.append("meetingId", String(meetingId));
  for (const id of attendeeIds) data.append("attendeeIds", String(id));
  return data;
}

const INITIAL = { error: null, attendeeIds: null } as const;

beforeEach(() => {
  jest.clearAllMocks();
  getReservableMembersMock.mockResolvedValue([
    { id: 3, name: "박도현", teamName: "개발팀", authority: AUTHORITY.MEMBER },
  ]);
});

describe("updateMeetingAttendeesAction — 실서버, host 자신이 고치는 보통 경로", () => {
  beforeEach(() => {
    getViewerMock.mockResolvedValue(HOST_LEADER);
  });

  it("명부 안의 id만 제출하면 PUT까지 간다", async () => {
    serverApiMock.mockResolvedValueOnce(meetingDetail()).mockResolvedValueOnce({
      meetingId: 100,
      attendees: [{ memberId: 3, name: "박도현", teamName: "개발팀" }],
    });

    const result = await updateMeetingAttendeesAction(INITIAL, form(100, [3]));

    expect(result.error).toBeNull();
    expect(result.attendeeIds).toEqual([3]);
    expect(serverApiMock).toHaveBeenCalledTimes(2);
    // host 정보를 이미 세션에서 아니까 getManagedMember는 안 부른다.
    expect(getManagedMemberMock).not.toHaveBeenCalled();
  });

  /*
    ⚠️ 회귀 테스트다(2026-08-15, #558 — `rooms/actions.ts`의 `getMeetingRooms()`와 같은
       사고). `getReservableMembers`에 try/catch가 없어서 BE가 흔들리면 이 액션 전체가
       예외를 던져 페이지가 500으로 죽었다.
  */
  it("참석자 명부 조회가 실패해도 페이지를 죽이지 않고 오류로 돌려준다", async () => {
    serverApiMock.mockResolvedValueOnce(meetingDetail());
    getReservableMembersMock.mockRejectedValue(new Error("network down"));

    const result = await updateMeetingAttendeesAction(INITIAL, form(100, [3]));

    expect(result.error).toBeDefined();
    expect(result.attendeeIds).toBeNull();
  });

  it("명부 밖 id가 섞이면 PUT을 부르지 않고 막는다", async () => {
    serverApiMock.mockResolvedValueOnce(meetingDetail());

    const result = await updateMeetingAttendeesAction(INITIAL, form(100, [3, 999]));

    expect(result.error).toBe("지정할 수 없는 참석자가 있습니다");
    expect(result.attendeeIds).toBeNull();
    expect(serverApiMock).toHaveBeenCalledTimes(1); // GET 회의 상세만, PUT은 없음
  });

  it("끝난 회의는 명부를 볼 것도 없이 막는다", async () => {
    serverApiMock.mockResolvedValueOnce(meetingDetail({ status: "DONE" }));

    const result = await updateMeetingAttendeesAction(INITIAL, form(100, [3]));

    expect(result.error).toBe("끝난 회의는 참석자를 바꿀 수 없습니다");
    expect(getReservableMembersMock).not.toHaveBeenCalled();
  });

  it("없는 회의는 404를 그런 회의가 없다는 말로 바꾼다", async () => {
    serverApiMock.mockRejectedValueOnce(new ApiError(404, "not found"));

    const result = await updateMeetingAttendeesAction(INITIAL, form(999, [3]));

    expect(result.error).toBe("회의를 찾을 수 없습니다");
  });
});

describe("updateMeetingAttendeesAction — 실서버, OWNER·ADMIN이 남의 회의를 고치는 드문 경로", () => {
  beforeEach(() => {
    getViewerMock.mockResolvedValue({ id: 1, role: AUTHORITY.OWNER });
  });

  it("host가 OWNER면 회사 전체 팀장 명부로 검증한다(호출자 무관, 안전한 축)", async () => {
    serverApiMock
      .mockResolvedValueOnce(meetingDetail({ host: { memberId: 9, name: "대표" } }))
      .mockResolvedValueOnce({ meetingId: 100, attendees: [] });
    getManagedMemberMock.mockResolvedValue({
      member: { id: 9, authority: AUTHORITY.OWNER, teamName: null },
    });

    const result = await updateMeetingAttendeesAction(INITIAL, form(100, [3]));

    expect(getManagedMemberMock).toHaveBeenCalledWith(9);
    expect(getReservableMembersMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 9, role: AUTHORITY.OWNER }),
    );
    expect(result.error).toBeNull();
  });

  /*
    ⚠️ **딱 한 칸** — host가 LEADER·MEMBER면 `GET /api/members/my-team`이 host가 아니라
       actor(호출자)의 팀을 돌려줘 범위를 잘못 잰다(§정직성, 본 척하지 않는다). 그래서 이
       축에서는 `getReservableMembers`를 부르지 않고 FE 검증을 건너뛴다 — BE가 최종 방어다.
  */
  it("host가 LEADER·MEMBER면 FE 검증을 건너뛰고 BE에 맡긴다(actor 팀으로 잘못 재는 것 방지)", async () => {
    serverApiMock
      .mockResolvedValueOnce(meetingDetail())
      .mockResolvedValueOnce({ meetingId: 100, attendees: [] });
    getManagedMemberMock.mockResolvedValue({
      member: { id: HOST_LEADER.id, authority: AUTHORITY.LEADER, teamName: "개발팀" },
    });

    const result = await updateMeetingAttendeesAction(INITIAL, form(100, [3]));

    expect(getManagedMemberMock).toHaveBeenCalledWith(HOST_LEADER.id);
    expect(getReservableMembersMock).not.toHaveBeenCalled();
    expect(result.error).toBeNull();
    expect(serverApiMock).toHaveBeenCalledTimes(2);
  });

  it("host 정보를 못 구하면 FE 검증을 건너뛰고 BE에 맡긴다", async () => {
    serverApiMock
      .mockResolvedValueOnce(meetingDetail())
      .mockResolvedValueOnce({ meetingId: 100, attendees: [] });
    getManagedMemberMock.mockResolvedValue(null);

    const result = await updateMeetingAttendeesAction(INITIAL, form(100, [3]));

    expect(getReservableMembersMock).not.toHaveBeenCalled();
    expect(result.error).toBeNull();
    expect(serverApiMock).toHaveBeenCalledTimes(2);
  });

  /* ⚠️ 회귀 테스트다(2026-08-15, #558) — getManagedMember도 같은 사고를 겪을 수 있었다. */
  it("host 정보 조회가 실패해도 페이지를 죽이지 않고 오류로 돌려준다", async () => {
    serverApiMock.mockResolvedValueOnce(meetingDetail({ host: { memberId: 9, name: "대표" } }));
    getManagedMemberMock.mockRejectedValue(new Error("network down"));

    const result = await updateMeetingAttendeesAction(INITIAL, form(100, [3]));

    expect(result.error).toBeDefined();
    expect(result.attendeeIds).toBeNull();
  });
});
