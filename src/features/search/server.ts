import "server-only";

import { requireAccessToken } from "@/features/auth/session";
import type { BePageResponse, BeProjectSummary } from "@/features/project/mapper";
import { serverApi } from "@/lib/api";
import { todayIso } from "@/lib/date";
import { ep } from "@/lib/endpoints";
import { isMock } from "@/mocks/config";

import { categoryOf, textIncludes } from "./lib";
import type { BeSearchResponse } from "./mapper";
import { toProjectFilterOption, toSearchResults } from "./mapper";
import {
  SEARCH_MOCK_ACTIONS,
  SEARCH_MOCK_MEETINGS,
  SEARCH_MOCK_PEOPLE,
  SEARCH_MOCK_PROJECTS,
  SEARCH_MOCK_RECENTLY_VIEWED,
} from "./mock/data";
import type {
  MockSearchRecord,
  ProjectBrowseItem,
  SearchHome,
  SearchHomeSection,
  SearchQuery,
  SearchResultItem,
  SearchResults,
} from "./types";
import { SEARCH_HOME_SECTION } from "./types";

/** 검색 — 격리막(CLAUDE.md). 연동할 때 고칠 곳은 이 파일과 매퍼뿐이고 컴포넌트는 건드리지 않는다. */

function mapProjectsForBrowse(): ProjectBrowseItem[] {
  return SEARCH_MOCK_PROJECTS.map((project) => ({
    id: project.id,
    name: project.name,
    tag: project.tag,
    meetingCount: project.meetingCount,
  }));
}

/**
 * 프로젝트 목록을 한 번에 받는 크기.
 *
 * ⚠️ **드롭다운·둘러보기는 전부를 놓고 골라야 한다** — 잘라 받으면 뒤쪽 프로젝트가 목록에
 *    아예 안 떠서 "그 프로젝트로는 못 좁힌다"가 된다. 다른 화면(`project/server.ts`·
 *    `board/server.ts`)이 이미 쓰는 방식과 같다(BE에 "전체" 파라미터가 없다).
 */
const PROJECT_PAGE_SIZE = 9999;

/**
 * 랜딩·필터가 함께 쓰는 프로젝트 목록 — `GET /api/projects`(전 구성원 공개, `PageResponse` 봉투).
 * [확인] `project/presentation/api/ProjectController.list` (2026-08-13 실코드 대조).
 */
async function fetchProjectOptions(accessToken: string): Promise<ProjectBrowseItem[]> {
  const page = await serverApi<BePageResponse<BeProjectSummary>>(
    ep.projects({ size: PROJECT_PAGE_SIZE }),
    { accessToken },
  );
  return page.content.map(toProjectFilterOption);
}

/**
 * 검색어가 없을 때(랜딩)의 화면 — 최근 본 항목·둘러보기 목록.
 * ⚠️ 최근 검색어는 이 조회에 없다 — 브라우저 로컬 저장소에서 나온다(`types.ts` 참고).
 *
 * ⚠️ **실서버에서 채울 수 있는 칸은 프로젝트뿐이다**(2026-08-13, #422).
 *    - 최근 본 항목: `GET /api/v1/search/overview`가 **BE에 없다** — 예전엔 그걸 불러서
 *      랜딩이 **404로 통째로 죽었다.** 검색어를 치기도 전에 에러 화면이었다.
 *    - 사람: 회사 명부(`GET /api/members`)는 **OWNER·ADMIN 전용**이라(§권한 ①축) 사원·팀장이
 *      부르면 403이다. 권한 없는 사람의 화면을 살리려고 부를 수 있는 API가 아니다.
 *    못 채우는 칸은 **빈 배열이 아니라 `unavailable`로 알린다** — 빈 화면은 "본 게 없다"는
 *    뜻이 되어 버려 사용자가 자기 탓으로 읽는다(§정직성).
 */
