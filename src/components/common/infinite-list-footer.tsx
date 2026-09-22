"use client";

import { Button } from "@/components/ui/button";

interface InfiniteListFooterProps {
  hasMore: boolean;
  isLoadingMore: boolean;
  error: boolean;
  onLoadMore: () => void;
  /** 목록 끝의 감시 대상 — `useInfiniteScrollList`의 `sentinelRef`를 그대로 넘긴다 */
  sentinelRef: (node: HTMLElement | null) => void;
}

/**
 * 무한 스크롤 목록의 하단 상태 — `IntersectionObserver` 감시 대상이 곧 이 자리다
 * (CLAUDE.md §목록·페이지네이션). `approval-list.tsx`·`company-list.tsx`가 같이 쓴다.
 * ⚠️ **[더 보기] 버튼은 없다**(2026-08-10 폐기) — 스크롤 트리거 하나로 통일한다.
 *    실패했을 때의 [다시 시도]만 예외로 둔다 — 그건 자동 재시도가 아니라 사용자가
 *    직접 눌러야 하는 별개의 동작이다.
 * ⚠️ `role="status" aria-live="polite"` — 로딩·실패 문구가 스크린 리더에도 그때그때 들린다.
 */
export function InfiniteListFooter({
  hasMore,
  isLoadingMore,
  error,
  onLoadMore,
  sentinelRef,
}: InfiniteListFooterProps) {
  if (!hasMore) return null;

  return (
    <div ref={sentinelRef} role="status" aria-live="polite" className="flex justify-center py-1">
      {error ? (
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-[12px] leading-4">불러오지 못했습니다</p>
          <Button type="button" variant="outline" size="xs" onClick={onLoadMore}>
            다시 시도
          </Button>
        </div>
      ) : isLoadingMore ? (
        <p className="text-muted-foreground text-[12px] leading-4">불러오는 중…</p>
      ) : null}
    </div>
  );
}
