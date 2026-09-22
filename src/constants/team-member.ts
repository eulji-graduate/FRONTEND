/** 팀원 관리(`/team/members`) 정렬·필터 값 — URL `?sort=`·`?filter=`에 그대로 쓴다. */

/** 정렬 3종(WORKFLOW.md §팀원 관리). */
export const TEAM_MEMBER_SORT = {
  ACTION_COUNT: "actionCount",
  PROGRESS: "progress",
  DELAYED: "delayed",
} as const;
export type TeamMemberSort = (typeof TEAM_MEMBER_SORT)[keyof typeof TEAM_MEMBER_SORT];

export const TEAM_MEMBER_SORT_LABEL: Record<TeamMemberSort, string> = {
  actionCount: "담당 액션 많은 순",
  progress: "진척 낮은 순",
  delayed: "지연 있는 순",
};

/** 필터 3종 — 재직/휴직만 있다(퇴사자는 팀 로스터에서 이미 빠진 상태로 온다). */
export const TEAM_MEMBER_FILTER = {
  ALL: "all",
  ACTIVE: "active",
  VACATION: "vacation",
} as const;
export type TeamMemberFilter = (typeof TEAM_MEMBER_FILTER)[keyof typeof TEAM_MEMBER_FILTER];

export const TEAM_MEMBER_FILTER_LABEL: Record<TeamMemberFilter, string> = {
  all: "전체",
  active: "재직",
  vacation: "휴직",
};
