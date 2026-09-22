import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";

import { TABLE_HEAD_CELL_CLASS, TABLE_HEAD_HEIGHT_PX, TABLE_HEAD_ROW_CLASS } from "../table-style";
import type { PendingCompanyApproval } from "../types";

interface ApprovalTableProps {
  companies: PendingCompanyApproval[];
  /** 목록이 비었을 때 자리 높이를 잡는 데만 쓴다(첫 페이지 크기) */
  pageSize: number;
}

/** 행 하나의 높이 — `py-4`가 아니라 고정 클래스로 못박아 내용에 따라 늘어나지 않게 한다. */
const ROW_HEIGHT_CLASS = "h-[42px]";
const ROW_HEIGHT_PX = 42;

/**
 * 컬럼 폭 — **%로 고정**한다(합 100). 픽셀 고정이면 화면 폭이 다른 환경에서 비율이 깨진다.
 * `table-fixed` + `colgroup`과 짝을 이뤄야 실제로 적용된다 — 없으면 브라우저가 셀 내용(회사명·
 * 이메일 길이)을 보고 폭을 다시 계산해 버려, 페이지를 넘길 때마다 회사명 길이에 따라 옆 컬럼이
 * 밀리는 덜컥거림이 생긴다(`company-table.tsx`에서 같은 문제를 같은 방식으로 고쳤다).
 */
/**
 * ⚠️ 폭은 **내용 길이에 남는 폭을 고르게 얹어** 정한다. 눈대중으로 정하면 어느 열은
 *    내용이 칸을 꽉 채워 옆 열과 붙는다 — `회사명`이 20%라 가장 긴 회사명이 칸을 다 먹고
 *    다음 열과 16px까지 붙어 있었다(실측). 열 사이가 16·53·108·157·97px로 제각각이었다.
 */
const COLUMN_WIDTH = {
  name: "26%",
  businessRegistrationNumber: "16%",
  representative: "11%",
  email: "21%",
  members: "10%",
  appliedAt: "16%",
} as const;

/**
 * 승인 대기 기업 표.
 *
 * ⚠️ 행을 누르면 **주소에 `?id=`가 붙고** 상세 모달이 뜬다 — 승인·반려 버튼은 거기 있다
 *    (`company-table.tsx`와 같은 stretched-link 패턴).
 *    ⚠️ 모달이어도 **링크**다. 새 탭·주소 공유가 되고, 스크린리더가 "누를 것"으로 읽는다 —
 *       `onClick` 핸들러로 바꾸면 그 셋이 전부 사라진다.
 * ⚠️ 무한 스크롤 목록이라 채움 행(filler row)을 두지 않는다 — 페이지를 갈아 끼우던 방식과
 *    달리 항목이 아래로 이어붙기만 해서, 마지막 묶음이 `pageSize`보다 적어도 자연스럽다.
 */
export function ApprovalTable({ companies, pageSize }: ApprovalTableProps) {
  if (companies.length === 0) {
    return (
      <div
        className="border-border bg-card flex flex-col items-center justify-center rounded-2xl border p-10 text-center"
        style={{ height: TABLE_HEAD_HEIGHT_PX + pageSize * ROW_HEIGHT_PX }}
      >
        <p className="text-muted-foreground text-[13px] leading-5">
          승인 대기 중인 기업이 없습니다
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border">
      <div className="overflow-x-auto">
        <Table className="min-w-[760px] table-fixed text-[12px] leading-4">
          {/* 각 컬럼 폭을 %로 고정 — 회사명 길이가 페이지마다 달라져도 다른 컬럼이 밀리지 않는다(위 COLUMN_WIDTH 참고) */}
          <colgroup>
            <col style={{ width: COLUMN_WIDTH.name }} />
            <col style={{ width: COLUMN_WIDTH.businessRegistrationNumber }} />
            <col style={{ width: COLUMN_WIDTH.representative }} />
            <col style={{ width: COLUMN_WIDTH.email }} />
            <col style={{ width: COLUMN_WIDTH.members }} />
            <col style={{ width: COLUMN_WIDTH.appliedAt }} />
          </colgroup>
          <TableHeader>
            <TableRow className={TABLE_HEAD_ROW_CLASS}>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "pl-7")}>회사명</TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "text-center")}>
                사업자 번호
              </TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "text-center")}>대표자</TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "text-center")}>
                담당자 이메일
              </TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "text-center")}>구성원</TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "pr-7 text-center")}>
                신청일
              </TableHead>
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
                    href={`/system/approval?id=${company.id}`}
                    className="text-foreground focus-visible:ring-ring block truncate rounded font-medium after:absolute after:inset-0 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                    title={company.companyName}
                  >
                    {company.companyName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground text-center font-mono tabular-nums">
                  {company.businessRegistrationNumber}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-0 truncate text-center">
                  {company.representativeName}
                </TableCell>
                <TableCell
                  className="text-muted-foreground max-w-0 truncate text-center"
                  title={company.contactEmail}
                >
                  {company.contactEmail}
                </TableCell>
                <TableCell className="text-muted-foreground text-center tabular-nums">
                  {company.memberCount}명
                </TableCell>
                <TableCell className="text-muted-foreground pr-7 text-center tabular-nums">
                  {formatDate(company.appliedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
