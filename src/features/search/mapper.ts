import { AUTHORITY, type Authority } from "@/constants/domain";
import type { BeProjectSummary } from "@/features/project/mapper";

import { categoryOf } from "./lib";
import type {
  ProjectBrowseItem,
  SearchCategory,
  SearchCategoryCounts,
  SearchResultCap,
  SearchResultItem,
  SearchResults,
} from "./types";
import { SEARCH_KIND, type SearchKind } from "./types";

/**
 * BE shape → UI 계약 (§Mock 격리막 — **shape을 흡수하는 곳은 여기 하나다**).
 *
 * ⚠️ 컴포넌트는 이 파일을 모른다. BE가 모양을 바꾸면 여기만 고친다.
 * ⚠️ [확인] `search/presentation/api/{SearchController,response/SearchResponse}.java`와
 *    `search/application/service/SearchService.java` 실코드 대조(2026-08-13).
 * ⚠️ **`GET /api/v1/search/overview`를 읽던 매퍼(`BeSearchOverview`·`toRecentViewItems`·
 *    `toPersonBrowseItem`)는 걷어냈다** — BE에 그 매핑이 없다(#422). 없는 응답의 모양을
 *    붙들고 있으면 다음 사람이 그걸 근거로 또 부른다. 생기면 그때 다시 세운다.
 */

const VALID_SEARCH_KINDS = Object.values(SEARCH_KIND) as string[];

/**
 * 모르는 종류는 `null` — 화면이 못 그리는 값을 그대로 흘리지 않는다
 * (§도메인 상수: BE enum과 이름이 어긋나면 매퍼에서 조용히 틀린다).
 */
function toSearchKind(type: string): SearchKind | null {
  return VALID_SEARCH_KINDS.includes(type) ? (type as SearchKind) : null;
}

/**
 * 프로젝트 목록 응답 → 검색 화면의 프로젝트 한 줄(필터 옵션·둘러보기 공용).
 *
 * ⚠️ **프로젝트 도메인의 BE shape을 그대로 쓴다**(`BeProjectSummary`). 검색 전용 프로젝트
 *    조회는 BE에 없어서 `GET /api/projects`를 나눠 쓰는데, 여기서 shape을 또 정의하면 같은
 *    응답을 두 벌로 들고 있게 된다 — 바뀔 때 한쪽만 고쳐지고 조용히 어긋난다(§연동 검증).
 * ⚠️ 화면에 나가는 건 **이름과 태그**뿐이다. 상태·진행률처럼 목록 카드용 값은 안 옮긴다 —
 *    필터 드롭다운이 못 쓰는 값을 실어 나를 이유가 없다.
 */
export function toProjectFilterOption(be: BeProjectSummary): ProjectBrowseItem {
  return { id: be.id, name: be.name, tag: be.tag, meetingCount: be.meetingCount };
}

/**
 * `GET /api/v1/search` 응답 — `results[]`는 종류를 가리지 않는 평평한 모양이다.
 * [확인] `search/presentation/api/response/SearchResponse.java` (2026-08-12 실코드 대조).
 * ⚠️ `project`는 문자열이 아니라 **객체다**(`{id, tag, name, color}`). 전에는 문구로 가정해
 *    실연동 시 프로젝트명 자리에 객체가 흘러 렌더가 깨질 자리였다 — 화면 계약(문구)으로는
 *    태그를 내보낸다(프로젝트 표식은 태그 칩 하나라는 규칙, §도메인 상수).
 */
export interface BeSearchResponse {
  query: string;
  counts: { all: number; meeting: number; action: number; project: number; person: number };
  results: {
    type: string;
    id: number;
    title: string;
    snippet: string | null;
    project: { id: number; tag: string; name: string; color: string | null } | null;
    date: string | null;
    role: string | null;
    score: number;
  }[];
}

/**
 * 모르는 권한 문자열은 **빈 값으로** 둔다. 검색 결과의 `role`은 요구사항대로 "안 오면 빈 값"이라 —
 * 모르는 문자열도 잘못된 권한 배지를 다는 것보다 안 다는 게 낫다.
 */
function toAuthorityOrNull(role: string | null): Authority | null {
  if (role === null) return null;
  const values = Object.values(AUTHORITY) as string[];
  return values.includes(role) ? (role as Authority) : null;
}

/**
 * 서버가 `tags`(프로젝트)·`from`/`to`(기간)를 **실제로 걸러 주는가** — 지금은 아니다.
 *
 * ⚠️ **SR-2가 붙는 날 이 한 줄만 `true`로 바꾼다.** 그러면 화면의 "필터가 아직 반영되지
 *    않습니다" 안내가 저절로 사라진다(§Mock 격리막 — 컴포넌트는 안 고친다).
 *    근거: BE `SearchService`의 SR-1 주석 + `SearchJdbcQueryAdapter`에 태그·기간 WHERE 부재.
 */
const SERVER_APPLIES_FILTERS = false;

/**
 * 지금 탭에서 **몇 건 중 몇 건을 보고 있는지** — 다 받았으면 `null`.
 *
 * ⚠️ 세는 자리가 다르다: `total`은 서버가 상한과 무관하게 센 값이고 `shown`은 실제로 받은
 *    줄 수다. 서버 상한(`limit`)에 걸려 잘렸거나, 매퍼가 모르는 종류를 걸러냈으면 벌어진다 —
 *    어느 쪽이든 **화면이 전부를 보여주고 있지 않다**는 사실은 같으므로 같은 값으로 알린다.
 * ⚠️ `all` 탭의 `total`은 4종 합계이고, 상한은 **종류마다** 걸리므로 한 종류만 잘려도 벌어진다.
 */
export function toResultCap(
  counts: SearchCategoryCounts,
  category: SearchCategory,
  shown: number,
): SearchResultCap | null {
  const total = category === "all" ? counts.total : counts[category];
  return shown < total ? { total, shown } : null;
}

/**
 * BE 정렬 순서를 그대로 지킨다 — 여기서 다시 정렬하지 않는다.
 *
 * ⚠️ **탭 거르기를 여기서 한다.** 서버에 `type`을 실어 좁히지 않고 늘 `ALL`로 받아 오기
 *    때문이다(이유는 `server.ts`의 호출부 주석 — `type`을 좁히면 다른 탭 숫자가 전부 0으로
 *    내려와 "결과가 없다"는 거짓말이 된다). 종류별 상한은 서버가 종류마다 따로 걸어 주므로,
 *    좁혀 받든 걸러 쓰든 **그 탭에 보이는 줄은 같다**.
 */
export function toSearchResults(be: BeSearchResponse, category: SearchCategory): SearchResults {
  const all = be.results.flatMap((hit): SearchResultItem[] => {
    const kind = toSearchKind(hit.type);
    if (!kind) return [];
    return [
      {
        kind,
        id: hit.id,
        title: hit.title,
        snippet: hit.snippet,
        project: hit.project?.tag ?? null,
        date: hit.date,
        role: toAuthorityOrNull(hit.role),
      },
    ];
  });

  const counts: SearchCategoryCounts = {
    total: be.counts.all,
    meeting: be.counts.meeting,
    action: be.counts.action,
    project: be.counts.project,
    person: be.counts.person,
  };
  const items = category === "all" ? all : all.filter((item) => categoryOf(item) === category);

  return {
    keyword: be.query,
    counts,
    items,
    cap: toResultCap(counts, category, items.length),
    filtersApplied: SERVER_APPLIES_FILTERS,
  };
}
