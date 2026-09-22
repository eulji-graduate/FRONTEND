"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_PROJECT_SORT, PROJECT_SORT, PROJECT_SORT_LABEL } from "@/constants/domain";
import { parseProjectSort } from "@/features/project/lib";

const SORT_OPTIONS = Object.values(PROJECT_SORT);

/**
 * 프로젝트명 검색 + 정렬. 결과는 **URL 쿼리로 표현**하고 실제 필터/정렬은 서버(페이지)가 한다
 * (CLAUDE.md §서버우선) — 상태 탭(`status`)은 그대로 두고 `q`·`sort`만 바꾼다.
 */
export function ProjectToolbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get("q") ?? "");

  const pushWith = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    router.push(`/app/projects?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      {/* 폭·아이콘 자리는 사원 관리 검색과 같은 값이다(280 / left-3 / size-4 / pl-9) */}
      <div className="relative w-full max-w-[280px]">
        <Search
          className="text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") pushWith({ q: keyword });
          }}
          onBlur={() => pushWith({ q: keyword })}
          placeholder="프로젝트명 검색"
          aria-label="프로젝트명 검색"
          className="pl-9"
        />
      </div>

      <Select
        items={PROJECT_SORT_LABEL}
        value={parseProjectSort(searchParams.get("sort") ?? undefined)}
        onValueChange={(value) =>
          // 검색어(q)도 같이 실어 보낸다 — 입력 중(미제출) 검색어가 정렬 바꿀 때 날아가지 않게
          pushWith({ q: keyword, sort: value === DEFAULT_PROJECT_SORT ? "" : (value ?? "") })
        }
      >
        <SelectTrigger aria-label="정렬 기준" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent side="bottom" alignItemWithTrigger={false}>
          {SORT_OPTIONS.map((sort) => (
            <SelectItem key={sort} value={sort}>
              {PROJECT_SORT_LABEL[sort]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
