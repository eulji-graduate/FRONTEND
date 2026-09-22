import { Search } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SearchInput } from "@/features/search/components/search-input";
import { SearchLanding } from "@/features/search/components/search-landing";
import { SearchResultsPanel } from "@/features/search/components/search-results-panel";
import { parseSearchQuery } from "@/features/search/lib";
import { getSearchHome, getSearchProjects, getSearchResults } from "@/features/search/server";
import { PageHeader } from "@/features/shell/components/page-header";

export const metadata: Metadata = {
  title: "검색",
};

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * 검색 — 키워드가 없으면 랜딩(최근 검색어·최근 본 항목·둘러보기), 있으면 결과 목록이다.
 * 조회뿐이라 Server Component 하나로 끝난다. 검색창·필터만 잎사귀로 나가 있다(CLAUDE.md §핵심 4원칙 1).
 *
 * ⚠️ **`getSearchHome()`은 랜딩일 때만 부른다.** 결과 화면이 필요한 건 필터용 프로젝트
 *    목록뿐인데 `getSearchHome()`은 최근 검색어·최근 본 항목까지 같이 불러온다 —
 *    그걸 늘 같이 부르면 랜딩 쪽 조회가 실패했을 때 검색 결과 화면까지 같이 죽는다.
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = parseSearchQuery(await searchParams);
  const keyword = query.keyword.trim();

  // 탭이 이어받을 조건 — `category`만 빼고 그대로 넘긴다
  const baseParams = new URLSearchParams();
  if (query.keyword) baseParams.set("q", query.keyword);
  if (query.projectTag) baseParams.set("project", query.projectTag);
  if (query.period !== "all") baseParams.set("period", query.period);

  let content: ReactNode;
  if (keyword) {
    const [results, projects] = await Promise.all([getSearchResults(query), getSearchProjects()]);
    content = (
      <SearchResultsPanel
        results={results}
        query={query}
        projects={projects}
        baseParams={baseParams}
      />
    );
  } else {
    const home = await getSearchHome();
    content = <SearchLanding home={home} />;
  }

  return (
    <>
      {/*
        ⚠️ **검색 중일 때만 뒤로가기를 단다.** 결과를 보다가 처음 화면으로 돌아갈 길이 없었다 —
           입력의 ✕는 지우는 것이지 "뒤로"가 아니고, 주소가 `replace`로 바뀌어 브라우저
           뒤로가기도 검색 전으로 안 간다.
      */}
      <PageHeader
        title="검색"
        icon={Search}
        backTo={keyword ? { href: "/app/search", label: "검색" } : undefined}
      />
      <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
        {/*
          ⚠️ **다른 목록 화면과 같은 1440이다**(§DESIGN 4). 좁혀 봤더니 이 화면만 폭이 달라
             사이드바로 오갈 때 본문이 눈에 띄게 흔들렸다 — 화면마다 폭이 다르면 그게 더 거슬린다.
             가운데가 비어 보이던 건 폭 탓이 아니라 **줄 안이 세 층으로 쌓여 있어서**였고,
             그건 한 줄로 붙여 고쳤다.
          ⚠️ **입력만 좁게(720) 둔다.** 한 줄 입력이 1440까지 늘어나면 글자가 왼쪽 끝에만 붙고
             오른쪽이 통째로 빈다 — 결과 목록은 넓을수록 좋지만 입력은 아니다.
        */}
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7">
          {/*
            ⚠️ **입력은 가운데 세운다.** 왼쪽에 붙여 두니 넓은 화면에서 한쪽으로 몰려 보였다 —
               찾으러 온 사람이 제일 먼저 보는 것이라 화면 한복판에 서는 게 맞다.
            ⚠️ 최근 검색어도 이 안에 딸려 있다(입력 드롭다운). 둘은 같은 일(찾기 시작하기)을
               하는데 따로 떨어져 있으면 최근 검색어가 "목록 중 하나"로 보인다.
          */}
          <div className="mx-auto w-full max-w-[720px] pt-4 pb-2">
            <SearchInput keyword={query.keyword} />
          </div>
          {content}
        </div>
      </main>
    </>
  );
}
