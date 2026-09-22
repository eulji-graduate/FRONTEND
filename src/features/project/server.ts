import {
  DEFAULT_PROJECT_SORT,
  PROJECT_STATUS,
  type ProjectSort,
  type ProjectStatus,
} from "@/constants/domain";
import { COMPANY_TEAM_NAMES } from "@/constants/project";
import {
  type BeActionSummary,
  type BeTeamActionDetail,
  toTeamActionDetail,
  toTeamActionPersonalItem,
} from "@/features/action/mapper";
import { requireAccessToken } from "@/features/auth/session";
import { ApiError, serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { paginate, type PaginatedResult } from "@/lib/paginate";
import { isMock } from "@/mocks/config";

import { sortProjects } from "./lib";
import type {
  BePageResponse,
  BeProjectDetail,
  BeProjectSummary,
  BeProjectTimelineItem,
} from "./mapper";
import { toProjectDetail, toProjectListItem, toProjectTeamAction } from "./mapper";
import { TOP_LEVEL_PROJECTS } from "./mock/projects";
import {
  TEAM_ACTION_DETAIL_MOCK,
  TEAM_ACTION_PERSONAL_ITEMS_MOCK,
} from "./mock/team-action-detail";
import { PROJECT_ATTACHMENT_MOCK, PROJECT_TEAM_ACTIONS_MOCK } from "./mock/team-actions";
import type {
  ProjectDetail,
  ProjectListItem,
  ProjectTeamAction,
  TeamActionDetail,
  TeamActionPersonalItem,
} from "./types";

/** [확인] `TeamController` 응답 — `teamId`·`name`만 쓴다(company/mapper.ts의 `BeTeam`과 같은 shape). */
interface BeTeamOption {
  teamId: number;
  name: string;
}

/**
 * 회사 팀 목록 — 이름↔id 변환에 쓴다. 상세 응답(`teamIds`)을 이름으로 보여줄 때,
 * 생성 폼이 고른 이름을 id로 되돌릴 때 둘 다 여기서 가져온 값을 쓴다.
 * ⚠️ **이름 중복이 없다는 전제.** 같은 이름의 팀이 둘 생기면 이 매핑이 먼저 잡힌 쪽으로 뭉갠다 —
 *    지금 팀 이름 정책상 중복을 안 만들지만, 생기면 여기부터 깨진다.
 */
async function getTeamOptions(accessToken: string): Promise<BeTeamOption[]> {
  return serverApi<BeTeamOption[]>(ep.teams(), { accessToken });
}

/**
 * 이름에 검색어가 들어가는지(대소문자·공백 무시). 검색어가 없으면 항상 통과.
 * ⚠️ **목 전용이다.** 실연동에선 BE가 거른다(`keyword` 파라미터 — 프로젝트명 대소문자 무시
 *    부분일치, [확인] `ProjectController.list`). 규칙을 같은 뜻으로 맞춰 둬야 목으로 본
 *    화면과 연동한 화면이 다르지 않다.
 */
function matchesKeyword(project: ProjectListItem, keyword?: string): boolean {
  const q = keyword?.trim().toLowerCase();
  if (!q) return true;
  return project.name.toLowerCase().includes(q);
}

/** 한 화면에 그리는 줄 수 — BE 목록 기본값과 같다([확인] `ProjectController.list`의 `size` 기본 20). */
export const PROJECT_PAGE_SIZE = 20;

/**
 * UI 정렬 상수 → BE `sort`/`order` 한 쌍.
 *
 * ⚠️ [확인] `ProjectController.list` — `sort=dueDate|createdAt|name`, `order=asc|desc`.
 *    `name`은 2026-08-13에 붙었다(커밋 `9bd9c010`) — 그 전엔 이름순을 서버가 못 해서
 *    이 화면만 전량을 받아 화면에서 정렬하고 있었다.
 * ⚠️ **받아 와서 다시 정렬하지 않는다.** 페이지 단위로 오는 목록을 화면이 또 정렬하면
 *    페이지 경계에서 차례가 어긋난다(`action/server.ts`와 같은 규칙).
 * ⚠️ 그래서 **한글 정렬이 BE의 DB 콜레이션을 따른다** — `localeCompare("ko")`와 미세하게
 *    다를 수 있다. 두 벌로 맞추려 들면 반드시 어긋나므로 서버 한쪽에 맡긴다.
 */
const BE_PROJECT_SORT: Record<ProjectSort, { sort: "dueDate" | "name"; order: "asc" | "desc" }> = {
  DUE_ASC: { sort: "dueDate", order: "asc" },
  NAME: { sort: "name", order: "asc" },
};

/** URL 세그먼트(문자열)로 온 id를 정수로 바꿔 찾는다 — 숫자가 아니면 못 찾은 것과 같다. */
function findProjectById(id: string): ProjectListItem | undefined {
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) return undefined;
  return TOP_LEVEL_PROJECTS.find((p) => p.id === numericId);
}

