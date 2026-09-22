import Link from "next/link";

import { DEFAULT_PROJECT_SORT, type ProjectSort, type ProjectStatus } from "@/constants/domain";
import { PROJECT_FILTER_TABS } from "@/features/project/lib";
import { cn } from "@/lib/utils";

interface ProjectFilterTabsProps {
  active: ProjectStatus;
  /** 상태별 개수(검색 결과 기준) — 탭 뒤 배지 */
  counts: Record<ProjectStatus, number>;
  /** 탭을 바꿔도 검색·정렬은 유지한다 */
  keyword?: string;
  sort?: ProjectSort;
}

/**
 * 상태 필터 — `?status=`를 바꾸는 링크라 서버우선(클라 상태 없음)이다.
 *
 * ⚠️ **모양은 사원 관리의 거르개와 같다**(2026-08-10 변경). 전에는 고른 탭만 먹색으로 꽉
 *    채웠는데, 같은 성격의 거르개가 화면마다 다르게 생겼고 이 화면에서만 검은 알약이
 *    툴바에서 제일 무거운 것이 돼 [새 프로젝트] 버튼과 무게가 겹쳤다 —
 *    **고르는 자리는 버튼이 아니다.**
 * ⚠️ 그래서 **틀(트랙) 안에서 고른 것만 떠오르는** 방식이다. 배경으로 알리지 않고 층으로
 *    알린다 — 색을 하나 더 쓰지 않아도 무엇이 골라졌는지 드러난다(DESIGN §5).
 * ⚠️ 개수는 흐린 채로 둔다. 이 줄에서 먼저 읽혀야 하는 건 상태 이름이다.
 */
export function ProjectFilterTabs({ active, counts, keyword, sort }: ProjectFilterTabsProps) {
  const hrefFor = (status: ProjectStatus) => {
    const params = new URLSearchParams({ status });
    if (keyword?.trim()) params.set("q", keyword.trim());
    if (sort && sort !== DEFAULT_PROJECT_SORT) params.set("sort", sort);
    return `/app/projects?${params.toString()}`;
  };

  return (
    <nav
      aria-label="프로젝트 상태 필터"
      className="border-border bg-secondary/60 flex items-center gap-0.5 rounded-lg border p-0.5"
    >
      {PROJECT_FILTER_TABS.map((tab) => {
        const selected = tab.status === active;
        return (
          <Link
            key={tab.status}
            href={hrefFor(tab.status)}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring flex h-7 items-center gap-1.5 rounded-md px-3 text-[13px] leading-5 transition-colors focus-visible:ring-2 focus-visible:outline-hidden",
              selected
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            <span className="text-muted-foreground tabular-nums">{counts[tab.status]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
