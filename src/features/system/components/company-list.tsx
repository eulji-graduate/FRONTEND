"use client";

import { type ReactNode, useCallback } from "react";

import { InfiniteListFooter } from "@/components/common/infinite-list-footer";
import { useInfiniteScrollList } from "@/hooks/use-infinite-scroll-list";

import { fetchCompaniesPageAction } from "../actions";
import { buildCompanyHref, type CompanyHrefQuery } from "../lib/company-href";
import type { CompanyListFilter, ManagedCompany } from "../types";
import { CompanyTable } from "./company-table";

interface CompanyListProps {
  initialItems: ManagedCompany[];
  initialPage: number;
  initialTotalPages: number;
  initialTotalCount: number;
  pageSize: number;
  filter: CompanyListFilter;
  /**
   * 상세 링크를 만드는 데 필요한 값만(직렬화 가능한 값) 받는다 — 서버 컴포넌트에서 만든
   * 클로저(`(id) => ...`)를 그대로 내려보낼 수 없다(함수는 서버→클라이언트 경계를 못 건넌다).
   * 링크 자체는 `buildCompanyHref`(순수 함수, 양쪽에서 같이 import)로 여기서 계산한다.
   */
  query: CompanyHrefQuery;
  /**
   * 검색·정렬 줄 — 부르는 화면이 넘긴다.
   *
   * ⚠️ **건수와 같은 줄에 세우려고** 여기서 받는다. 전에는 필터가 위에 따로 한 줄,
   *    `전체 N건`이 아래 또 한 줄이라 **줄이 두 개**였다. 필터는 오른쪽 끝에만 붙어 있어
   *    그 줄 왼쪽 절반이 통째로 비었고, 건수 줄은 혼자 떠 있었다.
   * ⚠️ 건수는 이 컴포넌트만 안다(이어붙이면서 바뀐다) — 그래서 필터가 여기로 온다.
   */
  filterBar?: ReactNode;
}

/** 컴포넌트 밖에 둬서 매 렌더 새 함수가 안 되게 한다(`approval-list.tsx`와 같은 이유). */
function getId(item: ManagedCompany) {
  return item.id;
}

/**
 * "기업 관리" 무한 스크롤 목록 — `approval-list.tsx`와 같은 패턴(CLAUDE.md §목록·페이지네이션).
 * ⚠️ 검색·정렬이 바뀌면 이 컴포넌트는 **다시 마운트돼야 한다** — 부르는 쪽(`page.tsx`)이
 *    필터 값으로 만든 `key`를 붙여, 필터가 바뀔 때 이어붙인 예전 결과가 안 섞이게 한다.
 */
export function CompanyList({
  initialItems,
  initialPage,
  initialTotalPages,
  initialTotalCount,
  pageSize,
  filter,
  query,
  filterBar,
}: CompanyListProps) {
  const fetchPage = useCallback(
    (page: number) => fetchCompaniesPageAction(filter, page, pageSize),
    [filter, pageSize],
  );

  const { items, totalCount, hasMore, isLoadingMore, error, loadMore, sentinelRef } =
    useInfiniteScrollList({
      initialItems,
      initialPage,
      initialTotalPages,
      initialTotalCount,
      getId,
      fetchPage,
    });

  const buildDetailHref = useCallback((id: string) => buildCompanyHref(query, id), [query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-[12px] leading-4">전체 {totalCount}건</p>
        {filterBar}
      </div>

      <CompanyTable companies={items} buildDetailHref={buildDetailHref} pageSize={pageSize} />

      <InfiniteListFooter
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        error={error}
        onLoadMore={loadMore}
        sentinelRef={sentinelRef}
      />
    </div>
  );
}
