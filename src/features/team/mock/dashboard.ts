import { MEETING_STATUS, MEMBER_STATUS } from "@/constants/domain";

import type { TeamDashboardOverview } from "../types";

/**
 * ⚠️ 목 데이터 — BE 연동 전(ERD·API 스펙 미확정, DECISIONS.md).
 * 로그인 팀장 = 김서준(개발팀장) 기준. 팀원 = 이하윤·박도현.
 * 회의 개설 라벨은 부서명("개발팀")이다(오너 대시보드의 "Owner" 자리).
 */
export const TEAM_DASHBOARD_MOCK: TeamDashboardOverview = {
  teamName: "개발팀",
  // 팀 액션 3개: 앱 개발 착수 · 결제 시스템 연동(GOODS) · 협업툴 리뉴얼 착수(COLLAB)
  teamActionCount: 3,
  memberActionCount: 6,
  myActionCount: 1,
  doneActionCount: 0,
  members: [
    {
      id: "member-lee",
      name: "이하윤",
      position: "선임",
      role: "프론트엔드",
      assignedActionCount: 3,
      status: MEMBER_STATUS.ACTIVE,
    },
    {
      id: "member-park",
      name: "박도현",
      position: "주임",
      role: "백엔드",
      assignedActionCount: 2,
      status: MEMBER_STATUS.ACTIVE,
    },
  ],
  meetings: [
    {
      id: "tm1",
      title: "앱 개발 착수 - 기획 회의",
      projectTag: "GOODS",
      status: MEETING_STATUS.DONE,
      room: "회의실 A",
      scheduledAt: "2026-07-31T10:00:00",
      attendeeCount: 3,
      originLabel: "개발팀",
      hostLabel: "김서준(팀장)",
    },
    {
      id: "tm2",
      title: "결제 시스템 연동 - 착수 회의",
      projectTag: "GOODS",
      status: MEETING_STATUS.DONE,
      room: "회의실 B",
      scheduledAt: "2026-08-03T14:00:00",
      attendeeCount: 3,
      originLabel: "개발팀",
      hostLabel: "김서준(팀장)",
    },
    {
      id: "tm3",
      title: "협업툴 리뉴얼 - 스프린트 플래닝",
      projectTag: "COLLAB",
      status: MEETING_STATUS.IN_PROGRESS,
      room: "회의실 A",
      scheduledAt: "2026-08-05T11:00:00",
      attendeeCount: 3,
      originLabel: "개발팀",
      hostLabel: "이하윤",
    },
    {
      id: "tm4",
      title: "인증 모듈 설계 리뷰",
      projectTag: "GOODS",
      status: MEETING_STATUS.SCHEDULED,
      room: "회의실 C",
      scheduledAt: "2026-08-08T15:00:00",
      attendeeCount: 2,
      originLabel: "개발팀",
      hostLabel: "박도현",
    },
    {
      id: "tm5",
      title: "실시간 알림 아키텍처 논의",
      projectTag: "COLLAB",
      status: MEETING_STATUS.SCHEDULED,
      room: "회의실 B",
      scheduledAt: "2026-08-11T10:00:00",
      attendeeCount: 2,
      originLabel: "개발팀",
      hostLabel: "이하윤",
    },
  ],
};
