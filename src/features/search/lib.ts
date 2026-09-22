import type { SearchCategory, SearchKind, SearchPeriod, SearchQuery } from "./types";
import { SEARCH_CATEGORY, SEARCH_PERIOD } from "./types";

/** 글자 한 토막 — 검색어에 걸린 자리인지 함께 들고 있다 */
export interface TextPart {
  text: string;
  isMatch: boolean;
}

/**
 * 검색어에 걸린 자리를 갈라낸다 — 제목 어디가 왜 걸렸는지 보여주려고 쓴다.
 *
 * ⚠️ **정규식을 안 쓴다.** 검색어는 사람이 아무 글자나 치는 값이라 `(`·`*` 같은 게 들어오면
 *    정규식이 터지거나 엉뚱한 데가 걸린다 — 글자를 그대로 찾는다.
 * ⚠️ 찾을 때만 소문자로 맞추고 **보여주는 건 원문 그대로**다.
 */
export function splitByMatch(text: string, keyword: string): TextPart[] {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return [{ text, isMatch: false }];

  const haystack = text.toLowerCase();
  const parts: TextPart[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const hit = haystack.indexOf(needle, cursor);
    if (hit < 0) {
      parts.push({ text: text.slice(cursor), isMatch: false });
      break;
    }
    if (hit > cursor) parts.push({ text: text.slice(cursor, hit), isMatch: false });
    parts.push({ text: text.slice(hit, hit + needle.length), isMatch: true });
    cursor = hit + needle.length;
  }

  return parts;
}

/** 대소문자를 가리지 않고 포함하는지 */
export function textIncludes(haystack: string, keyword: string): boolean {
  return haystack.toLowerCase().includes(keyword.trim().toLowerCase());
}

const KIND_TO_CATEGORY: Record<SearchKind, Exclude<SearchCategory, "all">> = {
  MEETING: "meeting",
  ACTION: "action",
  PROJECT: "project",
  PERSON: "person",
};

/**
 * 결과 한 건의 종류를 탭 카테고리 값으로 바꾼다.
 * ⚠️ `kind`만 보므로 실서버의 평평한 `SearchResultItem`·목의 종류별 `MockSearchRecord`
 *    양쪽 다 그대로 넘길 수 있다.
 */
export function categoryOf(item: { kind: SearchKind }): Exclude<SearchCategory, "all"> {
  return KIND_TO_CATEGORY[item.kind];
}

/** 주소가 같은 이름을 여러 번 줄 수 있어(`?q=김&q=이`) 값이 배열로도 온다 — 첫 값만 쓴다 */
function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const VALID_CATEGORIES = Object.values(SEARCH_CATEGORY);
const VALID_PERIODS = Object.values(SEARCH_PERIOD);

/**
 * 주소(`searchParams`)를 검색 조건으로 바꾼다.
 *
 * ⚠️ **모르는 값은 조용히 기본값으로 물러난다.** 주소는 사람이 손으로도 칠 수 있어
 *    `?category=hack` 같은 값이 올 수 있다 — 타입을 좁혀 두지 않으면 그대로 필터 로직에
 *    흘러들어 알 수 없는 동작을 한다.
 */
export function parseSearchQuery(
  searchParams: Record<string, string | string[] | undefined>,
): SearchQuery {
  const category = firstValue(searchParams.category);
  const period = firstValue(searchParams.period);
  const project = firstValue(searchParams.project).trim();

  return {
    keyword: firstValue(searchParams.q),
    category: (VALID_CATEGORIES as string[]).includes(category)
      ? (category as SearchCategory)
      : SEARCH_CATEGORY.ALL,
    period: (VALID_PERIODS as string[]).includes(period)
      ? (period as SearchPeriod)
      : SEARCH_PERIOD.ALL,
    projectTag: project.length > 0 ? project : null,
  };
}
