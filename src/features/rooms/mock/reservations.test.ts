import { AUTHORITY } from "@/constants/authority";
import { listMockMeetings } from "@/features/meeting/mock/meetings";
import type { Actor } from "@/lib/permission";

import {
  addMockReservation,
  findMockReservation,
  listMockReservations,
  listMockReservationsByRoom,
} from "./reservations";

const DRAFT = {
  title: "  신규 회의  ",
  roomId: "room-small-b",
  date: "2026-08-10",
  startTime: "10:30",
  projectId: "1", // TOP_LEVEL_PROJECTS의 GOODS(id=1)
  topics: [{ main: "제품", sub: "로드맵 검토" }],
  attendeeIds: [1, 2],
};

const OWNER: Actor = { id: 3, role: AUTHORITY.OWNER };
const LEADER: Actor = { id: 5, role: AUTHORITY.LEADER, teamId: 7, teamName: "개발팀" };

describe("회의실 예약 mock 스토어", () => {
  it("시드 데이터가 회의실별로 최소 한 건씩 있다", () => {
    expect(listMockReservationsByRoom("room-large").length).toBeGreaterThan(0);
  });

  it("예약을 추가하면 앞뒤 공백을 지우고 회의실 이름·프로젝트 태그를 채운다", () => {
    const before = listMockReservations().length;

    const created = addMockReservation(DRAFT, OWNER);

    expect(created.title).toBe("신규 회의");
    expect(created.roomName).toBe("소회의실 B");
    expect(created.projectTag).toBe("GOODS");
    expect(created.ownerId).toBe(3);
    // 시작 10:30 + 고정 30분 = 종료 11:00
    expect(created.end.getTime() - created.start.getTime()).toBe(30 * 60_000);
    expect(listMockReservations()).toHaveLength(before + 1);
    expect(findMockReservation(created.id)).toEqual(created);
  });

  it("host는 제출값에 없어도 명단 맨 앞에 들어간다(중복은 한 번만)", () => {
    // 피커가 host를 후보로 안 내주므로(`attendee-scope.ts`) 제출값엔 host가 없다.
    // ⚠️ LEADER는 `requiresParentTeamAction`이라 `parentTeamActionId`가 있어야 저장 시 undefined가 안 새어 나간다.
    expect(addMockReservation({ ...DRAFT, parentTeamActionId: 1 }, LEADER).attendeeIds).toEqual([
      5, 1, 2,
    ]);
    expect(addMockReservation({ ...DRAFT, attendeeIds: [3, 1] }, OWNER).attendeeIds).toEqual([
      3, 1,
    ]);
  });

  it("예약과 같이 회의(Meeting)도 만들어진다(WORKFLOW.md §3-1: 예약=회의 개설)", () => {
    const before = listMockMeetings().length;

    const created = addMockReservation(DRAFT, OWNER);

    const meetings = listMockMeetings();
    expect(meetings).toHaveLength(before + 1);
    const meeting = meetings[meetings.length - 1];
    expect(meeting?.roomReservationId).toBe(created.id);
    expect(meeting?.hostId).toBe(OWNER.id);
    expect(meeting?.hostAuthority).toBe(AUTHORITY.OWNER);
    expect(meeting?.hostTeamId).toBeUndefined();
  });

  it("Leader가 만들면 회의에 hostTeamId가 담긴다", () => {
    addMockReservation({ ...DRAFT, parentTeamActionId: 1 }, LEADER);

    const meetings = listMockMeetings();
    const meeting = meetings[meetings.length - 1];
    expect(meeting?.hostAuthority).toBe(AUTHORITY.LEADER);
    expect(meeting?.hostTeamId).toBe(7);
    expect(meeting?.parentTeamActionId).toBe(1);
  });

  it("없는 id는 조회 시 null을 돌려준다", () => {
    expect(findMockReservation("존재하지-않음")).toBeNull();
  });
});
