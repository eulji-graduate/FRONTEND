import {
  DEFAULT_PROJECT_DETAIL_TAB,
  DEFAULT_PROJECT_SORT,
  DEFAULT_TEAM_ACTION_DETAIL_TAB,
  PROJECT_DETAIL_TAB,
  PROJECT_DETAIL_TAB_LABEL,
  PROJECT_SORT,
  PROJECT_STATUS,
  PROJECT_STATUS_LABEL,
  type ProjectDetailTab,
  type ProjectSort,
  type ProjectStatus,
  TEAM_ACTION_DETAIL_TAB,
  TEAM_ACTION_DETAIL_TAB_LABEL,
  type TeamActionDetailTab,
} from "@/constants/domain";

import type { ProjectListItem } from "./types";

/** 목록 위에 오는 상태 필터 탭 — 값·라벨은 도메인 상수에서 온다(라벨 하드코딩 금지). */
export const PROJECT_FILTER_TABS: { status: ProjectStatus; label: string }[] = [
  { status: PROJECT_STATUS.TODO, label: PROJECT_STATUS_LABEL[PROJECT_STATUS.TODO] },
  { status: PROJECT_STATUS.IN_PROGRESS, label: PROJECT_STATUS_LABEL[PROJECT_STATUS.IN_PROGRESS] },
  { status: PROJECT_STATUS.DONE, label: PROJECT_STATUS_LABEL[PROJECT_STATUS.DONE] },
];

/** 기본 탭 — 피그마에서 활성인 '진행중'. */
export const DEFAULT_PROJECT_STATUS: ProjectStatus = PROJECT_STATUS.IN_PROGRESS;

/**
 * 담당 부서 라벨을 몇 개까지 노출하는지 — 나머지는 `+N`.
 *
 * ⚠️ **2에서 3으로 올렸다**(2026-08-10). 목록이 표로 바뀌면서 참여 팀이 자기 열을 갖게 돼
 *    자리가 생겼는데, 둘만 보이니 팀이 셋인 프로젝트는 마지막 팀이 늘 `+1` 뒤에 숨었다 —
 *    마우스를 올려야 보이는 값은 훑을 때 없는 값이다.
 * ⚠️ 넷부터는 여전히 `+N`이다. 열 폭이 셋까지만 감당한다(넷을 넣으면 이름이 잘린다).
 */
export const MAX_VISIBLE_DEPARTMENTS = 3;

/** URL의 `?status=` 값을 안전하게 상태로 — 모르는 값이면 기본 탭. */
export function parseProjectStatus(value: string | undefined): ProjectStatus {
  return PROJECT_FILTER_TABS.find((tab) => tab.status === value)?.status ?? DEFAULT_PROJECT_STATUS;
}

/** URL의 `?sort=` 값을 안전하게 정렬 기준으로 — 모르는 값이면 기본(마감 임박순). */
export function parseProjectSort(value: string | undefined): ProjectSort {
  return Object.values(PROJECT_SORT).find((sort) => sort === value) ?? DEFAULT_PROJECT_SORT;
}

/** 정렬 적용(불변) — 서버가 목록에 얹는다. 순수 함수라 그대로 테스트한다. */
export function sortProjects(list: ProjectListItem[], sort: ProjectSort): ProjectListItem[] {
  const sorted = [...list];
  switch (sort) {
    case PROJECT_SORT.NAME:
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    case PROJECT_SORT.DUE_ASC:
    default:
      return sorted.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }
}

/**
 * 진척율(%) — 액션이 없으면 0. 파생값이라 저장하지 않고 계산한다.
 * ⚠️ **여기가 진척율의 유일한 구현이다.** BE `ProjectSummaryResponse.progressPct`(소수)는 안
 *    쓴다 — 표시 규칙(반올림·소수점 없음)이 FE 몫이고 목 경로에도 같은 숫자가 필요하다
 *    (`project/mapper.ts`의 `toProjectListItem` 위 주석 참고).
 * ⚠️ **분자·분모 모두 개인 액션(리프) 기준이다**(docs/WORKFLOW.md §1). BE-12 배포 전에는
 *    분모가 팀 액션까지 세고 있어 진척율이 실제보다 낮게 나온다 — FE는 보정하지 않는다
 *    (어떤 액션이 세어졌는지 FE는 모른다).
 */
