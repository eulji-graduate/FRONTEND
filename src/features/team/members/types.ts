import type { ActionStatus, MemberStatus } from "@/constants/domain";

/**
 * "팀원 관리"(`/team/members`) 화면의 **UI 계약**(CLAUDE.md §Mock 격리막).
 * WORKFLOW.md §팀원 관리 — 카드 아코디언, 접힘/펼침.
 */

/** 펼친 카드 안 액션 한 줄 — 프로젝트 태그·상위 팀 액션명이 상태·마감일과 함께 나온다. */
export interface TeamMemberAction {
  id: number;
  projectTag: string;
  parentTeamActionName: string;
  title: string;
  status: ActionStatus;
  dueDate: string;
}

/** 명단 한 줄(액션 제외) — 로스터 mock과 조회 결과가 이 모양을 공유한다. */
export interface TeamMemberRosterEntry {
  /** BE 자동증가 정수 PK(모든 고유 id는 오토 인크리먼트, 2026-08-10 백엔드 확인). */
  id: number;
  name: string;
  position: string;
  /** 팀 내 세부 역할(프론트엔드 등). 없으면 "없음". */
  role: string;
  teamName: string;
  status: MemberStatus;
}

/** 팀원 카드 한 장 — 접힌 요약에 필요한 값 + 펼치면 보이는 액션 목록. */
export interface TeamMemberStatusItem extends TeamMemberRosterEntry {
  actions: TeamMemberAction[];
}
