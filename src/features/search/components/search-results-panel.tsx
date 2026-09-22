import { Info, SearchX } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";

import type { ProjectBrowseItem, SearchQuery, SearchResults } from "../types";
import { SearchFilterBar } from "./search-filter-bar";
import { SearchResultRow } from "./search-result-row";
import { SearchTabs } from "./search-tabs";

/**
 * 검색어가 있을 때의 화면 — 탭·필터·결과 목록을 한 카드에 담는다(DESIGN §2 카드 anatomy).
 * 순수 표시 + 이동뿐이라 서버에서 그린다. 조건을 바꾸는 잎사귀(입력·셀렉트)만 클라이언트다.
 */
export function SearchResultsPanel({
  results,
  query,
  projects,
  baseParams,
}: {
  results: SearchResults;
  query: SearchQuery;
  projects: ProjectBrowseItem[];
  /** `category`를 뺀 나머지 조건(`q`·`project`·`period`) — 탭이 그대로 이어받는다 */
  baseParams: URLSearchParams;
}) {
  return (
    /*
      ⚠️ **랜딩과 같은 결로 둔다**(2026-08-10). 결과만 카드 하나로 통째로 감싸 두니, 같은
         화면인데 검색 전과 후의 생김새가 달랐다 — 탭·필터는 조작하는 자리라 위에 두고,
         결과는 랜딩처럼 **줄마다 낱장**으로 쌓는다.
    */
    <section className="flex flex-col gap-4">
      <div>
        <SearchTabs counts={results.counts} active={query.category} searchParams={baseParams} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <SearchFilterBar projects={projects} projectTag={query.projectTag} period={query.period} />
        {/*
          ⚠️ **잘렸으면 전체 건수를 같이 적는다**(§목록: 전체 건수를 머리에 적는다).
             `결과 50건`만 적으면 50건이 전부인 줄 읽힌다 — 얼마 중 얼마인지가 이 줄의 일이다.
        */}
        <p className="text-muted-foreground shrink-0 text-[12px] leading-4 tabular-nums">
          {results.cap
            ? `전체 ${results.cap.total}건 중 ${results.cap.shown}건`
            : `결과 ${results.items.length}건`}
        </p>
      </div>

      {/*
        ⚠️ **조용히 자르지 않는다**(§정직성). 서버가 상한(종류별 50건)까지만 주고 다음 장을
           줄 수단이 없어서 — 스크롤로 이어 붙이지도, 더 보기로 넘기지도 못한다(§목록·페이지네이션).
           그래서 화면이 할 수 있는 정직한 일은 **잘렸다고 말하고 좁히는 법을 알려 주는 것**이다.
        ⚠️ 필터 안내도 같은 자리에 둔다 — 서버가 프로젝트·기간을 아직 안 걸러서(BE SR-2 대기)
           골라도 결과가 그대로다. 아무 말이 없으면 필터가 고장 난 것처럼 보인다.
      */}
      {(results.cap || !results.filtersApplied) && (
        <div className="text-muted-foreground flex flex-col gap-1 text-[12px] leading-5">
          {results.cap && (
            /*
              ⚠️ **탭을 고르라고 하지 않는다**(2026-08-13 고침). 서버는 늘 `type=ALL`로 한 번만
                 부르고 상한도 종류마다 걸리므로, 탭을 바꿔도 **같은 줄이 그대로** 나온다 —
                 "탭으로 종류를 골라 주세요"는 눌러도 아무것도 안 늘어나는 안내였다(§정직성:
                 지원하지 않는 방법을 권하지 않는다). 실제로 듣는 수단은 검색어를 좁히는 것뿐이다.
            */
            <p className="flex items-start gap-1.5">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                서버 상한에 걸려 <span className="tabular-nums">{results.cap.shown}</span>건만
                왔습니다. 탭을 바꿔도 더 나오지 않으니, 나머지를 보려면 검색어를 좁혀 주세요.
              </span>
            </p>
          )}
          {!results.filtersApplied && (
            <p className="flex items-start gap-1.5">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>프로젝트·기간 필터는 아직 검색 결과에 반영되지 않습니다.</span>
            </p>
          )}
        </div>
      )}

      {results.items.length === 0 ? (
        <div className="border-border bg-card rounded-2xl border">
          {/*
            ⚠️ **서버가 필터를 안 걸 때는 필터를 바꾸라고 하지 않는다**(2026-08-13 고침).
               바로 위에서 "필터는 아직 반영되지 않습니다"라고 해 놓고 "필터를 전체로 바꿔
               주세요"라고 하면 화면이 두 말을 한다 — 실제로 바꿔도 결과는 한 줄도 안 변한다.
          */}
          <EmptyState
            icon={SearchX}
            title="검색 결과가 없습니다."
            description={
              results.filtersApplied
                ? "다른 검색어로 찾거나 필터를 전체로 바꿔 주세요."
                : "다른 검색어로 찾아 주세요."
            }
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {results.items.map((item) => (
            <SearchResultRow
              key={`${item.kind}-${item.id}`}
              item={item}
              keyword={results.keyword}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
