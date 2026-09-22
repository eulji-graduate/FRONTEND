// 서버 액션은 next 런타임 함수를 부른다 — jsdom엔 없으니 목으로 대체하고 호출만 검증한다.
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
// isMock은 NEXT_PUBLIC_USE_MOCK 환경변수로 정해진다 — 테스트가 환경에 휘둘리지 않게 고정한다.
jest.mock("@/mocks/config", () => ({ isMock: true }));
// 기본은 실제 getMockActor()와 같은 값(OWNER, Admin 아님) — 회의실 관리·상위 팀 액션 권한
// 테스트에서만 다른 역할·팀의 액터로 덮어쓴다.
jest.mock("@/lib/mock-actor", () => ({
  getMockActor: jest.fn(() => ({ id: 1, role: "OWNER" })),
}));

import { revalidatePath } from "next/cache";

import { listMockMeetings } from "@/features/meeting/mock/meetings";
import { getMockActor } from "@/lib/mock-actor";

import {
  createMeetingRoomAction,
  createRoomReservationAction,
  deleteMeetingRoomAction,
  updateMeetingRoomAction,
} from "./actions";
import { findMockRoom } from "./mock/rooms";

const revalidatePathMock = revalidatePath as unknown as jest.Mock;
const getMockActorMock = getMockActor as unknown as jest.Mock;

const VALID_ENTRIES: Record<string, string> = {
  title: "새 회의",
  roomId: "room-small-b",
  date: "2026-08-11",
  startTime: "13:00",
  projectId: "1", // TOP_LEVEL_PROJECTS의 GOODS(id=1) — 실존 프로젝트여야 통과한다
};

const DEFAULT_TOPICS = [{ main: "제품", sub: "로드맵 검토" }];

/*
  ⚠️ 기본 참석자를 **김서준(id=2, 개발팀 LEADER)** 으로 둔다(2026-08-13). 전에는 박대표(id=1,
     OWNER)였는데, 참석자 범위가 강제되면서 Owner 명단에 팀장 아닌 사람이 못 들어간다
     (`attendee-scope.ts`) — 기본 액터(OWNER)와 아래 LEADER(개발팀) 둘 다에서 통과하는 값이다.
*/
const form = (
  entries: Record<string, string>,
  attendeeIds: number[] = [2],
  topics: { main: string; sub: string }[] = DEFAULT_TOPICS,
) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  for (const id of attendeeIds) data.append("attendeeIds", String(id));
  for (const topic of topics) {
    data.append("topicMain", topic.main);
    data.append("topicSub", topic.sub);
  }
  return data;
};

beforeEach(() => {
  revalidatePathMock.mockClear();
  getMockActorMock.mockReturnValue({ id: 1, role: "OWNER" });
});

const roomForm = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
};

const VALID_ROOM_ENTRIES: Record<string, string> = {
  name: "신관 세미나실",
  location: "4층 C동",
};

describe("회의실 추가·수정", () => {
  it("Admin이 아니면 추가를 막는다(OWNER도 예외 없음)", async () => {
    const result = await createMeetingRoomAction({ errors: {} }, roomForm(VALID_ROOM_ENTRIES));

    expect(result.errors.name).toBe("회의실을 추가할 권한이 없습니다");
    expect(result.room).toBeUndefined();
  });

  it("Admin 겸직자면 추가할 수 있다", async () => {
    getMockActorMock.mockReturnValue({ id: 2, role: "MEMBER", isAdmin: true });

    const result = await createMeetingRoomAction({ errors: {} }, roomForm(VALID_ROOM_ENTRIES));

    expect(result.errors).toEqual({});
    expect(result.room?.name).toBe("신관 세미나실");
    expect(revalidatePathMock).toHaveBeenCalledWith("/manage/rooms");
  });

  it("Admin이어도 필수값이 비면 막는다", async () => {
    getMockActorMock.mockReturnValue({ id: 2, role: "MEMBER", isAdmin: true });

    const result = await createMeetingRoomAction(
      { errors: {} },
      roomForm({ ...VALID_ROOM_ENTRIES, name: "" }),
    );

    expect(result.errors.name).toBe("회의실 이름을 입력해 주세요");
  });

  it("Admin이 아니면 수정도 막는다", async () => {
    const result = await updateMeetingRoomAction(
      { errors: {} },
      roomForm({ ...VALID_ROOM_ENTRIES, id: "room-large" }),
    );

    expect(result.errors.name).toBe("회의실을 수정할 권한이 없습니다");
  });

  it("없는 id를 수정하려 하면 오류를 돌려준다", async () => {
    getMockActorMock.mockReturnValue({ id: 2, role: "MEMBER", isAdmin: true });

    const result = await updateMeetingRoomAction(
      { errors: {} },
      roomForm({ ...VALID_ROOM_ENTRIES, id: "존재하지-않음" }),
    );

    expect(result.errors.name).toBe("수정할 회의실을 찾을 수 없습니다");
  });
});

