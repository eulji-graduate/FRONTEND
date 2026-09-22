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
import {
  COMPANY_SORT,
  COMPANY_SORT_LABEL,
  COMPANY_STATUS,
  COMPANY_STATUS_LABEL,
} from "@/constants/domain";

const SORT_OPTIONS = Object.values(COMPANY_SORT);
const STATUS_OPTIONS = Object.values(COMPANY_STATUS);

/** 정렬 기본값 — 아무것도 안 고르면 최신 가입순. 이 값이면 URL에 sort를 안 붙인다. */
const DEFAULT_SORT = COMPANY_SORT.JOINED_DESC;

/** 필터 셀렉트의 "전체" 값 — 빈 문자열은 URLSearchParams가 지워버려 구분이 안 된다 */
const ALL = "ALL";

/*
  ⚠️ 컴포넌트 밖(모듈 스코프)에 둔다 — 렌더마다 새 객체를 `Select`의 `items`로 넘기면
     base-ui 내부 이펙트가 참조 변화 → store 갱신 → 리렌더 → 새 객체를... 반복해
     "Maximum update depth exceeded"로 이어진다(CI에서 실제로 터졌다). 값이 상수라
     `useMemo`도 필요 없이 여기서 한 번만 만들면 참조가 계속 같다.
*/
const STATUS_ITEMS = { [ALL]: "전체 상태", ...COMPANY_STATUS_LABEL };

/**
 * 기업명·코드 검색 + 규모·상태 필터.
 *
 * ⚠️ 검색·필터 결과는 **URL 쿼리로 표현한다** — 서버 컴포넌트(페이지)가 그 쿼리를 읽어
 *    목록을 좁힌다(CLAUDE.md §핵심 4원칙 ①: 조회는 Server Component). 그래서 이 바는
 *    입력만 받고 실제 필터링은 하지 않는다 — 목록 필터링 로직이 두 곳에 흩어지지 않는다.
 * ⚠️ 필터가 바뀌면 **1페이지로 되돌린다** — 3페이지를 보다가 검색하면 빈 화면을 만날 수 있다.
 */
export function CompanyFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get("q") ?? "");

  const pushWith = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === ALL) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    router.push(`/system/companies?${params.toString()}`);
  };

  return (
    /*
      ⚠️ **스스로 폭을 밀지 않는다.** 전에는 이 줄이 화면을 통째로 차지해서
         검색칸에 `w-full sm:ml-auto`로 오른쪽 끝까지 밀어 두고 있었는데, 이제는
         `전체 N건`과 한 줄에 서므로 그 밀기가 남아 있으면 줄이 넘쳐 두 줄로 깨진다.
    */
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="relative w-56 max-w-full">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") pushWith({ q: keyword });
          }}
          onBlur={() => pushWith({ q: keyword })}
          placeholder="기업명 또는 코드 검색"
          aria-label="기업명 또는 코드 검색"
          className="pl-8"
        />
      </div>

      <Select
        items={COMPANY_SORT_LABEL}
        value={searchParams.get("sort") ?? DEFAULT_SORT}
        onValueChange={(value) =>
          pushWith({ q: keyword, sort: value === DEFAULT_SORT ? "" : (value ?? "") })
        }
      >
        <SelectTrigger aria-label="정렬 기준" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent side="bottom" alignItemWithTrigger={false}>
          {SORT_OPTIONS.map((sort) => (
            <SelectItem key={sort} value={sort}>
              {COMPANY_SORT_LABEL[sort]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={STATUS_ITEMS}
        value={searchParams.get("status") ?? ALL}
        onValueChange={(value) => pushWith({ q: keyword, status: value ?? ALL })}
      >
        <SelectTrigger aria-label="상태 필터" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent side="bottom" alignItemWithTrigger={false}>
          <SelectItem value={ALL}>전체 상태</SelectItem>
          {STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {COMPANY_STATUS_LABEL[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
