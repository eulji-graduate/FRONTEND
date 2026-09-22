/**
 * "기업 관리" 목록·상세 링크 조립 — 서버 컴포넌트(`companies/page.tsx`)와 클라이언트
 * 컴포넌트(`company-list.tsx`) 양쪽에서 같이 쓴다.
 *
 * ⚠️ 이 파일에 `"use client"`/`"server-only"`를 붙이지 않는다. 함수는 서버→클라이언트
 *    경계를 못 건넌다(직렬화 불가) — 그래서 클로저를 prop으로 내려보내는 대신, 이 순수
 *    함수를 양쪽이 각자 import해 같은 결과를 계산한다.
 */
export interface CompanyHrefQuery {
  q?: string;
  sort?: string;
  status?: string;
}

const BASE_PATH = "/system/companies";

/** 목록은 URL에 페이지 번호를 담지 않는다(무한 스크롤) — 검색어·정렬·상세 id만 남는다. */
export function buildCompanyHref(query: CompanyHrefQuery, id?: string): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.sort) params.set("sort", query.sort);
  if (query.status) params.set("status", query.status);
  if (id) params.set("id", id);
  const qs = params.toString();
  return qs ? `${BASE_PATH}?${qs}` : BASE_PATH;
}
