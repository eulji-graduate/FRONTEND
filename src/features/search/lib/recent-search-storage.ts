/**
 * 최근 검색어 — 서버 API 없이 **브라우저 로컬 저장소**로만 관리한다(#422 — BE에 `search/overview`가
 * 없어 랜딩이 404로 죽던 문제의 대체 조치, 이슈 번호는 PR에서 매핑).
 *
 * ⚠️ **기기·브라우저 국한이다.** 다른 기기로 로그인하면 안 보인다 — 서버 저장이 아니므로
 *    당연한 한계이지 버그가 아니다.
 * ⚠️ `window`가 없는 곳(서버 렌더 패스)에서 불러도 죽지 않게 가드한다.
 */

const STORAGE_KEY = "z:search:recent-queries";
const MAX_ENTRIES = 5;

function readStore(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

function writeStore(entries: string[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* 저장 공간이 꽉 찼거나 접근이 막힌 경우 — 검색 자체를 막을 이유는 아니다 */
  }
}

/** 최신순 최근 검색어 — 최대 {@link MAX_ENTRIES}개 */
export function getRecentSearches(): string[] {
  return readStore().slice(0, MAX_ENTRIES);
}

/** 검색어 기록 — 같은 검색어가 이미 있으면 맨 앞으로 올린다. 갱신된 목록을 그대로 돌려준다 */
export function addRecentSearch(keyword: string): string[] {
  const trimmed = keyword.trim();
  if (!trimmed) return getRecentSearches();

  const next = [trimmed, ...readStore().filter((entry) => entry !== trimmed)].slice(0, MAX_ENTRIES);
  writeStore(next);
  return next;
}
