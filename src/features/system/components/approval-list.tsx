"use client";

import { useCallback } from "react";

import { InfiniteListFooter } from "@/components/common/infinite-list-footer";
import { useInfiniteScrollList } from "@/hooks/use-infinite-scroll-list";

import { fetchApprovalsPageAction } from "../actions";
import type { PendingCompanyApproval } from "../types";
import { ApprovalTable } from "./approval-table";

interface ApprovalListProps {
  initialItems: PendingCompanyApproval[];
  initialPage: number;
  initialTotalPages: number;
  initialTotalCount: number;
  pageSize: number;
}

/** 컴포넌트 밖에 둬서 매 렌더 새 함수가 안 되게 한다(`loadMore`의 의존값이라, 새 함수면
 * 센티널이 매번 재부착돼 옵저버가 다시 붙는다 — 실패 뒤 재시도가 꼬일 수 있다). */
function getId(item: PendingCompanyApproval) {
  return item.id;
}

/**
 * "기업 승인" 무한 스크롤 목록 — 첫 페이지는 서버가 렌더하고, 그 아래부터는 스크롤이 끝에
 * 닿으면 다음 페이지를 이어붙인다(CLAUDE.md §목록·페이지네이션).
 * ⚠️ [더 보기] 버튼은 없다(2026-08-10 폐기) — `IntersectionObserver` 감시 대상만 둔다.
 * ⚠️ 승인·반려는 상세 **모달**(`approval-detail-dialog.tsx`)이 끝내고 결과 토스트도 거기서
 *    띄운다 — 화면이 안 갈리므로 결과를 `?done=` 쿼리로 넘겨받아 띄우던 자리가 없어졌다.
 *    (그 방식은 이펙트가 두 번 돌면 토스트가 겹쳐서 `id`로 눌러 두어야 했다.)
 */
export function ApprovalList({
  initialItems,
  initialPage,
  initialTotalPages,
  initialTotalCount,
  pageSize,
}: ApprovalListProps) {
  const fetchPage = useCallback(
    (page: number) => fetchApprovalsPageAction(page, pageSize),
    [pageSize],
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

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-[12px] leading-4">전체 {totalCount}건</p>

      <ApprovalTable companies={items} pageSize={pageSize} />

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
