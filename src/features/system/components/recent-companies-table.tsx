import { Building2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { TABLE_HEAD_CELL_CLASS, TABLE_HEAD_ROW_CLASS } from "../table-style";
import type { RecentCompany } from "../types";
import { SystemCardHeading } from "./system-card-heading";

/** 표 머리 셀 — 높이·글자 크기는 `table-style.ts`가 정한다(표 다섯 개가 같은 값). */
const HEAD_CELL_CLASS = cn(TABLE_HEAD_CELL_CLASS, "text-muted-foreground font-normal");

/**
 * "최근 가입 기업" 표. 비어있으면 안내 문구로 대체한다(CLAUDE.md §정직성 · loading/error/empty).
 *
 * ⚠️ 셀 규격을 **기준 화면과 같게** 맞춘다(DESIGN §3·§4) — 본문 13px, **양 끝 열**(기업명·가입일)
 *    `px-7`, 가운데 열 `px-4`. 양 끝만 넓은 건 카드 제목(`px-7`)과 왼쪽·오른쪽 끝을 맞추기
 *    위해서다. 한때 전부 12px에 `pl-4`라 표가 제목보다 안쪽으로 들어가 끝이 어긋나 보였다.
 */
export function RecentCompaniesTable({ companies }: { companies: RecentCompany[] }) {
  if (companies.length === 0) {
    // 크기는 develop의 개편(#74)을 따르고, 문구만 합니다체로 둔다(2026-08-04 카피 변경)
    return (
      <section className="border-border bg-card rounded-2xl border">
        <SystemCardHeading icon={Building2}>최근 가입 기업</SystemCardHeading>
        <p className="text-muted-foreground px-7 pb-10 text-center text-[13px] leading-5">
          아직 가입한 기업이 없습니다
        </p>
      </section>
    );
  }

  return (
    <section className="border-border bg-card overflow-hidden rounded-2xl border">
      <SystemCardHeading icon={Building2}>최근 가입 기업</SystemCardHeading>

      <div className="overflow-x-auto">
        <Table className="min-w-[520px] text-[13px]">
          <TableHeader>
            <TableRow className={TABLE_HEAD_ROW_CLASS}>
              <TableHead className={`${HEAD_CELL_CLASS} px-7`}>기업명</TableHead>
              <TableHead className={`${HEAD_CELL_CLASS} px-4 text-center`}>기업 코드</TableHead>
              <TableHead className={`${HEAD_CELL_CLASS} px-4 text-center`}>구성원</TableHead>
              <TableHead className={`${HEAD_CELL_CLASS} px-7 text-center`}>가입일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id} className="hover:bg-foreground/[0.04] h-12">
                <TableCell className="text-foreground px-7 font-medium">{company.name}</TableCell>
                <TableCell
                  className="text-muted-foreground px-4 text-center font-mono"
                  title={company.code}
                >
                  {company.code}
                </TableCell>
                <TableCell className="text-muted-foreground px-4 text-center tabular-nums">
                  {company.memberCount}명
                </TableCell>
                {/* ⚠️ 관리자 화면 표기라 일반 화면의 "8월 5일(화)" 형식을 안 따른다(`types.ts`
                    `RecentCompany.joinedAt` 주석) — 원문 "YYYY-MM-DD" 그대로 보여준다. */}
                <TableCell className="text-muted-foreground px-7 text-center font-mono tabular-nums">
                  {company.joinedAt}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
