"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ProjectBrowseItem, SearchPeriod } from "../types";
import { SEARCH_PERIOD, SEARCH_PERIOD_LABEL } from "../types";

const ALL_PROJECTS_VALUE = "all";
const ALL_PROJECTS_LABEL = "전체 프로젝트";

/**
 * 결과를 좁히는 두 조건 — 프로젝트·기간. **상호작용 잎사귀**만 클라이언트다.
 * 값을 바꾸면 주소(`?project=&period=`)를 바꿔 서버가 다시 걸러 준다 — 화면 안 상태로
 * 들고 있지 않는다(§핵심 4원칙 1).
 */
export function SearchFilterBar({
  projects,
  projectTag,
  period,
}: {
  projects: ProjectBrowseItem[];
  projectTag: string | null;
  period: SearchPeriod;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /*
    ⚠️ `Select`에 `items`(값→라벨 맵)를 넘긴다. `SelectValue`는 지금 골라진 값의 라벨을
       열려 있는 목록(`SelectItem`)에서 찾는데, 닫혀 있을 때는 그 목록이 아직 렌더되지 않아
       **원문 값**(`GOODS`·`7d`)이 그대로 보인다 — `company-filter-bar.tsx`와 같은 이유.
  */
  const projectItems = useMemo(
    () => ({
      [ALL_PROJECTS_VALUE]: ALL_PROJECTS_LABEL,
      ...Object.fromEntries(projects.map((project) => [project.tag, project.name])),
    }),
    [projects],
  );

  const setParam = useCallback(
    (key: string, value: string, isDefault: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (isDefault) params.delete(key);
      else params.set(key, value);

      router.replace(`/app/search${params.size > 0 ? `?${params}` : ""}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-[12px] leading-4">필터:</span>

      <Select
        items={projectItems}
        value={projectTag ?? ALL_PROJECTS_VALUE}
        onValueChange={(next) => {
          const value = String(next);
          setParam("project", value, value === ALL_PROJECTS_VALUE);
        }}
      >
        <SelectTrigger size="sm" className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_PROJECTS_VALUE}>전체 프로젝트</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.tag} value={project.tag}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={SEARCH_PERIOD_LABEL}
        value={period}
        onValueChange={(next) => {
          const value = next as SearchPeriod;
          setParam("period", value, value === SEARCH_PERIOD.ALL);
        }}
      >
        <SelectTrigger size="sm" className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.values(SEARCH_PERIOD).map((value) => (
            <SelectItem key={value} value={value}>
              {SEARCH_PERIOD_LABEL[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
