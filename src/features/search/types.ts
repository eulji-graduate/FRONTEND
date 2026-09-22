import type { Authority } from "@/constants/domain";

/**
 * 검색 — 격리막의 UI 계약(CLAUDE.md §Mock 격리막).
 * 컴포넌트는 이 타입만 알고, 목/실서버 분기는 `server.ts`가 끝낸다.
 */

export const SEARCH_KIND = {
  MEETING: "MEETING",
  ACTION: "ACTION",
  PROJECT: "PROJECT",
  PERSON: "PERSON",
} as const;
export type SearchKind = (typeof SEARCH_KIND)[keyof typeof SEARCH_KIND];

export const SEARCH_KIND_LABEL: Record<SearchKind, string> = {
  MEETING: "회의",
  ACTION: "액션",
  PROJECT: "프로젝트",
  PERSON: "사람",
};

export interface SearchMeetingResult {
  kind: "MEETING";
  id: number;
  title: string;
  /** 검색어가 걸린 자리를 보여주는 발췌 — 요약의 한 조각 */
  snippet: string;
  projectName: string;
  projectTag: string;
  /** `YYYY-MM-DD` */
  meetingDate: string;
}

export interface SearchActionResult {
  kind: "ACTION";
  id: number;
  title: string;
  assigneeId: number;
  assigneeName: string;
  /** `YYYY-MM-DD` */
  dueDate: string;
  projectTag: string;
}

export interface SearchProjectResult {
  kind: "PROJECT";
  id: number;
  name: string;
  tag: string;
  meetingCount: number;
  actionCount: number;
}

export interface SearchPersonResult {
  kind: "PERSON";
  id: number;
  name: string;
  authority: Authority;
  team: string | null;
  /** 그 사람을 설명하는 한 줄 — 최근 담당한 일 */
  description: string;
}

/**
 * 목에서만 쓰는 종류별 상세 레코드 — 필터링(`server.ts`의 mock 분기)에 쓴다.
 * ⚠️ **공개 계약이 아니다.** `GET /search`가 실제로 주는 건 훨씬 적은 필드뿐이라
 *    (`SearchResultItem` 참고), 목이든 실서버든 화면에는 그 평평한 모양만 나간다.
 */
export type MockSearchRecord =
  SearchMeetingResult | SearchActionResult | SearchProjectResult | SearchPersonResult;

/**
 * 검색 결과 한 건 — `GET /search`의 `results[]`(`{type, id, title, snippet, project, date,
 * role, score}`)를 그대로 따른다.
 *
 * ⚠️ **종류별 상세 필드가 없다**(담당자 이름·마감일 라벨·회의/액션 건수 등). BE가 종류를 가리지
 *    않는 평평한 모양으로 내려주므로, 화면이 못 받는 값을 지어내지 않는다(§정직성).
 * ⚠️ `project`는 표시용 문구로 **가정**한다 — 필드 shape 미확정(BE 실코드 미대조, §연동 검증).
 */
export interface SearchResultItem {
  kind: SearchKind;
  id: number;
  title: string;
  /** 검색어가 걸린 발췌 — 없으면 `null`(회의 요약이 아직 없는 경우 등) */
  snippet: string | null;
  /** 소속 프로젝트 표시 문구 — 없으면 `null`(사람) */
  project: string | null;
  /** 회의 일시·마감일 등 — 없으면 `null` */
  date: string | null;
  /** 사람의 권한 — `null`이면 배지를 안 그린다(빈 값으로 다룬다) */
  role: Authority | null;
}

export interface SearchCategoryCounts {
  total: number;
  meeting: number;
  action: number;
  project: number;
  person: number;
}

/**
 * 결과가 **잘려서 왔다**는 사실 — 안 잘렸으면 `null`이다.
 *
 * ⚠️ **조용히 자르지 않으려고 값으로 들고 다닌다**(§정직성). 실서버 `GET /api/v1/search`는
 *    `limit`(최대 50)까지만 주고 **page 파라미터가 없다** — 21건째, 51건째를 볼 방법이 서버에
 *    없으므로 화면은 "여기까지가 전부"인 척하는 대신 **얼마 중 얼마인지**를 밝힌다.
 * ⚠️ 무한 스크롤(§목록·페이지네이션)은 **못 만든다.** 이어 붙일 다음 페이지를 서버가 못 준다 —
 *    없는 페이지네이션을 지어내면 [다시 시도]만 도는 화면이 된다.
 */
export interface SearchResultCap {
  /** 이 조건에 실제로 있는 건수 — 서버가 상한과 무관하게 센 값(`counts`) */
  total: number;
  /** 그중 화면이 실제로 받은 건수 */
  shown: number;
}

