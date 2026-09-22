import type { DashboardMeeting } from "@/components/common/dashboard-meeting-item";
import type { MemberStatus } from "@/constants/domain";

export interface TeamDashboardMember {
  id: string;
  name: string;
  /** 직급 (예: "선임") */
  position: string;
  /** 부서 내 세부 역할 (예: "프론트엔드"). 온보딩에서 사원마다 반드시 지정된다 */
  role: string;
  /** 담당 액션 수 — 대시보드 요약 지표라 집계된 값을 그대로 받는다 */
  assignedActionCount: number;
  status: MemberStatus;
}

export interface TeamDashboardOverview {
  /** 로그인한 팀장의 부서명 (예: "개발팀") */
  teamName: string;
  /**
   * 팀에 하달된 **팀 액션** 개수. ⚠️ "팀 프로젝트"가 아니다 — 프로젝트는 Owner만 개설하고,
   * 한 프로젝트가 팀 액션을 여러 개 줄 수 있고 여러 프로젝트에서 팀 액션이 나오므로
   * "프로젝트 단위"로 셀 수 없다. 팀이 가진 팀 액션 총합만 센다.
   */
  teamActionCount: number;
  /** 팀원 액션 수 (팀 액션 기준 — 팀에 하달된 개인 액션 총합) */
  memberActionCount: number;
  /** 팀장 본인 담당 액션 수 */
  myActionCount: number;
  /** 팀 누적 완료 액션 수 */
  doneActionCount: number;
  members: TeamDashboardMember[];
  /**
   * 이 팀의 회의만 — 개설 라벨은 부서명(예: "개발팀"). 팀 액션 회의는 여기 안 나온다.
   *
   * ⚠️ **빈 배열과 `null`은 다른 말이다**(2026-08-13). `[]`는 "물어봤는데 없다",
   *    `null`은 **"못 물어봤다"**(조회 실패)다 — 회의 조회가 넘어졌을 때 `[]`로 뭉치면
   *    화면이 "예정된 팀 회의가 없습니다"라고 **없는 사실을 단정**한다(§정직성). 팀장이
   *    다섯 건을 두고도 없다고 믿고 새 회의를 잡으러 간다. 회의 상세의 산출물 칸이
   *    같은 이유로 `outputs`를 `null`로 연다(§meeting/view-types).
   */
  meetings: DashboardMeeting[] | null;
}
