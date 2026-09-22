import { AUTHORITY } from "@/constants/authority";

import type { RoomMember } from "../types";

/**
 * ⚠️ 목 데이터 — BE 연동 전. 참석자 검색 대상이 되는 사원 목록(전사 공용, 부서 무관).
 * 사원 도메인(`/manage/members`)과 별도로 이 화면 전용 경량 목록만 둔다 — 필요한 필드가 필터용
 * `teamName`·`authority`까지 셋뿐이라 사원 도메인 전체 타입을 끌어오지 않는다.
 * ⚠️ 팀·권한은 여기서 새로 지어내지 않는다 — `features/member/mock/managed.ts`의 같은 id와
 *    같은 값이다(§정직한 목업: 화면을 오갈 때 같은 사람의 소속이 달라 보이면 안 된다).
 */
export const MEETING_MEMBERS: RoomMember[] = [
  { id: 1, name: "박대표", teamName: null, authority: AUTHORITY.OWNER },
  { id: 2, name: "김서준", teamName: "개발팀", authority: AUTHORITY.LEADER },
  { id: 3, name: "이하윤", teamName: "개발팀", authority: AUTHORITY.MEMBER },
  { id: 4, name: "박도현", teamName: "개발팀", authority: AUTHORITY.MEMBER },
  { id: 5, name: "최유진", teamName: "마케팅팀", authority: AUTHORITY.LEADER },
  { id: 6, name: "정민석", teamName: "마케팅팀", authority: AUTHORITY.MEMBER },
  { id: 7, name: "강서연", teamName: "디자인팀", authority: AUTHORITY.LEADER },
  { id: 8, name: "임지안", teamName: "마케팅팀", authority: AUTHORITY.MEMBER },
  { id: 9, name: "오현우", teamName: "전략기획팀", authority: AUTHORITY.LEADER },
  { id: 10, name: "한소율", teamName: "디자인팀", authority: AUTHORITY.MEMBER },
];

export function listMockMembers(): RoomMember[] {
  return MEETING_MEMBERS;
}

export function findMockMember(id: number): RoomMember | null {
  return MEETING_MEMBERS.find((member) => member.id === id) ?? null;
}
