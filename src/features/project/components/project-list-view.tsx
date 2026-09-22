"use client";

import { FolderOpen, SearchX } from "lucide-react";
import { useCallback } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { InfiniteListFooter } from "@/components/common/infinite-list-footer";
import { useInfiniteScrollList } from "@/hooks/use-infinite-scroll-list";

import { fetchProjectsPageAction } from "../actions";
import type { ProjectListQuery } from "../server";
import type { ProjectListItem } from "../types";
import { ProjectListTable } from "./project-list-table";

/**
 * 프로젝트 목록 — **서버가 자르고, 화면이 이어 붙인다**(CLAUDE.md §목록·페이지네이션).
 *
 * ⚠️ 첫 페이지는 서버 컴포넌트(`page.tsx`)가 렌더한 값을 그대로 받는다 — 여기서 다시 안 부른다.
 * ⚠️ **머리의 건수는 여기서 안 그린다.** `결과 N개`는 툴바 줄(카드 머리)에 있고 그 값은
 *    서버가 센 `totalCount`다 — 이어 붙이는 동안 안 바뀌므로 화면 상태로 들 필요가 없다.
 * ⚠️ 거르개(`query`)를 그대로 다음 페이지 요청에 실어 보낸다. 안 보내면 2페이지부터 서버
 *    기본 조건으로 돌아와 다른 목록이 이어 붙는다.
 * ⚠️ **[더 보기] 버튼은 없다**(2026-08-10 폐기) — 목록 끝의 빈 요소가 감시 대상이고
 *    (`IntersectionObserver`), 실패했을 때만 [다시 시도]가 뜬다(§목록 3상태).
 */

/** 컴포넌트 밖에 둬서 매 렌더 새 함수가 안 되게 한다(센티널 재부착 방지) */
function getId(project: ProjectListItem) {
  return String(project.id);
}

interface ProjectListViewProps {
  initialItems: ProjectListItem[];
  initialPage: number;
  initialTotalPages: number;
  initialTotalCount: number;
  /** 지금 목록이 서 있는 조건 — 다음 페이지에도 같은 값을 실어 보낸다 */
  query: ProjectListQuery;
}

export function ProjectListView({
  initialItems,
  initialPage,
  initialTotalPages,
  initialTotalCount,
  query,
}: ProjectListViewProps) {
  const { status, keyword, sort } = query;
  /*
    ⚠️ `query` 객체를 그대로 의존성에 넣지 않는다 — 서버 컴포넌트가 렌더할 때마다 새 객체라
       `fetchPage`가 매번 새 함수가 되고, 훅의 센티널(`useCallback` 의존)이 계속 다시 붙는다.
       값 셋으로 풀어 두면 실제로 조건이 바뀔 때만 새로 만든다.
  */
  const fetchPage = useCallback(
    (page: number) => fetchProjectsPageAction({ status, keyword, sort }, page),
    [status, keyword, sort],
  );

  const { items, hasMore, isLoadingMore, error, loadMore, sentinelRef } = useInfiniteScrollList({
    initialItems,
    initialPage,
    initialTotalPages,
    initialTotalCount,
    getId,
    fetchPage,
  });

  const isSearching = Boolean(keyword?.trim());

  if (items.length === 0) {
    /* 빈 상태 — 무엇이 없는지 적는다(§3상태) */
    return (
      <EmptyState
        bordered
        icon={isSearching ? SearchX : FolderOpen}
        title={isSearching ? "검색 결과가 없습니다." : "해당 상태의 프로젝트가 없습니다."}
        description={
          isSearching
            ? "다른 프로젝트 이름으로 찾아 주세요."
            : "위 필터를 바꾸면 다른 상태의 프로젝트를 볼 수 있습니다."
        }
      />
    );
  }

  return (
    <>
      <ProjectListTable projects={items} />
      {/* ⚠️ 표 **밖**에 둔다 — `tbody` 안에 `div`를 넣으면 브라우저가 표 밖으로 끌어낸다 */}
      <div className="px-7 pb-4">
        <InfiniteListFooter
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          error={error}
          onLoadMore={loadMore}
          sentinelRef={sentinelRef}
        />
      </div>
    </>
  );
}
