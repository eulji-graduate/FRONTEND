import { ACTION_STATUS, isDelayed, MEMBER_STATUS } from "@/constants/domain";
import {
  TEAM_MEMBER_FILTER,
  TEAM_MEMBER_FILTER_LABEL,
  TEAM_MEMBER_SORT,
  TEAM_MEMBER_SORT_LABEL,
  type TeamMemberFilter,
  type TeamMemberSort,
} from "@/constants/team-member";

import type { TeamMemberAction, TeamMemberStatusItem } from "./types";

export type { TeamMemberFilter, TeamMemberSort };

export const TEAM_MEMBER_SORT_TABS: { sort: TeamMemberSort; label: string }[] = [
  TEAM_MEMBER_SORT.ACTION_COUNT,
  TEAM_MEMBER_SORT.PROGRESS,
  TEAM_MEMBER_SORT.DELAYED,
].map((sort) => ({ sort, label: TEAM_MEMBER_SORT_LABEL[sort] }));

export const DEFAULT_TEAM_MEMBER_SORT: TeamMemberSort = TEAM_MEMBER_SORT.ACTION_COUNT;

/** URL의 `?sort=` 값을 안전하게 정렬로 — 모르는 값이면 기본(담당 액션 많은 순). */
export function parseTeamMemberSort(value: string | undefined): TeamMemberSort {
  return TEAM_MEMBER_SORT_TABS.find((t) => t.sort === value)?.sort ?? DEFAULT_TEAM_MEMBER_SORT;
}

export const TEAM_MEMBER_FILTER_TABS: { filter: TeamMemberFilter; label: string }[] = [
  TEAM_MEMBER_FILTER.ALL,
  TEAM_MEMBER_FILTER.ACTIVE,
  TEAM_MEMBER_FILTER.VACATION,
].map((filter) => ({ filter, label: TEAM_MEMBER_FILTER_LABEL[filter] }));

export const DEFAULT_TEAM_MEMBER_FILTER: TeamMemberFilter = TEAM_MEMBER_FILTER.ALL;

/** URL의 `?filter=` 값을 안전하게 필터로 — 모르는 값이면 기본(전체). */
export function parseTeamMemberFilter(value: string | undefined): TeamMemberFilter {
  return (
    TEAM_MEMBER_FILTER_TABS.find((t) => t.filter === value)?.filter ?? DEFAULT_TEAM_MEMBER_FILTER
  );
}

/** 그 팀원 개인 액션 완료율(%) — 액션이 없으면 0(진척 없음이 아니라 계산 불가). */
export function getMemberProgressPercent(actions: TeamMemberAction[]): number {
  if (actions.length === 0) return 0;
  const done = actions.filter((action) => action.status === ACTION_STATUS.DONE).length;
  return Math.round((done / actions.length) * 100);
}

/**
 * 지연 액션 수 — 저장 상태가 아니라 마감일로 계산한다(§도메인 상수: 파생값은 계산).
 */
export function countDelayedActions(actions: TeamMemberAction[]): number {
  return actions.filter((action) => isDelayed(action)).length;
}

export function filterTeamMembers(
  members: TeamMemberStatusItem[],
  filter: TeamMemberFilter,
): TeamMemberStatusItem[] {
  if (filter === TEAM_MEMBER_FILTER.ALL) return members;
  const status =
    filter === TEAM_MEMBER_FILTER.ACTIVE ? MEMBER_STATUS.ACTIVE : MEMBER_STATUS.VACATION;
  return members.filter((member) => member.status === status);
}

/** ⚠️ 원본 배열을 바꾸지 않는다 — 복사본을 정렬해 돌려준다. */
export function sortTeamMembers(
  members: TeamMemberStatusItem[],
  sort: TeamMemberSort,
): TeamMemberStatusItem[] {
  const sorted = [...members];
  if (sort === TEAM_MEMBER_SORT.PROGRESS) {
    sorted.sort(
      (a, b) => getMemberProgressPercent(a.actions) - getMemberProgressPercent(b.actions),
    );
  } else if (sort === TEAM_MEMBER_SORT.DELAYED) {
    sorted.sort((a, b) => countDelayedActions(b.actions) - countDelayedActions(a.actions));
  } else {
    sorted.sort((a, b) => b.actions.length - a.actions.length);
  }
  return sorted;
}