export async function getSearchHome(): Promise<SearchHome> {
  if (isMock) {
    return {
      recentlyViewed: SEARCH_MOCK_RECENTLY_VIEWED,
      projects: mapProjectsForBrowse(),
      people: SEARCH_MOCK_PEOPLE.map((person) => ({
        id: person.id,
        name: person.name,
        authority: person.authority,
      })),
      unavailable: [],
    };
  }

  const accessToken = await requireAccessToken();
  const projects = await fetchProjectOptions(accessToken);

  const unavailable: SearchHomeSection[] = [
    SEARCH_HOME_SECTION.RECENTLY_VIEWED,
    SEARCH_HOME_SECTION.PEOPLE,
  ];

  return { recentlyViewed: [], projects, people: [], unavailable };
}

/**
 * 결과 화면의 프로젝트 필터 목록.
 *
 * ⚠️ **`getSearchHome()`을 대신 쓰지 않는다.** 그건 랜딩이 쓰는 칸까지 같이 들고 오는 조회라,
 *    거기가 실패하면 결과 화면까지 같이 죽는다 — 결과 화면이 필요한 건 필터 목록뿐이다.
 * ⚠️ 검색 전용 프로젝트 API는 없다. **회의·액션이 매달린 그 프로젝트 목록 그대로**를 쓴다 —
 *    필터가 실제 데이터와 다른 목록을 보여주면 고른 값에 걸리는 결과가 없다(#422).
 */
export async function getSearchProjects(): Promise<ProjectBrowseItem[]> {
  if (isMock) return mapProjectsForBrowse();

  const accessToken = await requireAccessToken();
  return fetchProjectOptions(accessToken);
}

/**
 * 마감·회의 일시가 이 기간 **안**에 드는지 — 기간이 없는 값(프로젝트·사람)은 항상 통과시킨다.
 * ⚠️ **미래 날짜는 포함하지 않는다.** "최근 N일"은 지난 일을 묻는 말이라, 아직 안 지난
 *    마감일까지 걸리면 "최근"이라는 말과 어긋난다.
 */
function isoToUtcMs(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [, y, m, d] = match;
  const yNum = Number(y);
  const mNum = Number(m);
  const dNum = Number(d);
  const ms = Date.UTC(yNum, mNum - 1, dNum);
  const date = new Date(ms);
  if (
    date.getUTCFullYear() !== yNum ||
    date.getUTCMonth() !== mNum - 1 ||
    date.getUTCDate() !== dNum
  ) {
    return null;
  }
  return ms;
}

function withinPeriod(iso: string, days: number | null, todayIsoValue: string): boolean {
  if (days === null) return true;
  const target = isoToUtcMs(iso);
  const today = isoToUtcMs(todayIsoValue);
  if (target === null || today === null) return false;
  const diffDays = (today - target) / 86_400_000;
  return diffDays >= 0 && diffDays <= days;
}

