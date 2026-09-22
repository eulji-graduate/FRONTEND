/**
 * 프로젝트 상태 — **액션과 같은 셋**이다.
 *
 * ⚠️ `TODO`가 빠져 있었다. `/app/projects` 필터 탭이 할 일·진행중·완료 셋인데
 *    상태에 `TODO`가 없으면 첫 탭이 무엇을 거르는지 말할 수 없다.
 * ⚠️ 액션과 값이 같다고 `ActionStatus`를 재사용하지 않는다 — 한쪽 정책이 바뀌면
 *    다른 쪽까지 끌려간다.
 */
export const PROJECT_STATUS = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
} as const;
export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  TODO: "할 일",
  IN_PROGRESS: "진행중",
  DONE: "완료",
};

/**
 * 프로젝트 목록 정렬 기준. 화면엔 한글 라벨, 코드엔 영문 상수.
 * ⚠️ '마감 늦은순'은 '마감 임박순'과 결이 겹쳐 두지 않는다.
 */
export const PROJECT_SORT = {
  DUE_ASC: "DUE_ASC",
  NAME: "NAME",
} as const;
export type ProjectSort = (typeof PROJECT_SORT)[keyof typeof PROJECT_SORT];

export const PROJECT_SORT_LABEL: Record<ProjectSort, string> = {
  DUE_ASC: "마감 임박순",
  NAME: "이름순",
};

/** 기본 정렬 — 마감 임박순(스펙). */
export const DEFAULT_PROJECT_SORT: ProjectSort = PROJECT_SORT.DUE_ASC;

/** 프로젝트 상세(`/app/projects/:projectId`) 탭. 화면엔 한글 라벨, 코드엔 영문 상수. */
export const PROJECT_DETAIL_TAB = {
  PLAN: "plan",
  TIMELINE: "timeline",
} as const;
export type ProjectDetailTab = (typeof PROJECT_DETAIL_TAB)[keyof typeof PROJECT_DETAIL_TAB];

export const PROJECT_DETAIL_TAB_LABEL: Record<ProjectDetailTab, string> = {
  plan: "기획",
  timeline: "타임라인",
};

/** 기본 탭 — 기획은 쿼리 없이도 기본으로 뜬다(`?tab=` 안 실림). */
export const DEFAULT_PROJECT_DETAIL_TAB: ProjectDetailTab = PROJECT_DETAIL_TAB.PLAN;

/** 팀 액션 상세(`/app/projects/:projectId/team/:teamActionId`) 탭. */
export const TEAM_ACTION_DETAIL_TAB = {
  DETAIL: "detail",
  TIMELINE: "timeline",
} as const;
export type TeamActionDetailTab =
  (typeof TEAM_ACTION_DETAIL_TAB)[keyof typeof TEAM_ACTION_DETAIL_TAB];

export const TEAM_ACTION_DETAIL_TAB_LABEL: Record<TeamActionDetailTab, string> = {
  detail: "상세",
  timeline: "타임라인",
};

/** 기본 탭 — 상세는 쿼리 없이도 기본으로 뜬다(`?tab=` 안 실림). */
export const DEFAULT_TEAM_ACTION_DETAIL_TAB: TeamActionDetailTab = TEAM_ACTION_DETAIL_TAB.DETAIL;

/** ProjectTag 최대 길이(백엔드 협의 확정) — 영문 대문자만 허용. */
export const PROJECT_TAG_MAX_LENGTH = 6;

/** 세부 설명 최대 길이 — 백엔드 `varchar(255)` 제한을 프론트에서도 그대로 지킨다. */
export const PROJECT_DESCRIPTION_MAX_LENGTH = 255;

/**
 * ⚠️ 목 데이터 — BE 연동 전. 회사 팀 목록(팀·역할·권한 스키마의 `Team`).
 * 실제로는 `GET /companies/me/teams` 같은 API로 내려받는다.
 */
export const COMPANY_TEAM_NAMES = ["개발팀", "마케팅팀", "디자인팀", "전략기획팀"] as const;
