import type { DashboardMeeting } from "@/components/common/dashboard-meeting-item";
import { ACTION_STATUS, MEETING_STATUS } from "@/constants/domain";

import type { MemberAction } from "../types";

/**
 * ⚠️ 목 데이터 — BE 연동 전(ERD·API 스펙 미확정, DECISIONS.md).
 * 로그인 사원 = 이하윤(개발팀·프론트엔드) 기준. 아래는 이하윤 본인의 액션·참석 회의다.
 * 오늘(2026-08-05) 기준으로 마감 임박·연체가 섞이도록 날짜를 잡았다.
 *
 * 시작일은 타임라인 기간 바의 왼쪽 끝이라 상태와 아귀가 맞게 잡았다:
 *  - 지연(마감 경과) = 시작·마감 모두 과거
 *  - 진행중 = 시작이 오늘 이전(오늘선을 가로지름)
 *  - 할 일(미착수) = 시작이 오늘 이후(오늘선 오른쪽에만)
 */

/** 내 액션 전체 — 서버가 처리할 액션(마감 7일·연체) 필터·정렬을 얹는다 */
export const MEMBER_ACTIONS_MOCK: MemberAction[] = [
  {
    id: "ma1",
    title: "로그인 폼 검증 로직 구현",
    projectTag: "GOODS",
    status: ACTION_STATUS.IN_PROGRESS,
    startDate: "2026-08-01",
    dueDate: "2026-08-03", // 연체(D+2)
  },
  {
    id: "ma2",
    title: "접근성 점검 - 키보드 내비게이션",
    projectTag: "COLLAB",
    status: ACTION_STATUS.IN_PROGRESS,
    startDate: "2026-08-01",
    dueDate: "2026-08-04", // 연체(D+1)
  },
  {
    id: "ma3",
    title: "PG사 연동 문서 검토",
    projectTag: "GOODS",
    // 시작일이 오늘이라 미착수 '할 일'이 아니라 오늘부터 하는 '진행중'이다(오늘선에 걸침).
    status: ACTION_STATUS.IN_PROGRESS,
    startDate: "2026-08-05",
    dueDate: "2026-08-06", // D-1
  },
  {
    id: "ma4",
    title: "온보딩 플로우 와이어프레임 검토",
    projectTag: "GOODS",
    status: ACTION_STATUS.IN_PROGRESS,
    startDate: "2026-08-04",
    dueDate: "2026-08-08", // D-3 (오늘 걸침)
  },
  {
    id: "ma5",
    title: "회원가입 API 연동",
    projectTag: "GOODS",
    status: ACTION_STATUS.TODO,
    startDate: "2026-08-09",
    dueDate: "2026-08-11", // D-6
  },
  {
    id: "ma6",
    title: "상품 목록 무한 스크롤 구현",
    projectTag: "GOODS",
    status: ACTION_STATUS.TODO,
    startDate: "2026-08-10",
    dueDate: "2026-08-12", // D-7
  },
  {
    id: "ma7",
    title: "실시간 알림 UI 작업",
    projectTag: "COLLAB",
    status: ACTION_STATUS.TODO,
    startDate: "2026-08-25",
    dueDate: "2026-08-30", // D-25 (처리할 액션 제외)
  },
  {
    id: "ma8",
    title: "프로젝트 타임라인 화면 구현",
    projectTag: "COLLAB",
    status: ACTION_STATUS.TODO,
    startDate: "2026-09-15",
    dueDate: "2026-09-21", // D-47 (처리할 액션 제외)
  },
];

/** 내가 참석자로 지정된 회의 — 개설 라벨은 부서명("개발팀")+개설자 사람 */
export const MEMBER_ATTENDED_MEETINGS_MOCK: DashboardMeeting[] = [
  {
    id: "mm1",
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
    id: "mm2",
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
    id: "mm3",
    title: "협업툴 리뉴얼 - 스프린트 플래닝",
    projectTag: "COLLAB",
    status: MEETING_STATUS.IN_PROGRESS,
    room: "회의실 A",
    scheduledAt: "2026-08-05T11:00:00",
    attendeeCount: 3,
    originLabel: "개발팀",
    hostLabel: "김서준(팀장)",
  },
  {
    id: "mm4",
    title: "온보딩 플로우 리뷰",
    projectTag: "GOODS",
    status: MEETING_STATUS.SCHEDULED,
    room: "회의실 C",
    scheduledAt: "2026-08-08T15:00:00",
    attendeeCount: 2,
    originLabel: "개발팀",
    hostLabel: "이하윤",
  },
  {
    id: "mm5",
    title: "실시간 알림 아키텍처 논의",
    projectTag: "COLLAB",
    status: MEETING_STATUS.SCHEDULED,
    room: "회의실 B",
    scheduledAt: "2026-08-11T10:00:00",
    attendeeCount: 2,
    originLabel: "개발팀",
    hostLabel: "박도현",
  },
];
