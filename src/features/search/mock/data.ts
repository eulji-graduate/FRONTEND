import { AUTHORITY } from "@/constants/domain";

import type {
  SearchActionResult,
  SearchMeetingResult,
  SearchPersonResult,
  SearchProjectResult,
  SearchRecentViewItem,
} from "../types";

/**
 * ⚠️ 목 데이터 — BE 연동 전(ERD·API 스펙 미확정). 프로젝트·사람은 다른 화면의 목과
 *    **같은 이름**을 쓴다(GOODS·BRAND·COLLAB, 박대표·김서준·이하윤·박도현) — 화면을 오갈 때
 *    같은 회사로 보이게 하려고다(§정직한 목업).
 */

const GOODS_PROJECT: SearchProjectResult = {
  kind: "PROJECT",
  id: 1,
  name: "연예인 굿즈 쇼핑몰 앱 구축",
  tag: "GOODS",
  meetingCount: 24,
  actionCount: 11,
};

const BRAND_PROJECT: SearchProjectResult = {
  kind: "PROJECT",
  id: 2,
  name: "3분기 마케팅 브랜드 리뉴얼",
  tag: "BRAND",
  meetingCount: 8,
  actionCount: 4,
};

const COLLAB_PROJECT: SearchProjectResult = {
  kind: "PROJECT",
  id: 3,
  name: "사내 협업툴 리뉴얼",
  tag: "COLLAB",
  meetingCount: 12,
  actionCount: 4,
};

export const SEARCH_MOCK_PROJECTS: SearchProjectResult[] = [
  GOODS_PROJECT,
  BRAND_PROJECT,
  COLLAB_PROJECT,
];

const ROADMAP_MEETING: SearchMeetingResult = {
  kind: "MEETING",
  id: 101,
  title: "8월 로드맵 점검 회의",
  snippet: "결제 연동을 이번 스프린트 최우선 과제로 확정했습니다.",
  projectName: "연예인 굿즈 쇼핑몰 앱 구축",
  projectTag: "GOODS",
  meetingDate: "2026-08-05",
};

const BRAND_KICKOFF_MEETING: SearchMeetingResult = {
  kind: "MEETING",
  id: 102,
  title: "브랜드 캠페인 킥오프",
  snippet: "3분기 캠페인 컨셉과 채널별 일정을 확정했습니다.",
  projectName: "3분기 마케팅 브랜드 리뉴얼",
  projectTag: "BRAND",
  meetingDate: "2026-07-28",
};

const COLLAB_REQUIREMENT_MEETING: SearchMeetingResult = {
  kind: "MEETING",
  id: 103,
  title: "협업툴 요구사항 회의",
  snippet: "회의·문서·일정 흐름을 하나로 잇기로 했습니다.",
  projectName: "사내 협업툴 리뉴얼",
  projectTag: "COLLAB",
  meetingDate: "2026-07-20",
};

export const SEARCH_MOCK_MEETINGS: SearchMeetingResult[] = [
  ROADMAP_MEETING,
  BRAND_KICKOFF_MEETING,
  COLLAB_REQUIREMENT_MEETING,
];

const PAYMENT_API_ACTION: SearchActionResult = {
  kind: "ACTION",
  id: 201,
  title: "결제 모듈 API 명세 작성",
  assigneeId: 4,
  assigneeName: "박도현",
  dueDate: "2026-08-12",
  projectTag: "GOODS",
};

const CAMPAIGN_VISUAL_ACTION: SearchActionResult = {
  kind: "ACTION",
  id: 202,
  title: "캠페인 비주얼 시안 제작",
  assigneeId: 3,
  assigneeName: "이하윤",
  dueDate: "2026-08-02",
  projectTag: "BRAND",
};

const MEETING_NOTE_TEMPLATE_ACTION: SearchActionResult = {
  kind: "ACTION",
  id: 203,
  title: "회의록 템플릿 정의",
  assigneeId: 2,
  assigneeName: "김서준",
  dueDate: "2026-08-09",
  projectTag: "COLLAB",
};

export const SEARCH_MOCK_ACTIONS: SearchActionResult[] = [
  PAYMENT_API_ACTION,
  CAMPAIGN_VISUAL_ACTION,
  MEETING_NOTE_TEMPLATE_ACTION,
];

export const SEARCH_MOCK_PEOPLE: SearchPersonResult[] = [
  {
    kind: "PERSON",
    id: 1,
    name: "박대표",
    authority: AUTHORITY.OWNER,
    team: null,
    description: "기업 전체를 관리합니다.",
  },
  {
    kind: "PERSON",
    id: 2,
    name: "김서준",
    authority: AUTHORITY.LEADER,
    team: "개발팀",
    description: "회의록 템플릿 정의를 담당합니다.",
  },
  {
    kind: "PERSON",
    id: 3,
    name: "이하윤",
    authority: AUTHORITY.MEMBER,
    team: "개발팀",
    description: "캠페인 비주얼 시안 제작을 담당합니다.",
  },
  {
    kind: "PERSON",
    id: 4,
    name: "박도현",
    authority: AUTHORITY.MEMBER,
    team: "개발팀",
    description: "결제 모듈 API 명세 작성을 담당합니다.",
  },
];

/**
 * 최근 본 항목 — 회의 둘·액션 하나·프로젝트 하나.
 * ⚠️ `GET /search/overview`의 `recentItems`는 `{ type, id, title, meta }`뿐이다 —
 *    종류별 상세 필드(발췌·담당자·마감일 등)를 안 주므로, `meta`는 BE가 이미 조합해
 *    내려줄 보조 문구를 그대로 흉내 낸다.
 */
export const SEARCH_MOCK_RECENTLY_VIEWED: SearchRecentViewItem[] = [
  {
    kind: "MEETING",
    id: ROADMAP_MEETING.id,
    title: ROADMAP_MEETING.title,
    meta: `${ROADMAP_MEETING.projectName} · ${ROADMAP_MEETING.meetingDate}`,
  },
  {
    kind: "ACTION",
    id: PAYMENT_API_ACTION.id,
    title: PAYMENT_API_ACTION.title,
    meta: `${PAYMENT_API_ACTION.assigneeName} · 마감 ${PAYMENT_API_ACTION.dueDate}`,
  },
  {
    kind: "MEETING",
    id: BRAND_KICKOFF_MEETING.id,
    title: BRAND_KICKOFF_MEETING.title,
    meta: `${BRAND_KICKOFF_MEETING.projectName} · ${BRAND_KICKOFF_MEETING.meetingDate}`,
  },
  {
    kind: "PROJECT",
    id: GOODS_PROJECT.id,
    title: GOODS_PROJECT.name,
    meta: `회의 ${GOODS_PROJECT.meetingCount}건 · 액션 ${GOODS_PROJECT.actionCount}건`,
  },
];
