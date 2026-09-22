"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";

import type { NoticeTargetCompany } from "../types";

interface NoticeCompanyPickerProps {
  companies: NoticeTargetCompany[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

/** 검색 결과로 한 번에 보여줄 최대 개수 — 데모라 넉넉히 자른다. */
const MAX_RESULTS = 6;

/**
 * 공지 "특정 기업" 대상 선택 — 기업명·코드로 검색해 여러 곳을 골라 담는다.
 *
 * ⚠️ UI 데모다 — 실제 발송은 하지 않는다(§정직성). 검색은 클라이언트에서 목 목록을 거르지만,
 *    실서버라면 검색어를 서버로 보내 좁힌 결과만 받아야 한다(CLAUDE.md §성능).
 */
export function NoticeCompanyPicker({
  companies,
  selectedIds,
  onChange,
}: NoticeCompanyPickerProps) {
  const [keyword, setKeyword] = useState("");

  const selected = useMemo(
    () => companies.filter((company) => selectedIds.includes(company.id)),
    [companies, selectedIds],
  );

  const results = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) return [];
    return companies
      .filter(
        (company) =>
          !selectedIds.includes(company.id) &&
          (company.name.toLowerCase().includes(query) ||
            company.code.toLowerCase().includes(query)),
      )
      .slice(0, MAX_RESULTS);
  }, [companies, keyword, selectedIds]);

  const add = (id: string) => {
    onChange([...selectedIds, id]);
    setKeyword("");
  };
  const remove = (id: string) => onChange(selectedIds.filter((value) => value !== id));

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="기업명 또는 코드로 검색"
          aria-label="대상 기업 검색"
          className="pl-8"
        />
      </div>

      {/* 검색 결과 — 키워드가 있을 때만 뜬다 */}
      {keyword.trim().length > 0 && (
        <div className="border-border overflow-hidden rounded-lg border">
          {results.length === 0 ? (
            <p className="text-muted-foreground px-3 py-3 text-[12px] leading-4">
              검색 결과가 없습니다
            </p>
          ) : (
            <ul>
              {results.map((company) => (
                <li key={company.id}>
                  <button
                    type="button"
                    onClick={() => add(company.id)}
                    className="hover:bg-muted focus-visible:ring-ring flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="text-foreground truncate text-[12px] leading-4">
                      {company.name}
                    </span>
                    <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                      {company.code}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 선택된 대상 — 칩으로 보여주고 X로 뺀다 */}
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((company) => (
            <span
              key={company.id}
              className="bg-muted text-foreground inline-flex items-center gap-1 rounded-md py-1 pr-1 pl-2 text-[12px] leading-4"
            >
              {company.name}
              <button
                type="button"
                onClick={() => remove(company.id)}
                aria-label={`${company.name} 제외`}
                className="hover:bg-foreground/10 focus-visible:ring-ring flex size-4 items-center justify-center rounded transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <X className="size-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-[11px]">공지를 보낼 기업을 검색해 선택하세요</p>
      )}
    </div>
  );
}
