import type { DashboardMeeting } from "@/components/common/dashboard-meeting-item";
import type { MemberStatus } from "@/constants/domain";

export interface OwnerDashboardLeaderRow {
  id: string;
  name: string;
  email: string;
  department: string;
  status: MemberStatus;
  /** 휴직 상태일 때만 채워지는 기간 문자열(예: "8월 1일~15일"). 재직이면 null */
  leavePeriod: string | null;
}

export interface OwnerDashboardOverview {
  /** [확인] `GET /api/projects/dashboard-summary` — 서버가 이미 집계한 값, 원본 목록을 다시 세지 않는다 */
  totalProjectCount: number;
  dueSoonProjectCount: number;
  activeMemberCount: number;
  onLeaveMemberCount: number;
  leaderRows: OwnerDashboardLeaderRow[];
  /** Owner 주최 프로젝트 회의만 (2절) — 팀 액션 회의는 여기 안 나온다. 개설 라벨은 "Owner" */
  projectMeetings: DashboardMeeting[];
}