describe("회의실 삭제", () => {
  it("Admin이 아니면 삭제를 막는다(OWNER도 예외 없음)", async () => {
    getMockActorMock.mockReturnValue({ id: 1, role: "OWNER" });

    await expect(deleteMeetingRoomAction(roomForm({ id: "room-large" }))).rejects.toThrow(
      "회의실을 삭제할 권한이 없습니다",
    );
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("Admin 겸직자면 삭제할 수 있고, 목록에서 사라진다", async () => {
    getMockActorMock.mockReturnValue({ id: 2, role: "MEMBER", isAdmin: true });
    const created = await createMeetingRoomAction({ errors: {} }, roomForm(VALID_ROOM_ENTRIES));
    revalidatePathMock.mockClear();

    await deleteMeetingRoomAction(roomForm({ id: created.room!.id }));

    expect(findMockRoom(created.room!.id)).toBeNull();
    expect(revalidatePathMock).toHaveBeenCalledWith("/manage/rooms");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/rooms");
  });

  it("없는 id를 삭제해도 조용히 넘어간다(중복 삭제 요청 방어)", async () => {
    getMockActorMock.mockReturnValue({ id: 2, role: "MEMBER", isAdmin: true });

    await expect(
      deleteMeetingRoomAction(roomForm({ id: "존재하지-않음" })),
    ).resolves.toBeUndefined();
  });
});

describe("회의실 예약 생성 (Owner 개설 = 프로젝트 회의)", () => {
  it("필수값이 다 있으면 성공하고 생성값을 돌려준다 — 연결된 회의(Meeting)도 같이 만들어진다", async () => {
    const result = await createRoomReservationAction({ errors: {} }, form(VALID_ENTRIES));

    expect(result.errors).toEqual({});
    expect(result.created?.title).toBe("새 회의");
    expect(result.created?.roomName).toBe("소회의실 B");
    expect(result.created?.projectTag).toBe("GOODS");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/rooms");

    const meeting = listMockMeetings().find(
      (item) => item.roomReservationId === result.created?.id,
    );
    expect(meeting).toBeDefined();
    expect(meeting?.projectId).toBe(1);
    expect(meeting?.projectTag).toBe("GOODS");
    expect(meeting?.topics).toEqual(DEFAULT_TOPICS);
    expect(meeting?.hostAuthority).toBe("OWNER");
    expect(meeting?.hostTeamId).toBeUndefined();
    expect(meeting?.parentTeamActionId).toBeUndefined();
  });

  it("제목이 비면 막고 revalidatePath를 안 부른다", async () => {
    const result = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, title: "" }),
    );

    expect(result.errors.title).toBeDefined();
    expect(result.created).toBeUndefined();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("같은 회의실·겹치는 시간대는 막는다", async () => {
    const first = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, roomId: "room-video", date: "2026-08-12", startTime: "10:00" }),
    );
    expect(first.errors).toEqual({});

    const second = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, roomId: "room-video", date: "2026-08-12", startTime: "10:00" }),
    );

    expect(second.errors.roomId).toBe("그 시간에는 이미 예약된 회의실입니다");
    expect(second.created).toBeUndefined();
  });

  it("겹치지 않는 시간대는 같은 회의실이어도 통과한다", async () => {
    await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, roomId: "room-video", date: "2026-08-13", startTime: "10:00" }),
    );

    const result = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, roomId: "room-video", date: "2026-08-13", startTime: "10:30" }),
    );

    expect(result.errors).toEqual({});
    expect(result.created).toBeDefined();
  });

  it("프로젝트를 안 넣으면 막는다(WORKFLOW.md §3-1: 항상 필수)", async () => {
    const result = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, projectId: "", date: "2026-08-14" }),
    );

    expect(result.errors.projectId).toBe("프로젝트를 선택해 주세요");
    expect(result.created).toBeUndefined();
  });

  it("안건을 안 넣으면 막는다", async () => {
    const result = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, date: "2026-08-14" }, [1], []),
    );

    expect(result.errors.topics).toBeDefined();
    expect(result.created).toBeUndefined();
  });

  it("안건을 여러 쌍 넣으면 전부 저장된다", async () => {
    const result = await createRoomReservationAction(
      { errors: {} },
      form(
        { ...VALID_ENTRIES, date: "2026-08-14" },
        [2],
        [
          { main: "제품", sub: "로드맵 검토" },
          { main: "마케팅", sub: "캠페인 리뷰" },
        ],
      ),
    );

    expect(result.created?.topics).toEqual([
      { main: "제품", sub: "로드맵 검토" },
      { main: "마케팅", sub: "캠페인 리뷰" },
    ]);
  });

  it("Owner는 상위 팀 액션 없이도 통과한다", async () => {
    const result = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, date: "2026-08-14", startTime: "09:00" }),
    );

    expect(result.errors).toEqual({});
  });

  it("Owner인데 폼에 상위 팀 액션이 끼어 있으면 막는다(폼 조작 방어)", async () => {
    const result = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, date: "2026-08-14", startTime: "09:30", parentTeamActionId: "1" }),
    );

    expect(result.errors.parentTeamActionId).toBe(
      "Owner가 개설하는 회의에는 상위 팀 액션을 지정할 수 없습니다",
    );
    expect(result.created).toBeUndefined();
  });

  it("폼이 조작돼 존재하지 않는 회의실 id가 오면 막는다", async () => {
    const result = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, roomId: "room-does-not-exist", date: "2026-08-24" }),
    );

    expect(result.errors.roomId).toBe("존재하지 않는 회의실입니다");
    expect(result.created).toBeUndefined();
  });

  it("폼이 조작돼 존재하지 않는 프로젝트 id가 오면 막는다", async () => {
    const result = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, projectId: "999", date: "2026-08-24" }),
    );

    expect(result.errors.projectId).toBe("존재하지 않는 프로젝트입니다");
    expect(result.created).toBeUndefined();
  });

  it("폼이 조작돼 존재하지 않는 참석자 id가 오면 막는다", async () => {
    const result = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, date: "2026-08-24" }, [9999]),
    );

    expect(result.errors.attendeeIds).toBe("존재하지 않는 참석자가 있습니다");
    expect(result.created).toBeUndefined();
  });

  it("Owner 명단에 팀장 아닌 사람이 섞이면 막는다(2026-08-13 범위 강제)", async () => {
    // id=3 이하윤은 개발팀 MEMBER다 — 화면 피커엔 애초에 안 뜨지만 폼은 조작될 수 있다.
    const result = await createRoomReservationAction({ errors: {} }, form(VALID_ENTRIES, [2, 3]));

    expect(result.errors.attendeeIds).toBe(
      "Owner가 개설하는 회의에는 팀장만 참석자로 지정할 수 있습니다",
    );
    expect(result.created).toBeUndefined();
  });

  it("host 자신(=액터)은 규칙에서 빠진다 — 명단에 끼어 있어도 통과한다", async () => {
    // ⚠️ host는 고르는 사람이 아니라 서버가 명단에 넣는 사람이다(`attendee-scope.ts`).
    const result = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, date: "2026-08-20" }, [1, 2]),
    );

    expect(result.errors).toEqual({});
    expect(result.created).toBeDefined();
  });

  it("팀이 다른 팀장끼리는 함께 넣을 수 있다(Owner 회의는 전사 팀장 회의다)", async () => {
    // id=2 김서준(개발팀 LEADER) · id=5 최유진(마케팅팀 LEADER)
    const result = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, date: "2026-08-17" }, [2, 5]),
    );

    expect(result.errors).toEqual({});
    // ⚠️ host(액터 id=1)는 피커가 후보로 안 내주는 대신 저장할 때 맨 앞에 자동으로 들어간다.
    expect(result.created?.attendeeIds).toEqual([1, 2, 5]);
  });

  it("폼이 조작돼 참석자 값이 숫자가 아니면 막는다", async () => {
    const data = new FormData();
    for (const [key, value] of Object.entries({ ...VALID_ENTRIES, date: "2026-08-24" })) {
      data.append(key, value);
    }
    data.append("attendeeIds", "not-a-number");
    data.append("topicMain", "제품");
    data.append("topicSub", "로드맵 검토");

    const result = await createRoomReservationAction({ errors: {} }, data);

    expect(result.errors.attendeeIds).toBe("참석자 값이 올바르지 않습니다");
    expect(result.created).toBeUndefined();
  });
});

