import type { ActionStatus } from "@/constants/domain";

/**
 * 개인 액션 상세(`/app/actions/:actionId`)의 UI 계약.
 * ⚠️ 팀 액션 상세(`TeamActionDetail`)와 거의 같은 모양이다 — 다른 점 둘뿐:
 *   ① 담당자가 팀장이 아니라 **그 사람 본인**이라 역할 라벨이 다양하다("프론트엔드" 등).
 *   ② 상위 팀 액션 정보가 **있다**(팀 액션 상세엔 이게 없다 — 팀 액션이 최상위라서).
 */
export interface PersonalActionDetail {
  /** BE 자동증가 정수 PK. */
  id: number;
  name: string;
  description: string;
  /** 소속 팀 — **개인 액션은 없다**(BE `ActionTypeShapePolicy` — PERSONAL은 팀을 못 가짐). 없으면 화면이 칩을 안 그린다. */
  team?: string;
  projectId: number;
  /** 프로젝트 태그 — 참조 조회 실패 시 없다. 없으면 태그 칩을 안 그린다(빈 칩 금지). */
  projectTag?: string;
  /** 담당자 이름 — 미지정이면 없다. 화면은 그때 "담당자 미정"이라 적는다(WORKFLOW.md §3-1-A). */
  assigneeName?: string;
  /** 본인 역할 — "프론트엔드"·"백엔드" 등. Leader면 "팀장". 역할 미지정이면 없음. */
  assigneeRoleLabel?: string;
  /**
   * 이 개인 액션이 나온 회의 — **수동으로 추가한 액션(`POST /api/actions` 예외 경로)엔 없다**
   * (2026-08-11, 실 API 대조 확인). 클릭 시 `/app/meeting/:id`로 이동(2026-08-11, 회의 상세
   * 라우트가 생겨 링크 추가).
   */
  sourceMeeting?: {
    id: number;
    title: string;
    /** ISO datetime */
    scheduledAt: string;
  };
  /**
   * 상위 팀 액션 — **수동으로 추가한 액션엔 없다**(같은 이유, 2026-08-11 확인).
   * 클릭 시 `/app/projects/:projectId/team/:teamActionId`로 이동.
   */
  parentTeamAction?: {
    id: number;
    name: string;
    team: string;
    /** 마감일 `YYYY-MM-DD` */
    dueDate: string;
  };
}

/**
 * 내 액션(`/app/my/actions`) 목록 한 줄 — 리스트 전용이라 상세 화면의 회의·상위 팀 액션
 * 정보는 없다. 제목·태그·팀명·상태·마감일·세부 설명 한 줄만 있으면 된다.
 */
export interface MyActionListItem {
  id: number;
  title: string;
  description: string;
  team: string;
  projectId: number;
  projectName: string;
  projectTag: string;
  /** 작업 시작일 `YYYY-MM-DD` — 지연 판정에는 안 쓰지만(`isDelayed`는 마감일만 본다) 계약은 갖춰 둔다. */
  startDate: string;
  /** 마감일 `YYYY-MM-DD` */
  dueDate: string;
  status: ActionStatus;
}

/** 팀 액션 관리(`/team/action`) 타임라인의 팀 액션 한 줄. */
export interface TeamActionTimelineItem {
  id: number;
  name: string;
  /** 작업 시작일 `YYYY-MM-DD` — 타임라인 막대 왼쪽 끝 */
  startDate: string;
  /** 마감일 `YYYY-MM-DD` */
  dueDate: string;
  status: ActionStatus;
  /** 하위 개인 액션 진척 — `null`은 하위 개념 없음, 0/0은 비어 있음(BE와 같은 구분, #355) */
  childDoneCount?: number | null;
  childTotalCount?: number | null;
}

/**
 * 팀 액션 목록(`GET /api/team/actions`) 한 줄 — **평평한 UI 계약**이다.
 * ⚠️ 서버는 그룹을 안 만든다 — 페이지 단위로 평평하게 오고, 프로젝트별 묶기는 화면이
 *    지금까지 이어 붙인 전체를 대상으로 매번 다시 한다(§목록·페이지네이션). 페이지가
 *    도착할 때마다 그룹이 자랄 수 있다 — 그게 정직한 동작이다.
 */
export interface TeamActionListItem extends TeamActionTimelineItem {
  projectId: number;
  projectName: string;
  projectTag: string;
}

/**
 * 팀 액션 관리 화면 — 프로젝트별로 묶은 팀 액션 그룹.
 * ⚠️ 하위 개인 액션 진척 값은 **BE가 이미 준다**(2026-08-11 #355 반영, 2026-08-12 매퍼 수신) —
 *    게이지 UI만 남았다(#421).
 */
export interface TeamActionProjectGroup {
  projectId: number;
  projectName: string;
  projectTag: string;
  teamActions: TeamActionTimelineItem[];
}