export interface ProjectListQuery {
  status: ProjectStatus;
  keyword?: string;
  sort?: ProjectSort;
}

/**
 * 프로젝트 목록(`/app/projects`) 한 페이지 — **자르기·거르기·정렬을 전부 서버가 한다.**
 *
 * ⚠️ `size: 9999` 전량 수신을 걷어냈다(2026-08-13, #443). 화면만 잘릴 뿐 10만 건을 다
 *    받아 오는 모양이었다(CLAUDE.md §목록·페이지네이션). BE가 `keyword`·`sort=name`을
 *    받게 되면서(커밋 `9bd9c010`) 마지막으로 막고 있던 자리가 풀렸다 — 내 액션·팀 액션은
 *    #417에서 이미 같은 모양으로 옮겼고, 여기도 **같은 훅·같은 계약**(`PaginatedResult`)을 쓴다.
 * ⚠️ 첫 페이지는 서버 컴포넌트가 렌더하고, 2페이지부터 화면이 이어 붙인다(§핵심 4원칙 ①).
 * ⚠️ `page`는 0-base다(BE 표준 확정, 2026-08-10).
 */
export async function getProjectsPage(
  { status, keyword, sort = DEFAULT_PROJECT_SORT }: ProjectListQuery,
  page: number,
  pageSize: number = PROJECT_PAGE_SIZE,
): Promise<PaginatedResult<ProjectListItem>> {
  if (isMock) {
    const filtered = TOP_LEVEL_PROJECTS.filter(
      (project) => project.status === status && matchesKeyword(project, keyword),
    );
    // 서버가 정렬한 차례로 굳힌 뒤 자른다 — 연동해도 화면이 안 바뀐다.
    return paginate(sortProjects(filtered, sort), page, pageSize);
  }

  /*
    [확인] BE `global/response/PageResponse.java` — `content`·`page`·`size`·`totalElements`·
    `totalPages`·`hasNext`. 목록 3종 공용 봉투라 사원 목록의 `MemberPageResponse`와 필드명이
    같지 않다(그쪽은 `totalCount`가 아니라 `totalElements`인 것까지 같지만 타입이 따로다).
    ⚠️ `keyword`는 **빈 문자열을 안 보낸다** — 보내면 BE가 "빈 문자열로 검색"을 하러 갈지
       무시할지가 계약에 없다. 값이 없으면 파라미터 자체를 빼는 게 `toQuery`의 규칙이다.
  */
  const accessToken = await requireAccessToken();
  const trimmed = keyword?.trim();
  const response = await serverApi<BePageResponse<BeProjectSummary>>(
    ep.projects({
      keyword: trimmed ? trimmed : undefined,
      status,
      ...BE_PROJECT_SORT[sort],
      page: Math.max(0, page),
      size: pageSize,
    }),
    { accessToken },
  );

  return {
    items: response.content.map(toProjectListItem),
    page: response.page,
    totalPages: response.totalPages,
    totalCount: response.totalElements,
  };
}

