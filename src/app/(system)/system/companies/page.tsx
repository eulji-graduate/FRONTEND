import type { Metadata } from "next";
import { Suspense } from "react";

import { isCompanySort, isCompanyStatus } from "@/constants/domain";
import { CompanyDetailDialog } from "@/features/system/components/company-detail-dialog";
import { CompanyFilterBar } from "@/features/system/components/company-filter-bar";
import { CompanyList } from "@/features/system/components/company-list";
import { buildCompanyHref } from "@/features/system/lib/company-href";
import { getManagedCompanies, getManagedCompanyById } from "@/features/system/server";

export const metadata: Metadata = {
  title: "기업 관리",
};

const PAGE_SIZE = 10;

interface SystemCompaniesPageProps {
  searchParams: Promise<{
    id?: string;
    q?: string;
    sort?: string;
    status?: string;
  }>;
}

export default async function SystemCompaniesPage({ searchParams }: SystemCompaniesPageProps) {
  const params = await searchParams;

  // ⚠️ URL 쿼리는 신뢰할 수 없는 입력이다 — 모르는 값이 들어오면 무시하고 "전체"로 물러선다.
  // ⚠️ 한 번만 걸러서 `filter`·`query` 양쪽이 같은 값을 쓴다 — 따로 걸렀다가 하나라도
  //    빠뜨리면 필터에는 무효 값이 안 먹혔는데 링크(`buildCompanyHref`)에는 그 무효 값이
  //    그대로 남아, 새로고침했을 때 방금 막았던 값이 되살아난다.
  const status = params.status && isCompanyStatus(params.status) ? params.status : undefined;
  const sort = params.sort && isCompanySort(params.sort) ? params.sort : undefined;
  const query = { q: params.q, sort, status };
  const filter = { keyword: params.q, status, sort };

  const [{ items, page, totalPages, totalCount }, selected] = await Promise.all([
    getManagedCompanies(filter, 0, PAGE_SIZE),
    params.id ? getManagedCompanyById(params.id) : Promise.resolve(null),
  ]);

  const currentPath = buildCompanyHref(query);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-7">
        {/*
          ⚠️ 검색·정렬이 바뀌면 새로 마운트돼야 한다(누적된 예전 결과가 섞이지 않게) —
             필터 값으로 만든 key로 그걸 보장한다(`company-list.tsx` 주석 참고).
        */}
        <CompanyList
          key={`${query.q ?? ""}-${query.sort ?? ""}-${query.status ?? ""}`}
          initialItems={items}
          initialPage={page}
          initialTotalPages={totalPages}
          initialTotalCount={totalCount}
          pageSize={PAGE_SIZE}
          filter={filter}
          query={query}
          filterBar={
            <Suspense>
              <CompanyFilterBar />
            </Suspense>
          }
        />
      </div>

      <CompanyDetailDialog company={selected} closeHref={currentPath} currentPath={currentPath} />
    </main>
  );
}
