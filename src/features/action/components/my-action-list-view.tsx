"use client";

import { useCallback } from "react";

import { InfiniteListFooter } from "@/components/common/infinite-list-footer";
import { useInfiniteScrollList } from "@/hooks/use-infinite-scroll-list";
import { pickPaletteColor } from "@/lib/palette";

import { fetchMyActionsPageAction } from "../actions";
import { groupMyActionsByProject } from "../mapper";
import type { MyActionListItem } from "../types";
import { MyActionListItemRow } from "./my-action-list-item";

/**
 * 내 액션 목록 — **서버가 자르고, 화면이 이어 붙인다**(CLAUDE.md §목록·페이지네이션).
 *
 * ⚠️ 첫 페이지는 서버 컴포넌트(page.tsx)가 렌더한 값을 그대로 받는다 — 여기서 다시 안 부른다.
 * ⚠️ 프로젝트별 묶기는 **이어 붙인 전체를 대상으로 매번 다시** 한다. 서버 정렬이
 *    `sort=dueDate&order=asc`라 그룹 순서는 대체로 안정적이지만, 새 페이지가 도착하면
 *    이미 그려진 그룹이 자랄 수 있다 — 전량을 미리 받는 것보다 정직한 동작이다.
 * ⚠️ 머리의 건수는 지금 그려진 줄 수가 아니라 **서버가 센 전체**다(`전체 N건` — 끝이 안
 *    보이는 목록은 얼마나 남았는지 알 수 없다).
 */

/** 컴포넌트 밖에 둬서 매 렌더 새 함수가 안 되게 한다(센티널 재부착 방지) */
function getId(action: MyActionListItem) {
  return String(action.id);
}

interface MyActionListViewProps {
  initialItems: MyActionListItem[];
  initialPage: number;
  initialTotalPages: number;
  initialTotalCount: number;
  /** ⚠️ mock 분기 전용 — 실연동은 토큰의 본인 소유분만 온다(server.ts). */
  assigneeName: string;
}

export function MyActionListView({
  initialItems,
  initialPage,
  initialTotalPages,
  initialTotalCount,
  assigneeName,
}: MyActionListViewProps) {
  const fetchPage = useCallback(
    (page: number) => fetchMyActionsPageAction(assigneeName, page),
    [assigneeName],
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

  const groups = groupMyActionsByProject(items);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
      <p className="text-muted-foreground text-sm tabular-nums">
        나에게 할당된 개인 액션 {totalCount}건
      </p>

      {groups.length === 0 ? (
        <section className="border-border bg-card overflow-hidden rounded-2xl border">
          <p className="text-muted-foreground flex min-h-[240px] items-center justify-center text-sm">
            아직 할당된 개인 액션이 없습니다.
          </p>
        </section>
      ) : (
        groups.map((group) => {
          const tagColor = pickPaletteColor(group.projectTag);
          return (
            <section
              key={group.projectId}
              className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border"
            >
              <div className="border-border flex shrink-0 items-baseline justify-between gap-3 border-b px-7 pt-6 pb-3">
                <h3 className="flex items-center gap-2 text-[17px] leading-7 font-semibold tracking-[-0.3px]">
                  <span className="bg-foreground size-2 rounded-full" aria-hidden />
                  {group.projectName}
                  <span
                    className="rounded px-1.5 py-0.5 font-mono text-xs leading-none font-semibold"
                    style={{ backgroundColor: tagColor.bgColor, color: tagColor.textColor }}
                  >
                    {group.projectTag}
                  </span>
                </h3>
                {/* 그룹 건수는 **지금까지 받은 것만** 센다 — 다음 페이지가 오면 늘 수 있다 */}
                <p className="text-muted-foreground text-[12px] leading-4 tabular-nums">
                  {group.actions.length}건
                </p>
              </div>
              <ul>
                {group.actions.map((action, index) => (
                  <MyActionListItemRow
                    key={action.id}
                    action={action}
                    showDivider={index > 0}
                    // ⚠️ 항상 false — 카드 위쪽 모서리는 헤더가 이미 차지해서 목록의 첫 행은
                    //    거기 안 닿는다(맞물리는 건 마지막 행뿐).
                    isFirst={false}
                    isLast={index === group.actions.length - 1}
                  />
                ))}
              </ul>
            </section>
          );
        })
      )}

      {/*
        ⚠️ 목록 끝의 빈 요소가 **감시 대상**이다(IntersectionObserver) — 화면에 걸리면 자동으로
           다음 페이지를 부른다. [더 보기] 버튼은 없다(2026-08-10 폐기). 실패하면 조용히 멈추지
           않는다 — [다시 시도]를 띄운다(§목록 3상태).
      */}
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
