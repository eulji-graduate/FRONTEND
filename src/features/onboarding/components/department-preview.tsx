"use client";

import { flattenDepartments } from "../tree";
import type { DepartmentNode } from "../types";
import { useScrollToLatest } from "../use-scroll-to-latest";

/** 좌측 축약 미리보기 — 트리와 같은 상태를 보고 그린다. */
export function DepartmentPreview({ departments }: { departments: DepartmentNode[] }) {
  const rows = flattenDepartments(departments);
  // 부서가 늘면 새로 생긴 쪽으로 따라 내려간다(스크롤바는 숨긴 채로)
  const listRef = useScrollToLatest<HTMLUListElement>(rows.length);

  if (rows.length === 0) {
    return (
      <div className="border-border bg-background/50 flex min-h-20 flex-1 items-center justify-center rounded-lg border p-3">
        <p className="text-muted-foreground/70 text-[11px]">아직 팀이 없습니다</p>
      </div>
    );
  }

  return (
    // 남는 세로 공간을 채운다. 부서가 많아지면 안에서만 스크롤한다(스크롤바 숨김)
    <ul
      ref={listRef}
      className="border-border bg-background/50 flex min-h-20 flex-1 flex-col gap-1.5 overflow-auto overscroll-contain rounded-lg border p-3"
    >
      {rows.map(({ id, name, depth }) => (
        <li
          key={id}
          className="animate-in fade-in slide-in-from-bottom-1 flex items-center gap-1.5 duration-200"
          style={{ paddingLeft: `${depth * 14}px` }}
        >
          <span
            className={
              depth === 0
                ? "bg-foreground size-[7px] shrink-0 rounded-full"
                : "bg-muted-foreground size-[5px] shrink-0 rounded-full"
            }
            aria-hidden
          />
          <span
            className={
              depth === 0
                ? "text-foreground truncate text-[11px]"
                : "text-muted-foreground truncate text-[11px]"
            }
          >
            {name}
          </span>
        </li>
      ))}
    </ul>
  );
}
