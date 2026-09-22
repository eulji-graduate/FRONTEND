import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { COMPANY_STATUS_LABEL } from "@/constants/domain";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";

import { TABLE_HEAD_CELL_CLASS, TABLE_HEAD_HEIGHT_PX, TABLE_HEAD_ROW_CLASS } from "../table-style";
import type { ManagedCompany } from "../types";
import { StatusBadge, type StatusTone } from "./status-badge";

interface CompanyTableProps {
  companies: ManagedCompany[];
  buildDetailHref: (id: string) => string;
  /** 목록이 비었을 때 자리 높이를 잡는 데만 쓴다(첫 페이지 크기, `approval-table.tsx`와 같음) */
  pageSize: number;
}

/** 행 하나의 높이 — `py-4`가 아니라 고정 클래스로 못박아 내용에 따라 늘어나지 않게 한다. */
const ROW_HEIGHT_CLASS = "h-[42px]";
const ROW_HEIGHT_PX = 42;

const STATUS_TONE: Record<ManagedCompany["status"], StatusTone> = {
  ACTIVE: "positive",
  SUSPENDED: "negative",
  UNPAID: "warning",
};

/**
 * 컬럼 폭 — **%로 고정**한다(합 100). 픽셀 고정이면 화면 폭이 다른 환경(다른 PC·해상도)에서
 * 비율이 깨진다. `table-fixed` + `colgroup`과 짝을 이뤄야 실제로 적용된다 — `table-fixed` 없이는
 * 브라우저가 내용 길이를 보고 폭을 다시 계산해 버려 이 값이 무시된다.
 */
/**
 * 컬럼 폭.
 *
 * ⚠️ **열 사이 간격을 고르게** 만드는 것이 목표다. 폭을 눈대중으로 정하면 어느 열은 내용이
 *    칸을 꽉 채워 옆 열과 붙는다 — 한때 16·193·84·90·43px로 제각각이었고, 그 뒤에도
 *    44·75·76·72·71로 **기업명 뒤가 제일 좁았다**.
 * ⚠️ **기업명 뒤만 넓게 둔다.** 그 줄의 주인공이라 뒤를 떼어 놓아야 이름이 먼저 읽힌다 —
 *    나머지 네 간격은 서로 비슷해야 표가 고르게 보인다(주인공 뒤 1.6배, 나머지 균등).
 * ⚠️ 값은 **가장 긴 내용을 브라우저에서 재서** 뽑는다. 내용이 바뀌면 다시 재야 한다.
 */
const COLUMN_WIDTH = {
  name: "39%",
  code: "17%",
  members: "9%",
  meetings: "11%",
  joinedAt: "13%",
  status: "11%",
} as const;

/**
 * 기업 관리 표.
 *
 * ⚠️ 행 어디를 눌러도 상세로 들어간다 — `tr`에 `onClick`을 달지 않고 "stretched link"
 *    방식을 쓴다(CLAUDE.md §a11y: 클릭은 button/a). `approval-table.tsx`와 같은 패턴이다.
 * ⚠️ 무한 스크롤 목록이라 채움 행(filler row)을 두지 않는다 — 항목이 아래로 이어붙기만
 *    해서, 마지막 묶음이 `pageSize`보다 적어도 자연스럽다.
 */
export function CompanyTable({ companies, buildDetailHref, pageSize }: CompanyTableProps) {
  if (companies.length === 0) {
    return (
      <div
        className="border-border bg-card flex flex-col items-center justify-center rounded-2xl border p-10 text-center"
        style={{ height: TABLE_HEAD_HEIGHT_PX + pageSize * ROW_HEIGHT_PX }}
      >
        <p className="text-muted-foreground text-[13px] leading-5">조건에 맞는 기업이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border">
      <div className="overflow-x-auto">
        <Table className="min-w-[760px] table-fixed text-[12px] leading-4">
          {/* 각 컬럼 폭을 %로 고정 — 기업명이 길어져도 다른 컬럼이 밀리지 않는다(위 COLUMN_WIDTH 참고) */}
          <colgroup>
            <col style={{ width: COLUMN_WIDTH.name }} />
            <col style={{ width: COLUMN_WIDTH.code }} />
            <col style={{ width: COLUMN_WIDTH.members }} />
            <col style={{ width: COLUMN_WIDTH.meetings }} />
            <col style={{ width: COLUMN_WIDTH.joinedAt }} />
            <col style={{ width: COLUMN_WIDTH.status }} />
          </colgroup>
          <TableHeader>
            <TableRow className={TABLE_HEAD_ROW_CLASS}>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "pl-7")}>기업명</TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "text-center")}>기업 코드</TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "text-center")}>구성원</TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "text-center")}>
                이번달 회의
              </TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "text-center")}>가입일</TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "pr-7 text-center")}>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              // relative — stretched link(아래 after:absolute)가 이 행 기준으로 덮인다
              <TableRow
                key={company.id}
                className={cn(ROW_HEIGHT_CLASS, "hover:bg-foreground/[0.04] relative")}
              >
                <TableCell className="max-w-0 pl-7">
                  <Link
                    href={buildDetailHref(company.id)}
                    className="text-foreground focus-visible:ring-ring block truncate rounded font-medium after:absolute after:inset-0 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                    title={company.name}
                  >
                    {company.name}
                  </Link>
                </TableCell>
                <TableCell
                  className="text-muted-foreground max-w-0 truncate text-center"
                  title={company.code}
                >
                  {company.code}
                </TableCell>
                <TableCell className="text-muted-foreground text-center tabular-nums">
                  {company.memberCount}명
                </TableCell>
                <TableCell className="text-muted-foreground text-center tabular-nums">
                  {company.meetingCountThisMonth}회
                </TableCell>
                <TableCell className="text-muted-foreground text-center tabular-nums">
                  {formatDate(company.joinedAt)}
                </TableCell>
                <TableCell className="pr-7 text-center">
                  <StatusBadge tone={STATUS_TONE[company.status]}>
                    {COMPANY_STATUS_LABEL[company.status]}
                  </StatusBadge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
