import { MEMBER_STATUS } from "@/constants/domain";

import type { TeamMemberRosterEntry } from "../types";

/**
 * ⚠️ 목 데이터 — BE 연동 전. 로그인 팀장 = 김서준(개발팀장) 기준, 팀원 = 이하윤·박도현
 * (팀 대시보드 mock과 같은 인물, `features/team/mock/dashboard.ts` 참고).
 * ⚠️ 대시보드 미니 표와 달리 **팀장 본인도 명단에 들어간다**(WORKFLOW.md §팀원 관리
 * 스크린샷 기준 — "팀원 현황"은 팀 전체를, 대시보드는 본인 몫을 따로 뺀 KPI로 본다).
 * ⚠️ **김서준(팀장) 항목은 목 데이터라 들어있는 것**이다(사용자 확인, 2026-08-08) — 실제
 *    연동 시 이 화면(로그인한 팀장 본인 시점)엔 팀장이 명단에 없을 가능성이 높다. BE
 *    스펙 확정되면 "본인 포함 여부"부터 다시 확인할 것.
 */
export const TEAM_MEMBER_ROSTER_MOCK: TeamMemberRosterEntry[] = [
  {
    id: 101,
    name: "이하윤",
    position: "선임",
    role: "프론트엔드",
    teamName: "개발팀",
    status: MEMBER_STATUS.ACTIVE,
  },
  {
    id: 102,
    name: "박도현",
    position: "주임",
    role: "백엔드",
    teamName: "개발팀",
    status: MEMBER_STATUS.ACTIVE,
  },
  {
    id: 2,
    name: "김서준",
    position: "팀장",
    role: "팀장",
    teamName: "개발팀",
    status: MEMBER_STATUS.ACTIVE,
  },
];
