import Link from "next/link";

import { cn } from "@/lib/utils";

import {
  DEFAULT_TEAM_MEMBER_FILTER,
  DEFAULT_TEAM_MEMBER_SORT,
  TEAM_MEMBER_FILTER_TABS,
  TEAM_MEMBER_SORT_TABS,
  type TeamMemberFilter,
  type TeamMemberSort,
} from "../lib";

interface TeamMemberControlsProps {
  activeSort: TeamMemberSort;
  activeFilter: TeamMemberFilter;
}

function buildHref(sort: TeamMemberSort, filter: TeamMemberFilter): string {
  const params = new URLSearchParams();
  if (sort !== DEFAULT_TEAM_MEMBER_SORT) params.set("sort", sort);
  if (filter !== DEFAULT_TEAM_MEMBER_FILTER) params.set("filter", filter);
  const query = params.toString();
  return query ? `/team/members?${query}` : "/team/members";
}

/** 트랙 안에서 고른 것만 떠오른다 — 프로젝트·사원 관리·인수인계가 쓰는 그 거르개다 */
const TRACK_CLASS =
  "border-border bg-secondary/60 flex flex-wrap items-center gap-0.5 rounded-lg border p-0.5";
const ITEM_CLASS =
  "focus-visible:ring-ring flex h-7 items-center rounded-md px-3 text-[13px] leading-5 transition-colors focus-visible:ring-2 focus-visible:outline-hidden";
const SELECTED_CLASS = "bg-card text-foreground shadow-sm";
const IDLE_CLASS = "text-muted-foreground hover:text-foreground";

/**
 * 정렬·필터 컨트롤 — **서버우선 `<Link>`**다(프로젝트 목록·사원 관리와 같은 결).
 * 한쪽을 바꿀 때 다른 쪽 값은 그대로 유지해야 해서 둘 다 항상 같이 넘긴다.
 *
 * ⚠️ **모양은 다른 목록의 거르개와 같다**(2026-08-11 통일). 전에는 고른 것만 먹색으로 꽉 채운
 *    검은 알약이었는데, 같은 성격의 거르개가 화면마다 다르게 생겼고 이 화면에서 **제일 무거운
 *    것이 거르개**가 됐다 — 고르는 자리는 버튼이 아니다.
 * ⚠️ `정렬`·`필터` 글자 라벨은 뺀다. 트랙이 이미 "여기서 고른다"를 모양으로 말하고, 다른
 *    목록 화면 어디에도 그 라벨이 없다.
 */
export function TeamMemberControls({ activeSort, activeFilter }: TeamMemberControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <nav aria-label="정렬" className={TRACK_CLASS}>
        {TEAM_MEMBER_SORT_TABS.map((tab) => {
          const selected = activeSort === tab.sort;
          return (
            <Link
              key={tab.sort}
              href={buildHref(tab.sort, activeFilter)}
              aria-current={selected ? "page" : undefined}
              className={cn(ITEM_CLASS, selected ? SELECTED_CLASS : IDLE_CLASS)}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <nav aria-label="상태 필터" className={TRACK_CLASS}>
        {TEAM_MEMBER_FILTER_TABS.map((tab) => {
          const selected = activeFilter === tab.filter;
          return (
            <Link
              key={tab.filter}
              href={buildHref(activeSort, tab.filter)}
              aria-current={selected ? "page" : undefined}
              className={cn(ITEM_CLASS, selected ? SELECTED_CLASS : IDLE_CLASS)}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