/**
 * 프로젝트 상세(`/app/projects/:projectId`)의 기획 탭 — 목록(`ProjectListItem`)에서 파생한다.
 * 이름·설명·마감일·참여 팀은 목록과 같은 소스라 여기서 새로 안 만든다. 못 찾으면 `null`(호출부가 404).
 * ⚠️ **id로 찾는다, 태그가 아니다** — URL에 태그를 그대로 노출하지 않는다(2026-08-06 확정).
 */
export async function getProjectDetail(id: string): Promise<ProjectDetail | null> {
  if (isMock) {
    const project = findProjectById(id);
    if (!project) return null;
    const attachmentName = PROJECT_ATTACHMENT_MOCK[project.tag];
    return {
      id: project.id,
      tag: project.tag,
      /* ⚠️ 목 상세는 목 목록에서 파생한다 — 목록의 `tagColor`(폼이 저장한 값)를 그대로 옮긴다.
         해시로 다시 배정하면 목록과 상세의 색이 어긋난다(§정직한 목업). */
      tagColor: project.tagColor,
      name: project.name,
      description: project.description,
      dueDate: project.dueDate,
      teamNames: project.departments,
      attachments: attachmentName ? [{ id: 1, fileName: attachmentName, fileSize: 0 }] : [],
    };
  }

  const numericId = Number(id);
  if (!Number.isInteger(numericId)) return null;

  const accessToken = await requireAccessToken();
  let detail: BeProjectDetail;
  try {
    detail = await serverApi<BeProjectDetail>(ep.project(numericId), { accessToken });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }

  // ⚠️ 상세 응답엔 teamIds만 온다 — 이름으로 보여주려고 팀 목록을 한 번 더 불러 매핑한다.
  const teamOptions = await getTeamOptions(accessToken);
  const nameById = new Map(teamOptions.map((team) => [team.teamId, team.name]));
  const teamNames = detail.teamIds.map((teamId) => nameById.get(teamId) ?? `팀 #${teamId}`);

  return toProjectDetail(detail, teamNames);
}

/** 프로젝트 상세의 타임라인 탭 — 이 프로젝트에 속한 팀 액션 전체(여러 팀이 하나의 축에 함께). */
export async function getProjectTeamActions(id: string): Promise<ProjectTeamAction[]> {
  if (isMock) {
    const project = findProjectById(id);
    return project ? (PROJECT_TEAM_ACTIONS_MOCK[project.tag] ?? []) : [];
  }

  const numericId = Number(id);
  if (!Number.isInteger(numericId)) return [];

  const accessToken = await requireAccessToken();
  const items = await serverApi<BeProjectTimelineItem[]>(ep.projectTimeline(numericId), {
    accessToken,
  });
  return items.map(toProjectTeamAction);
}

