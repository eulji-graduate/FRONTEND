import type { MeetingRoom, MeetingRoomDraft } from "../types";

/**
 * ⚠️ 목 데이터 — BE 연동 전(ERD·API 스펙 미확정, DECISIONS.md).
 * ⚠️ 상태를 `globalThis`에 매단다 — dev의 HMR로 `let`이 초기화되면 방금 추가한 회의실이 사라진다
 *    (`mock/reservations.ts`와 같은 트릭).
 */
interface RoomStore {
  rooms: MeetingRoom[];
  sequence: number;
}

const INITIAL: MeetingRoom[] = [
  { id: "room-large", name: "대회의실", location: "3층 A동" },
  { id: "room-small-a", name: "소회의실 A", location: "3층 A동" },
  { id: "room-small-b", name: "소회의실 B", location: "3층 B동" },
  { id: "room-video", name: "화상회의실", location: "본관 5층" },
];

const globalStore = globalThis as typeof globalThis & {
  __meetingRoomStore?: RoomStore;
};
const store: RoomStore = (globalStore.__meetingRoomStore ??= {
  rooms: INITIAL,
  sequence: INITIAL.length,
});

export function listMockRooms(): MeetingRoom[] {
  return store.rooms;
}

export function findMockRoom(id: string): MeetingRoom | null {
  return store.rooms.find((room) => room.id === id) ?? null;
}

/** 회의실 추가(`/manage/rooms`) — 예약 승인 절차가 없어 만들면 바로 예약 가능한 목록에 들어간다. */
export function addMockRoom(draft: MeetingRoomDraft): MeetingRoom {
  const room: MeetingRoom = {
    id: `room-${++store.sequence}`,
    name: draft.name.trim(),
    location: draft.location.trim(),
  };
  store.rooms = [...store.rooms, room];
  return room;
}

/** 회의실 수정 — 없는 id면 `null`(호출부가 "수정할 회의실을 찾을 수 없다" 오류로 바꾼다). */
export function updateMockRoom(id: string, draft: MeetingRoomDraft): MeetingRoom | null {
  const index = store.rooms.findIndex((room) => room.id === id);
  if (index === -1) return null;

  const updated: MeetingRoom = { id, name: draft.name.trim(), location: draft.location.trim() };
  store.rooms = [...store.rooms.slice(0, index), updated, ...store.rooms.slice(index + 1)];
  return updated;
}

/** 회의실 삭제 — 있던 회의실이면 지우고 true, 이미 없으면 false(중복 삭제 요청도 조용히 넘어간다). */
export function deleteMockRoom(id: string): boolean {
  const existed = store.rooms.some((room) => room.id === id);
  store.rooms = store.rooms.filter((room) => room.id !== id);
  return existed;
}