describe("회의실 예약 생성 (Leader 개설 = 팀 액션 회의)", () => {
  const LEADER = { id: 5, role: "LEADER", teamId: 7, teamName: "개발팀" };

  beforeEach(() => {
    getMockActorMock.mockReturnValue(LEADER);
  });

  it("상위 팀 액션 없이 제출하면 막는다", async () => {
    const result = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, date: "2026-08-25" }),
    );

    expect(result.errors.parentTeamActionId).toBe("상위 팀 액션을 선택해 주세요");
    expect(result.created).toBeUndefined();
  });

  it("자기 팀의 진짜 팀 액션이면 통과하고, 회의에도 그대로 담긴다", async () => {
    // projectId=1(GOODS)의 팀 액션 id=1("앱 개발 착수")은 team-actions 목데이터상 "개발팀" 소속이다.
    const result = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, date: "2026-08-25", parentTeamActionId: "1" }),
    );

    expect(result.errors).toEqual({});
    expect(result.created).toBeDefined();

    const meeting = listMockMeetings().find(
      (item) => item.roomReservationId === result.created?.id,
    );
    expect(meeting).toBeDefined();
    expect(meeting?.hostAuthority).toBe("LEADER");
    expect(meeting?.hostTeamId).toBe(LEADER.teamId);
    expect(meeting?.parentTeamActionId).toBe(1);
  });

  it("다른 팀 소속 팀 액션 id를 끼워 넣으면 막는다(폼 조작 방어)", async () => {
    // id=3("TV 광고 계약 및 모델 섭외")은 GOODS 프로젝트 소속이지만 팀은 "마케팅팀"이다.
    const result = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, date: "2026-08-25", parentTeamActionId: "3" }),
    );

    expect(result.errors.parentTeamActionId).toBe("존재하지 않는 상위 팀 액션입니다");
    expect(result.created).toBeUndefined();
  });

  it("자기 팀이 아닌 사람을 참석자로 끼워 넣으면 막는다(2026-08-13 범위 강제)", async () => {
    /* id=7 강서연은 디자인팀 LEADER다 — 개발팀 Leader의 회의엔 못 들어간다.
       ⚠️ id=5는 안 쓴다 — 이 블록의 액터가 id=5라 host 예외에 걸려 검사에서 빠진다. */
    const result = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, date: "2026-08-25", parentTeamActionId: "1" }, [2, 7]),
    );

    expect(result.errors.attendeeIds).toBe("자기 팀 소속만 참석자로 지정할 수 있습니다");
    expect(result.created).toBeUndefined();
  });

  it("자기 팀 사원은 팀장이 아니어도 넣을 수 있다(Owner 규칙과 다른 축이다)", async () => {
    // id=3 이하윤은 개발팀 MEMBER — 같은 팀이면 권한을 보지 않는다.
    const result = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, date: "2026-08-18", parentTeamActionId: "1" }, [3]),
    );

    expect(result.errors).toEqual({});
    // host(액터 id=5)가 맨 앞에 자동으로 들어간다 — 개설자는 자기 회의 상세를 볼 수 있어야 한다.
    expect(result.created?.attendeeIds).toEqual([5, 3]);
  });

  it("세션에 소속 팀이 없으면 통과시키지 않는다(범위를 잴 수 없다 — §정직성)", async () => {
    getMockActorMock.mockReturnValue({ id: 5, role: "LEADER", teamId: 7 });

    const result = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, date: "2026-08-19", parentTeamActionId: "1" }, [2]),
    );

    // ⚠️ 팀 이름이 없으면 "상위 팀 액션"도 못 찾는다 — 둘 중 어느 칸에 걸리든 통과하면 안 된다.
    expect(result.created).toBeUndefined();
    expect(result.errors.attendeeIds ?? result.errors.parentTeamActionId).toBeDefined();
  });

  it("다른 프로젝트 소속 팀 액션 id를 끼워 넣으면 막는다", async () => {
    // id=7("협업툴 리뉴얼 착수")은 "개발팀" 소속이지만 COLLAB 프로젝트다 — 지금 고른 프로젝트는 GOODS(1).
    const result = await createRoomReservationAction(
      { errors: {} },
      form({ ...VALID_ENTRIES, date: "2026-08-25", parentTeamActionId: "7" }),
    );

    expect(result.errors.parentTeamActionId).toBe("존재하지 않는 상위 팀 액션입니다");
    expect(result.created).toBeUndefined();
  });
});
