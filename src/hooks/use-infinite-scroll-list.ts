"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PaginatedResult } from "@/lib/paginate";

interface UseInfiniteScrollListOptions<T> {
  initialItems: T[];
  initialPage: number;
  initialTotalPages: number;
  initialTotalCount: number;
  /** 항목의 고유 id — 이어 붙일 때 이 값으로 중복을 거른다(CLAUDE.md §목록·페이지네이션). */
  getId: (item: T) => string;
  /** 다음 페이지를 가져오는 서버 액션. */
  fetchPage: (page: number) => Promise<PaginatedResult<T>>;
}

/**
 * 목록 무한 스크롤 — CLAUDE.md §목록·페이지네이션의 상태 기계만 여기 담는다.
 * 실제 렌더(표·카드·센티널 위치)는 부르는 쪽이 맡는다.
 *
 * ⚠️ 첫 페이지는 서버 컴포넌트가 이미 렌더한 값을 `initialItems`로 받는다 — 여기서 다시
 *    부르지 않는다(§핵심 4원칙 ①).
 * ⚠️ 이어 붙일 때 `getId` 기준으로 중복을 거른다 — 보는 사이에 새 항목이 앞에 들어오면
 *    같은 행이 두 번 보일 수 있다.
 * ⚠️ 실패하면 조용히 멈추지 않는다 — `error`를 보고 부르는 쪽이 "다시 시도"를 띄운다.
 */
export function useInfiniteScrollList<T>({
  initialItems,
  initialPage,
  initialTotalPages,
  initialTotalCount,
  getId,
  fetchPage,
}: UseInfiniteScrollListOptions<T>) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const isFetchingRef = useRef(false);
  const initialItemsRef = useRef(initialItems);
  /** `loadMore`가 시작될 때의 "세대"를 찍어 둔다 — 도중에 초기화 효과가 돌면 세대가 올라가고,
   * 응답이 와도 낡은 세대의 결과는 버린다(막 되돌린 목록 위에 옛 페이지가 얹히지 않게). */
  const generationRef = useRef(0);

  /**
   * 서버가 첫 페이지를 다시 렌더해 `initialItems`가 새로 오면(정지/정지 해제처럼 상세 패널의
   * 조작이 `revalidatePath`로 이 경로를 다시 그리게 만든 경우) **첫 페이지 기준으로 통째로
   * 되돌린다** — 2페이지 이후만 골라 병합하지 않는다. 부분 병합은 이어붙인 옛 페이지의
   * `page`/`totalPages`/`totalCount` 커서가 새 서버 스냅숏과 안 맞을 수 있어(정렬·필터 결과가
   * 그 사이 바뀌었을 수 있다), 다음 스크롤이 엉뚱한 페이지를 불러올 위험이 있다.
   */
  useEffect(() => {
    if (initialItems === initialItemsRef.current) return;
    initialItemsRef.current = initialItems;
    generationRef.current += 1;

    setItems(initialItems);
    setPage(initialPage);
    setTotalPages(initialTotalPages);
    setTotalCount(initialTotalCount);
  }, [initialItems, initialPage, initialTotalPages, initialTotalCount]);

  // ⚠️ `page`는 0-base 인덱스다 — 마지막 페이지의 인덱스는 `totalPages - 1`이라 그보다
  //    작아야 다음 페이지가 있다(1-base였다면 `page < totalPages`였을 자리).
  const hasMore = page < totalPages - 1;

  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMore) return;
    const generation = generationRef.current;
    isFetchingRef.current = true;
    setIsLoadingMore(true);
    setError(false);

    try {
      const next = page + 1;
      const result = await fetchPage(next);
      // ⚠️ 기다리는 사이에 목록이 통째로 초기화됐으면(위 효과) 이 응답은 낡은 세대다 — 버린다.
      if (generation !== generationRef.current) return;

      setItems((prev) => {
        const seen = new Set(prev.map(getId));
        const appended = result.items.filter((item) => !seen.has(getId(item)));
        return [...prev, ...appended];
      });
      setPage(result.page);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch {
      if (generation === generationRef.current) setError(true);
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [page, hasMore, fetchPage, getId]);

  /** 목록 끝의 빈 요소에 붙인다 — 화면에 걸리면 다음 페이지를 부른다(스크롤 이벤트 대신). */
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;
      const observer = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      });
      observer.observe(node);
      return () => observer.disconnect();
    },
    [loadMore],
  );

  /** 승인·삭제처럼 목록에서 항목이 빠지는 조작 뒤 로컬 상태를 바로 맞춘다(재조회 없이). */
  const removeItem = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((item) => getId(item) !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
    },
    [getId],
  );

  return {
    items,
    totalCount,
    hasMore,
    isLoadingMore,
    error,
    loadMore,
    sentinelRef,
    removeItem,
  };
}