/** 팀 액션 상세(`/app/projects/:projectId/team/:teamActionId`)의 상세 탭. 못 찾으면 `null`(호출부가 404). */
export async function getTeamActionDetail(teamActionId: string): Promise<TeamActionDetail | null> {
  if (isMock) {
    const numericId = Number(teamActionId);
    if (!Number.isInteger(numericId)) return null;
    return TEAM_ACTION_DETAIL_MOCK[numericId] ?? null;
  }

  const numericId = Number(teamActionId);
  if (!Number.isInteger(numericId)) return null;

  const accessToken = await requireAccessToken();
  try {
    const detail = await serverApi<BeTeamActionDetail>(ep.teamAction(numericId), { accessToken });
    return toTeamActionDetail(detail);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** 팀 액션 상세의 타임라인 탭 — 이 팀 액션에 속한 개인 액션 전체(담당자별 한 행). */
export async function getTeamActionPersonalItems(
  teamActionId: string,
): Promise<TeamActionPersonalItem[]> {
  if (isMock) {
    const numericId = Number(teamActionId);
    if (!Number.isInteger(numericId)) return [];
    return TEAM_ACTION_PERSONAL_ITEMS_MOCK[numericId] ?? [];
  }

  const numericId = Number(teamActionId);
  if (!Number.isInteger(numericId)) return [];

  // ⚠️ 이 함수는 실연동 준비만 끝난 상태다 — 유일한 호출부(팀 액션 상세 페이지)가
  //    `getTeamActionDetail`(아래, 필드 부족으로 여전히 미구현) 뒤에 있어서 지금은 화면에서
  //    닿지 않는다. 상세 필드가 채워지면 그 페이지를 여는 순간 바로 같이 동작한다.
  const accessToken = await requireAccessToken();
  const items = await serverApi<BeActionSummary[]>(ep.teamActionTimeline(numericId), {
    accessToken,
  });
  return items.map(toTeamActionPersonalItem);
}

/** 프로젝트 생성 폼의 "참여 팀" 선택지 — 회사 전체 팀 목록. */
export async function getCompanyTeamOptions(): Promise<string[]> {
  if (isMock) return [...COMPANY_TEAM_NAMES];

  const accessToken = await requireAccessToken();
  const teams = await getTeamOptions(accessToken);
  return teams.map((team) => team.name);
}

/**
 * 상태별 프로젝트 수 — 필터 탭에 붙는 배지. 검색어가 있으면 그 결과 안에서 센다(탭·목록이 같은 기준).
 *
 * ⚠️ **전체 목록을 다시 받아 세지 않는다**(2026-08-13 고침). 전에는 이 화면이 렌더될 때마다
 *    `size: 9999`로 **전체 목록을 두 번** 받았다 — 한 번은 목록, 한 번은 이 배지. BE엔 상태별
 *    집계 엔드포인트가 없으므로, 상태마다 `size=1`로 불러 **`totalElements`만** 읽는다.
 *    돌아오는 본문은 세 번 합쳐도 한 줄뿐이다.
 * ⚠️ 세 번을 **병렬로** 보낸다 — 차례로 보내면 이 배지 하나가 화면 전체를 세 번의 왕복만큼
 *    늦춘다.
 * ⚠️ 배지 숫자와 목록이 **같은 조건**을 봐야 한다(같은 `keyword`) — 한쪽만 검색어를 빼면
 *    `진행중 4`라고 적힌 탭을 눌렀는데 2건이 나온다.
 */
export async function getProjectStatusCounts(
  keyword?: string,
): Promise<Record<ProjectStatus, number>> {
  if (isMock) {
    const counts: Record<ProjectStatus, number> = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    for (const project of TOP_LEVEL_PROJECTS) {
      if (matchesKeyword(project, keyword)) counts[project.status] += 1;
    }
    return counts;
  }

  const accessToken = await requireAccessToken();
  const trimmed = keyword?.trim();
  const statuses = [PROJECT_STATUS.TODO, PROJECT_STATUS.IN_PROGRESS, PROJECT_STATUS.DONE] as const;

  const totals = await Promise.all(
    statuses.map(async (status) => {
      const response = await serverApi<BePageResponse<BeProjectSummary>>(
        ep.projects({ keyword: trimmed ? trimmed : undefined, status, page: 0, size: 1 }),
        { accessToken },
      );
      return [status, response.totalElements] as const;
    }),
  );

  const counts: Record<ProjectStatus, number> = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  for (const [status, total] of totals) counts[status] = total;
  return counts;
}

/**
 * 팀 이름 → id 변환 — 생성 폼이 이름으로 고른 값을 BE `teamIds`로 바꿀 때 쓴다.
 * ⚠️ 화면 밖에서 부르지 않는다(actions.ts 전용) — `getTeamOptions`는 server-only 모듈이라
 *    Server Action에서 직접 못 부르길래 이 파일이 대신 감싼다.
 */
export async function resolveTeamIds(accessToken: string, teamNames: string[]): Promise<number[]> {
  const teams = await getTeamOptions(accessToken);
  const idByName = new Map(teams.map((team) => [team.name, team.teamId]));
  return teamNames.map((name) => idByName.get(name)).filter((id): id is number => id !== undefined);
}
