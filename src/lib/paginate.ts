/** 페이지 하나로 잘라낸 결과. */
export interface PaginatedResult<T> {
  items: T[];
  /** 범위를 벗어난 요청은 안으로 당겨진 값이다 — 호출한 쪽 페이지 번호와 다를 수 있다 */
  page: number;
  totalPages: number;
  totalCount: number;
}

/**
 * 배열을 페이지 단위로 자른다.
 * ⚠️ **`page`는 0-base다**(BE 표준 확정, 2026-08-10 — `page=0`이 첫 페이지). 실 API의
 *    `PageResponse`와 인덱스가 그대로 맞아야 연동 시 변환 코드가 안 생긴다.
 * ⚠️ `page`가 범위를 벗어나면(음수·마지막 페이지 초과) **안으로 당긴다** — 빈 화면 대신
 *    가장 가까운 유효 페이지를 보여준다.
 */
export function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * pageSize;

  return { items: items.slice(start, start + pageSize), page: safePage, totalPages, totalCount };
}
