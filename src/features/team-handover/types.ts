import type { ActionStatus } from "@/constants/domain";
import type { HandoverType } from "@/constants/handover";

/**
 * "인수인계서 관리"(`/team/handover`)의 **UI 계약**(CLAUDE.md §Mock 격리막).
 * WORKFLOW.md §7 — 팀원(팀장 본인 제외)의 휴직·오프보딩 신청을 팀장이 열어, 그 사람이
 * 남긴 액션을 팀원 보드로 재배정하고 [인수인계 확정]을 누르면 팀장 중간 승인이 끝난다.
 */

export interface TeamHandoverAction {
  id: number;
  projectTag: string;
  parentTeamActionName: string;
  title: string;
  status: ActionStatus;
  /** 작업 시작일 `YYYY-MM-DD` — 타임라인 바의 왼쪽 끝 */
  startDate: string;
  dueDate: string;
}

/** 목록 한 줄. */
export interface TeamHandoverListItem {
  /** 인수인계서 id — [확인] BE `HandoverSummaryResponse.id`. 상세 라우트(`/team/handover/[handoverId]`)로 그대로 쓴다. */
  handoverId: number;
  memberId: number;
  memberName: string;
  /** 이 인수인계서가 속한 팀 — 권한 판정(`canApproveMid`)이 이 값과 승인자의 팀을 대조한다. */
  teamId: number;
  type: HandoverType;
  /** 휴직 기간 `YYYY-MM-DD`. 오프보딩이면 `null`(돌아오지 않는다) */
  period: { from: string; to: string } | null;
  actionCount: number;
}

/** 재배정 대상 — 신청자 제외, 같은 팀 구성원(팀장 본인 포함). */
export interface TeamMemberOption {
  id: number;
  name: string;
  /** Leader면 "팀장" 등, 없으면 `null`(이름만 표시) */
  roleLabel: string | null;
}

export interface TeamHandoverDetail extends TeamHandoverListItem {
  actions: TeamHandoverAction[];
  teammates: TeamMemberOption[];
}

/** [인수인계 확정]이 보내는 값 — 액션마다 고른 담당자. */
export interface TeamHandoverAssignment {
  actionId: number;
  assigneeId: number;
}