const PERIOD_DAYS: Record<SearchQuery["period"], number | null> = {
  all: null,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function matchesKeyword(item: MockSearchRecord, keyword: string): boolean {
  switch (item.kind) {
    case "MEETING":
      return textIncludes(item.title, keyword) || textIncludes(item.snippet, keyword);
    case "ACTION":
      return textIncludes(item.title, keyword) || textIncludes(item.assigneeName, keyword);
    case "PROJECT":
      // ⚠️ 태그는 안 찾는다 — 화면에 안 내보내는 내부 식별자라(CLAUDE.md §도메인 상수),
      //    태그로만 걸리면 사용자는 왜 이 프로젝트가 떴는지 알 길이 없다.
      return textIncludes(item.name, keyword);
    case "PERSON":
      return (
        textIncludes(item.name, keyword) ||
        textIncludes(item.description, keyword) ||
        (item.team !== null && textIncludes(item.team, keyword))
      );
  }
}

function matchesProject(item: MockSearchRecord, projectTag: string | null): boolean {
  if (!projectTag) return true;
  switch (item.kind) {
    case "MEETING":
    case "ACTION":
      return item.projectTag === projectTag;
    case "PROJECT":
      return item.tag === projectTag;
    case "PERSON":
      // 사람은 특정 프로젝트에 속하지 않는다 — 프로젝트 필터를 걸어도 그대로 둔다
      return true;
  }
}

function matchesPeriod(
  item: MockSearchRecord,
  period: SearchQuery["period"],
  todayIsoValue: string,
): boolean {
  const days = PERIOD_DAYS[period];
  if (item.kind === "MEETING") return withinPeriod(item.meetingDate, days, todayIsoValue);
  if (item.kind === "ACTION") return withinPeriod(item.dueDate, days, todayIsoValue);
  return true;
}

function allMockRecords(): MockSearchRecord[] {
  return [
    ...SEARCH_MOCK_MEETINGS,
    ...SEARCH_MOCK_ACTIONS,
    ...SEARCH_MOCK_PROJECTS,
    ...SEARCH_MOCK_PEOPLE,
  ];
}

/**
 * 목의 종류별 상세 레코드 → 실서버와 같은 평평한 결과 모양.
 * ⚠️ 실서버(`GET /search`)가 종류별 상세 필드(담당자·회의/액션 건수 등)를 안 주므로,
 *    목도 **같은 만큼만** 보여준다 — 목이 실서버보다 더 자세하면 연동 전후 화면이 달라진다.
 */
function toSearchResultItem(record: MockSearchRecord): SearchResultItem {
  switch (record.kind) {
    case "MEETING":
      return {
        kind: "MEETING",
        id: record.id,
        title: record.title,
        snippet: record.snippet,
        /*
          ⚠️ **태그다**(2026-08-13 고침 — 전에는 `projectName`이었다). 실서버 매퍼가 BE의
             `project` 객체에서 `tag`를 꺼내 쓰는데(§search/mapper) 목만 이름을 넣고 있어,
             **같은 줄이 목과 실서버에서 다른 값을 보여줬다.**
          ⚠️ 이름이 아니라 태그로 맞춘 이유: 이 값이 결과 줄의 **팔레트 키**로도 쓰여
             (`pickPaletteColor`) 앱의 다른 화면(보드·회의 카드)과 같은 키여야 같은
             프로젝트가 같은 색으로 나온다(§컴포넌트 위생).
        */
        project: record.projectTag,
        date: record.meetingDate,
        role: null,
      };
    case "ACTION":
      return {
        kind: "ACTION",
        id: record.id,
        title: record.title,
        snippet: null,
        /* 액션도 프로젝트에 매여 있다 — 회의와 같은 자리에 같은 값(태그)을 채운다 */
        project: record.projectTag,
        date: record.dueDate,
        role: null,
      };
    case "PROJECT":
      return {
        kind: "PROJECT",
        id: record.id,
        title: record.name,
        snippet: null,
        project: null,
        date: null,
        role: null,
      };
    case "PERSON":
      return {
        kind: "PERSON",
        id: record.id,
        title: record.name,
        snippet: record.description,
        project: null,
        date: null,
        role: record.authority,
      };
  }
}

/*
  ⚠️ 탭 → BE `type` 매핑표(`meeting`→`MEETING` …)는 걷어냈다(2026-08-13, #422). 지금은 늘
     `type=ALL`로 부르고 탭은 매퍼가 거른다 — 이유는 `getSearchResults`의 호출부 주석에 있다.
     표만 남겨 두면 다음 사람이 "쓰라고 있는 값"으로 읽고 되돌린다.
*/

/** 오늘 기준 `days`일 전 — `Date.UTC`로만 셈해 시간대에 안 흔들린다(`lib/date.ts`와 같은 방식) */
function isoDaysBefore(to: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(to);
  if (!match) return to;

  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d) - days)).toISOString().slice(0, 10);
}

/** 기간 프리셋 → `from`/`to` — "전체 기간"은 둘 다 안 보낸다 */
function toDateRange(period: SearchQuery["period"]): { from: string | null; to: string | null } {
  const days = PERIOD_DAYS[period];
  if (days === null) return { from: null, to: null };
  const to = todayIso();
  return { from: isoDaysBefore(to, days), to };
}