/** 검색 결과 화면이 한 번에 받는 것 */
export interface SearchResults {
  keyword: string;
  /**
   * 탭 숫자용 건수 — **프로젝트·기간 필터는 반영하고 카테고리(탭)만 무시하고** 센다.
   * 그래서 탭을 눌러도 숫자 자체는 안 흔들리지만, 프로젝트·기간을 바꾸면 같이 바뀐다.
   */
  counts: SearchCategoryCounts;
  /** 지금 고른 탭·필터로 걸러진 목록 */
  items: SearchResultItem[];
  /** 서버가 상한까지만 줘서 잘린 상태 — 다 받았으면 `null` */
  cap: SearchResultCap | null;
  /**
   * 프로젝트·기간 필터를 **서버가 실제로 걸렀는가**.
   *
   * ⚠️ 실서버는 지금 `tags`·`from`·`to`를 **받기만 하고 안 건다**(SR-1 — [확인] BE
   *    `SearchService` 주석과 `SearchJdbcQueryAdapter`의 WHERE 절, 2026-08-13 실코드 대조).
   *    그러면 필터를 골라도 결과가 그대로인데, 화면이 아무 말도 안 하면 **필터가 고장 난 것처럼
   *    보인다** — 값으로 받아 화면이 "아직 반영되지 않는다"고 밝힌다(§정직성).
   * ⚠️ 목은 직접 거르므로 항상 `true`다. SR-2가 붙으면 `mapper.ts`의 상수 한 줄만 바꾼다.
   */
  filtersApplied: boolean;
}

export interface ProjectBrowseItem {
  id: number;
  name: string;
  tag: string;
  meetingCount: number;
}

export interface PersonBrowseItem {
  id: number;
  name: string;
  authority: Authority;
}

/**
 * 최근 본 항목 — `SearchResultItem`과 다른, **훨씬 적은** 필드만 온다(`GET /search/overview`).
 * 종류별 상세 필드(발췌·담당자·마감일 등)는 이 API가 안 준다 — `meta`는 BE가 이미 조합한
 * 보조 문구 한 줄이다(예: "프로젝트명 · 날짜").
 */
export interface SearchRecentViewItem {
  kind: SearchKind;
  id: number;
  title: string;
  meta: string | null;
}

/**
 * 랜딩의 칸 — **비어 있는 것과 못 받은 것을 가르려고** 이름을 붙여 둔다.
 * (`features/meeting/view-types.ts`의 `MeetingContentPending`과 같은 결: 왜 비었는지를 값으로 준다)
 *
 * ⚠️ **최근 검색어는 여기 없다.** 서버가 채우는 칸이 아니라 브라우저 로컬 저장소에서 바로
 *    나오는 값이라(`lib/recent-search-storage.ts`) "서버가 못 준다"는 뜻의 `unavailable`
 *    대상이 될 수 없다 — 검색 입력이 직접 들고 있는다(`search-input.tsx`).
 */
export const SEARCH_HOME_SECTION = {
  RECENTLY_VIEWED: "RECENTLY_VIEWED",
  PEOPLE: "PEOPLE",
} as const;
export type SearchHomeSection = (typeof SEARCH_HOME_SECTION)[keyof typeof SEARCH_HOME_SECTION];

export const SEARCH_HOME_SECTION_LABEL: Record<SearchHomeSection, string> = {
  RECENTLY_VIEWED: "최근 본 항목",
  PEOPLE: "사람으로 찾기",
};

/** 검색어가 없을 때(랜딩) 보여줄 것 */
export interface SearchHome {
  recentlyViewed: SearchRecentViewItem[];
  projects: ProjectBrowseItem[];
  people: PersonBrowseItem[];
  /**
   * **서버가 아직 못 채우는 칸** — 목에서는 늘 빈 배열이다.
   *
   * ⚠️ 빈 배열과 뜻이 다르다: `recentlyViewed: []`는 "본 게 없다"이고, 여기에
   *    `RECENTLY_VIEWED`가 들어 있으면 "물어볼 API가 없다"다. 둘을 같은 빈 화면으로 보여주면
   *    사용자는 자기가 아무것도 안 본 줄 안다(§정직성 — 조용히 안 되는 척 금지).
   */
  unavailable: SearchHomeSection[];
}

export const SEARCH_CATEGORY = {
  ALL: "all",
  MEETING: "meeting",
  ACTION: "action",
  PROJECT: "project",
  PERSON: "person",
} as const;
export type SearchCategory = (typeof SEARCH_CATEGORY)[keyof typeof SEARCH_CATEGORY];

export const SEARCH_CATEGORY_LABEL: Record<SearchCategory, string> = {
  all: "전체",
  meeting: "회의",
  action: "액션",
  project: "프로젝트",
  person: "사람",
};

export const SEARCH_PERIOD = {
  ALL: "all",
  WEEK: "7d",
  MONTH: "30d",
  QUARTER: "90d",
} as const;
export type SearchPeriod = (typeof SEARCH_PERIOD)[keyof typeof SEARCH_PERIOD];

export const SEARCH_PERIOD_LABEL: Record<SearchPeriod, string> = {
  all: "전체 기간",
  "7d": "최근 7일",
  "30d": "최근 30일",
  "90d": "최근 3개월",
};

/** 검색 화면이 주소(`searchParams`)에서 읽는 조건 전부 */
export interface SearchQuery {
  keyword: string;
  category: SearchCategory;
  /** `null` = 전체 프로젝트 */
  projectTag: string | null;
  period: SearchPeriod;
}
