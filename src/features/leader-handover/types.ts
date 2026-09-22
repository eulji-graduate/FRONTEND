import type { ActionStatus, LeaderHandoverCustodyStatus } from "@/constants/domain";

/**
 * "인수인계서 관리"(`/owner/leader-handovers`)의 **UI 계약**(CLAUDE.md §Mock 격리막).
 * WORKFLOW.md §7 — 팀장 오프보딩이 최종 승인된 뒤 담당자 없이 남는 개인 액션 뭉치를
 * 새 팀장이 정해질 때까지 붙들고 있다가 일괄 이전한다.
 */

export interface LeaderHandoverAction {
  id: number;
  projectTag: string;
  parentTeamActionName: string;
  title: string;
  status: ActionStatus;
  dueDate: string;
}

/** 목록 한 줄. */
export interface LeaderHandoverListItem {
  id: string;
  title: string;
  formerLeaderName: string;
  teamName: string;
  /** 오프보딩 최종 승인일 `YYYY-MM-DD`. */
  offboardingApprovedAt: string;
  actionCount: number;
  custodyStatus: LeaderHandoverCustodyStatus;
}

/**
 * 귀속 대상 후보 — **같은 팀에 새로 지정된 팀장만**(2026-08-08 팀 정정). 타 부서
 * 팀장에게는 넘기지 않는다 — 그 팀에 새 팀장이 생기기 전까지 후보는 비어 있다.
 */
export interface LeaderCandidate {
  id: string;
  name: string;
  teamName: string;
}

export interface LeaderHandoverDetail extends LeaderHandoverListItem {
  actions: LeaderHandoverAction[];
  candidates: LeaderCandidate[];
}
