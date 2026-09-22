import { MEETING_STATUS, MEMBER_STATUS } from "@/constants/domain";

import type { OwnerDashboardOverview } from "../types";

/**
 * ⚠️ 목 데이터 — BE 연동 전(ERD·API 스펙 미확정, DECISIONS.md).
 * 오너 대시보드는 이미 집계된 요약 지표를 받는다는 전제라, FE가 프로젝트·회의
 * 원본을 다시 순회해 집계하지 않는다(연동 시 이 파일과 server.ts만 교체).
 */
export const OWNER_DASHBOARD_MOCK: OwnerDashboardOverview = {
  totalProjectCount: 4,
  dueSoonProjectCount: 1,
  activeMemberCount: 10,
  onLeaveMemberCount: 0,
  leaderRows: [
    {
      id: "leader-kim",
      name: "김서준",
      email: "seojun.kim@zteam.io",
      department: "개발팀",
      status: MEMBER_STATUS.ACTIVE,
      leavePeriod: null,
    },
    {
      id: "leader-choi",
      name: "최유진",
      email: "yujin.choi@zteam.io",
      department: "마케팅팀",
      status: MEMBER_STATUS.ACTIVE,
      leavePeriod: null,
    },
    {
      id: "leader-kang",
      name: "강서연",
      email: "seoyeon.kang@zteam.io",
      department: "디자인팀",
      status: MEMBER_STATUS.ACTIVE,
      leavePeriod: null,
    },
    {
      id: "leader-oh",
      name: "오현우",
      email: "hyunwoo.oh@zteam.io",
      department: "전략기획팀",
      status: MEMBER_STATUS.ACTIVE,
      leavePeriod: null,
    },
  ],
  projectMeetings: [
    {
      id: "m1",
      title: "7월 운영 점검 회의",
      projectTag: "GOODS",
      status: MEETING_STATUS.DONE,
      room: "회의실 A",
      scheduledAt: "2026-07-30T10:00:00",
      attendeeCount: 4,
      originLabel: "Owner",
    },
    {
      id: "m2",
      title: "8월 킥오프 미팅",
      projectTag: "GOODS",
      status: MEETING_STATUS.DONE,
      room: "대회의실",
      scheduledAt: "2026-08-01T14:00:00",
      attendeeCount: 4,
      originLabel: "Owner",
    },
    {
      id: "m3",
      title: "브랜드 리뉴얼 킥오프",
      projectTag: "BRAND",
      status: MEETING_STATUS.IN_PROGRESS,
      room: "회의실 B",
      scheduledAt: "2026-08-05T11:00:00",
      attendeeCount: 3,
      originLabel: "Owner",
    },
    {
      id: "m4",
      title: "협업툴 리뉴얼 프로젝트 킥오프",
      projectTag: "COLLAB",
      status: MEETING_STATUS.SCHEDULED,
      room: "회의실 C",
      scheduledAt: "2026-08-08T15:00:00",
      attendeeCount: 3,
      originLabel: "Owner",
    },
    {
      id: "m5",
      title: "9월 스프린트 리뷰",
      projectTag: "GOODS",
      status: MEETING_STATUS.SCHEDULED,
      room: "회의실 A",
      scheduledAt: "2026-08-12T10:00:00",
      attendeeCount: 2,
      originLabel: "Owner",
    },
  ],
};