/**
 * 한 번에 받아 오는 상한 — **BE가 허용하는 최대치**다(`SearchService.MAX_LIMIT`, 1~50).
 *
 * ⚠️ **51 이상을 보내면 결과가 아니라 400이 온다.** 더 받고 싶으면 BE부터 고쳐야 한다 —
 *    안 보내면 서버 기본값 20이라, 그동안 21건째부터는 볼 방법이 아예 없었다(#422).
 * ⚠️ 이 상한은 **종류마다** 걸린다(`type=ALL`이면 회의·액션·프로젝트·사람 각각 50까지).
 * ⚠️ 넓혔을 뿐 **없앤 게 아니다.** `GET /api/v1/search`에는 page 파라미터가 없어서 스크롤로
 *    이어 붙이는 방식(§목록·페이지네이션)을 못 붙인다 — 없는 페이지네이션을 지어내는 대신
 *    **잘렸으면 잘렸다고 화면이 말한다**(`SearchResults.cap`, §정직성).
 */
const SEARCH_RESULT_LIMIT = 50;

/** 검색 결과 — 카테고리 탭 숫자는 키워드·프로젝트·기간까지 반영해 센다(탭을 눌러도 숫자가 안 흔들리게). */
export async function getSearchResults(query: SearchQuery): Promise<SearchResults> {
  const keyword = query.keyword.trim();

  if (!keyword) {
    return {
      keyword,
      counts: { total: 0, meeting: 0, action: 0, project: 0, person: 0 },
      items: [],
      cap: null,
      /* 아무것도 안 물어봤으니 필터도 걸 일이 없다 — 안내를 띄울 자리가 아니다 */
      filtersApplied: true,
    };
  }

  if (isMock) {
    const today = todayIso();
    const matched = allMockRecords().filter(
      (item) =>
        matchesKeyword(item, keyword) &&
        matchesProject(item, query.projectTag) &&
        matchesPeriod(item, query.period, today),
    );

    const counts = matched.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[categoryOf(item)] += 1;
        return acc;
      },
      { total: 0, meeting: 0, action: 0, project: 0, person: 0 },
    );

    const items = (
      query.category === "all"
        ? matched
        : matched.filter((item) => categoryOf(item) === query.category)
    ).map(toSearchResultItem);

    /* 목은 전체 픽스처를 직접 거른다 — 잘릴 일도, 서버가 안 걸러 줄 일도 없다 */
    return { keyword, counts, items, cap: null, filtersApplied: true };
  }

  /*
    [확인] `GET /api/v1/search` — BE 실코드 대조(2026-08-13): `SearchController`·`SearchService`.
    정렬은 서버가 정한 순서(점수→날짜→id)를 그대로 쓴다 — 여기서 다시 정렬하지 않는다.

    ⚠️ **탭(`type`)을 실어 좁히지 않고 늘 `ALL`로 부른다.** `type`을 좁히면 서버가 **나머지
       종류의 `counts`를 0으로 내려보낸다**(`SearchService.countIfRequested`) — 회의 탭을 누른
       순간 액션·프로젝트·사람 숫자가 전부 0이 되어 **"다른 데는 결과가 없다"는 거짓말**이 된다.
       우리 계약은 "탭을 눌러도 숫자는 안 흔들린다"이므로(types.ts `SearchResults.counts`)
       전부 받아 매퍼가 탭으로 거른다. 상한이 종류마다 걸리는 덕에 **그 탭에 보이는 줄은 같다.**
    ⚠️ `tags`·`from`·`to`는 **서버가 아직 안 거른다**(SR-1). 그래도 계속 보내는 건 SR-2가
       붙는 날 호출부를 다시 안 고치려는 것이고, 안 걸린다는 사실은 화면이 밝힌다(`filtersApplied`).
  */
  const accessToken = await requireAccessToken();
  const { from, to } = toDateRange(query.period);
  const params = new URLSearchParams({
    q: keyword,
    type: "ALL",
    limit: String(SEARCH_RESULT_LIMIT),
  });
  if (query.projectTag) params.append("tags", query.projectTag);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const response = await serverApi<BeSearchResponse>(`${ep.search()}?${params}`, { accessToken });
  return toSearchResults(response, query.category);
}
