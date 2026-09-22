"use client";

import { TriangleAlert } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PIPELINE_STAGE_LABEL } from "@/constants/domain";
import { cn } from "@/lib/utils";

import { TABLE_HEAD_CELL_CLASS, TABLE_HEAD_ROW_CLASS } from "../table-style";
import type { FailedPipelineItem } from "../types";
import { PipelineRetryButton } from "./pipeline-retry-button";
import { SystemCardHeading } from "./system-card-heading";

/** 행 높이 — 다른 SYSTEM 표(구독·매출·기업 관리)와 같은 값으로 못박는다. 머리 높이는 `table-style.ts`가 정한다. */
const ROW_HEIGHT_CLASS = "h-[42px]";

/**
 * 컬럼 폭 — %로 고정(합 100). `table-fixed` + `colgroup`과 짝을 이뤄 회의 ID·오류 문구
 * 길이가 달라져도 다른 컬럼이 밀리지 않게 한다(`subscription-table.tsx`와 같은 이유).
 */
/**
 * 컬럼 폭 — 내용 길이에 맞춰 나눈다.
 *
 * ⚠️ 폭을 안 정하면 브라우저가 내용대로 잡는데, 거기에 오른쪽 정렬이 섞이면 그 열만
 *    제 칸 끝으로 밀려 **옆 열과 붙는다** — 실측으로 열 사이 간격이 123·101·142·**16**·83px로
 *    한 곳만 무너져 있었다.
 * ⚠️ 그래서 `시각`도 왼쪽으로 둔다. `2025-07-21 14:32`은 늘 같은 폭이라 왼쪽에 붙여도
 *    흔들리지 않는다 — 오른쪽 정렬은 **자릿수가 실제로 다른 값**에만 쓴다.
 */
const COLUMN_WIDTH = {
  meetingId: "21%",
  company: "15%",
  stage: "14%",
  failedAt: "20%",
  error: "18%",
  action: "12%",
} as const;

/**
 * "실패 목록" 표 — 재처리가 필요한 회의를 보여준다.
 *
 * ⚠️ 재처리 버튼이 붙어 상호작용이 있어 클라이언트 컴포넌트다 — 첫 로드 번들에서 빼려고
 *    `failed-pipeline-table-loader.tsx`가 `next/dynamic`으로 감싼다(CLAUDE.md §최적화).
 */
export function FailedPipelineTable({ items }: { items: FailedPipelineItem[] }) {
  if (items.length === 0) {
    return (
      <div className="border-border bg-card flex items-center justify-center rounded-2xl border p-10 text-center">
        <p className="text-muted-foreground text-[13px] leading-5">재처리할 실패 건이 없습니다.</p>
      </div>
    );
  }

  return (
    <section className="border-border bg-card overflow-hidden rounded-2xl border">
      <SystemCardHeading icon={TriangleAlert}>실패 목록</SystemCardHeading>

      <div className="overflow-x-auto">
        <Table className="table-fixed text-[12px] leading-4">
          <colgroup>
            <col style={{ width: COLUMN_WIDTH.meetingId }} />
            <col style={{ width: COLUMN_WIDTH.company }} />
            <col style={{ width: COLUMN_WIDTH.stage }} />
            <col style={{ width: COLUMN_WIDTH.failedAt }} />
            <col style={{ width: COLUMN_WIDTH.error }} />
            <col style={{ width: COLUMN_WIDTH.action }} />
          </colgroup>
          <TableHeader>
            <TableRow className={TABLE_HEAD_ROW_CLASS}>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "pl-7")}>회의 ID</TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "text-center")}>기업</TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "text-center")}>실패 단계</TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "text-center")}>시각</TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "text-center")}>오류</TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "pr-7 text-center")}>액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.meetingId}
                className={cn(ROW_HEIGHT_CLASS, "hover:bg-foreground/[0.04]")}
              >
                <TableCell className="text-foreground pl-7 font-mono font-medium">
                  {item.meetingId}
                </TableCell>
                <TableCell
                  className="text-foreground max-w-0 truncate text-center"
                  title={item.companyName}
                >
                  {item.companyName}
                </TableCell>
                <TableCell className="text-destructive text-center">
                  {PIPELINE_STAGE_LABEL[item.stage]}
                </TableCell>
                <TableCell className="text-muted-foreground text-center font-mono tabular-nums">
                  {item.failedAt}
                </TableCell>
                <TableCell
                  className="text-muted-foreground max-w-0 truncate text-center"
                  title={item.errorMessage}
                >
                  {item.errorMessage}
                </TableCell>
                <TableCell className="pr-7 text-center">
                  <PipelineRetryButton meetingId={item.meetingId} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