export function getProgressPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

/** 부서 라벨을 노출분/초과수로 가른다. `{ visible: ["개발팀","마케팅팀"], overflow: 1 }`. */
export function splitDepartments(
  departments: string[],
  max = MAX_VISIBLE_DEPARTMENTS,
): { visible: string[]; overflow: number } {
  return { visible: departments.slice(0, max), overflow: Math.max(0, departments.length - max) };
}

/** 프로젝트 상세 탭 목록 — 값·라벨은 도메인 상수에서 온다(라벨 하드코딩 금지). */
export const PROJECT_DETAIL_TABS: { tab: ProjectDetailTab; label: string }[] = [
  { tab: PROJECT_DETAIL_TAB.PLAN, label: PROJECT_DETAIL_TAB_LABEL[PROJECT_DETAIL_TAB.PLAN] },
  {
    tab: PROJECT_DETAIL_TAB.TIMELINE,
    label: PROJECT_DETAIL_TAB_LABEL[PROJECT_DETAIL_TAB.TIMELINE],
  },
];

/** URL의 `?tab=` 값을 안전하게 탭으로 — 모르는 값이면 기본(기획). */
export function parseProjectDetailTab(value: string | undefined): ProjectDetailTab {
  return PROJECT_DETAIL_TABS.find((t) => t.tab === value)?.tab ?? DEFAULT_PROJECT_DETAIL_TAB;
}

/**
 * 타임라인 탭 박스가 **넘어가면 안 되는 높이**.
 *
 * ⚠️ **고정 높이가 아니다**(2026-08-10 변경). 480으로 못박아 뒀더니 팀 액션이 넷일 때
 *    마지막 줄 아래가 **199px 비었다** — 카드는 내용만큼 자라고, 액션이 많아질 때만
 *    이 높이에서 멈춰 안에서 스크롤하는 게 맞다(대시보드 카드와 같은 정리).
 * ⚠️ 사원 대시보드는 같은 컴포넌트를 쓰되 최소 높이(`DUE_SOON_BOX_MIN_HEIGHT`)로 잡는다 —
 *    거기는 남는 세로 공간을 이 카드가 채우는 구조라 성격이 다르다.
 */
export const PROJECT_TIMELINE_BOX_MAX_HEIGHT = 480;

/** 팀 액션 상세 탭 목록 — 값·라벨은 도메인 상수에서 온다(라벨 하드코딩 금지). */
export const TEAM_ACTION_DETAIL_TABS: { tab: TeamActionDetailTab; label: string }[] = [
  {
    tab: TEAM_ACTION_DETAIL_TAB.DETAIL,
    label: TEAM_ACTION_DETAIL_TAB_LABEL[TEAM_ACTION_DETAIL_TAB.DETAIL],
  },
  {
    tab: TEAM_ACTION_DETAIL_TAB.TIMELINE,
    label: TEAM_ACTION_DETAIL_TAB_LABEL[TEAM_ACTION_DETAIL_TAB.TIMELINE],
  },
];

/** URL의 `?tab=` 값을 안전하게 탭으로 — 모르는 값이면 기본(상세). */
export function parseTeamActionDetailTab(value: string | undefined): TeamActionDetailTab {
  return (
    TEAM_ACTION_DETAIL_TABS.find((t) => t.tab === value)?.tab ?? DEFAULT_TEAM_ACTION_DETAIL_TAB
  );
}

/** 팀 액션 상세의 타임라인 탭 — 프로젝트 상세와 같은 값(같은 컴포넌트, 같은 결). */
export const TEAM_ACTION_TIMELINE_BOX_MAX_HEIGHT = PROJECT_TIMELINE_BOX_MAX_HEIGHT;
