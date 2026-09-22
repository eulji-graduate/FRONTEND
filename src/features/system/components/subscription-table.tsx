"use client";

import { CreditCard } from "lucide-react";
import { type ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PAYMENT_STATUS, PAYMENT_STATUS_LABEL } from "@/constants/domain";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";

import { sendUnpaidNoticeAction } from "../actions";
import { formatWon } from "../format";
import { TABLE_HEAD_CELL_CLASS, TABLE_HEAD_ROW_CLASS } from "../table-style";
import type { SubscriptionRecord } from "../types";
import { NoticeMailDialog } from "./notice-mail-dialog";
import { StatusBadge, type StatusTone } from "./status-badge";
import { SystemCardHeading } from "./system-card-heading";

interface SubscriptionTableProps {
  subscriptions: SubscriptionRecord[];
  /**
   * 제목 줄 오른쪽에 붙는 이동 링크 — 부르는 화면이 넘긴다.
   * ⚠️ 표가 아는 일이 아니라 **화면이 아는 일**이다(어디로 보낼지는 화면 맥락이다).
   */
  action?: ReactNode;
}

/** 행 하나의 높이 — 고정 클래스로 못박아 내용에 따라 늘어나지 않게 한다(`company-table.tsx`와 같은 이유). */
const ROW_HEIGHT_CLASS = "h-12";

/**
 * 값 칸 — **가운데**로 세운다(`table-style.ts`의 열 정렬 규칙: 첫 열만 왼쪽, 나머지는
 * 머리글·값 둘 다 가운데). 자릿수는 `tabular-nums`가 잡아 준다.
 *
 * ⚠️ 한때 이 자리에 "오른쪽 레일로 세운다"고 적혀 있었는데 코드는 처음부터 가운데였다 —
 *    설명만 반대로 남아 있으면 다음 사람이 이 파일을 정본으로 삼아 **다른 표 넷을**
 *    오른쪽으로 고친다. 양끝 정렬은 이미 해 보고 버린 방식이다(머리글이 값의 한쪽 끝에
 *    붙어 서서 어느 값을 가리키는지 눈으로 안 잡혔다).
 */
const VALUE_CELL_CLASS = "text-muted-foreground text-center tabular-nums";

const STATUS_TONE: Record<SubscriptionRecord["paymentStatus"], StatusTone> = {
  PAID: "positive",
  UNPAID: "warning",
  CANCELED: "neutral",
};

/**
 * 컬럼 폭 — **%로 고정**한다(합 100). `table-fixed` + `colgroup`과 짝을 이뤄야 실제로 적용된다 —
 * 기업 관리·기업 승인 표에서 겪은 "페이지 전환 시 열 밀림"과 같은 문제를 처음부터 막는다.
 */
const COLUMN_WIDTH = {
  company: "26%",
  members: "10%",
  amount: "16%",
  billingDate: "20%",
  status: "14%",
  action: "14%",
} as const;

/**
 * 구독·매출 목록 — 항상 5건(미납 우선 + 최신 가입순)만 보여준다(서버에서 이미 잘라 넘겨준다).
 *
 * ⚠️ "안내 발송" 버튼은 **미납 상태에서만** 뜬다 — 완료·해지 건에는 보낼 안내가 없다.
 * ⚠️ 버튼을 누르면 **확인 Dialog**를 먼저 띄운다 — 메일 발송은 되돌릴 수 없는 조작이라
 *    토스트만으로 확인받지 않는다(CLAUDE.md §토스트: 파괴적 작업은 Dialog). "예"를 누른
 *    뒤 발송 결과는 토스트로 알린다(§토스트: 변경 결과 피드백).
 */
export function SubscriptionTable({ subscriptions, action }: SubscriptionTableProps) {
  const [isPending, startTransition] = useTransition();
  const [noticeTarget, setNoticeTarget] = useState<{
    companyId: string;
    companyName: string;
    ownerEmail: string;
  } | null>(null);

  const handleConfirm = (companyId: string) => {
    const target = noticeTarget;
    if (!target) return;

    startTransition(async () => {
      /*
        ⚠️ **던지는 경우도 잡는다.** 돌려주는 실패 값만 보면 Server Action이 reject될 때
           토스트도 없고 확인 창도 안 닫혀, 사용자가 같은 버튼을 다시 누른다(메일이 두 번 나간다).
        ⚠️ 그래서 창 닫기는 `finally`다 — 성공이든 실패든 창은 닫고, 결과는 토스트가 말한다.
      */
      try {
        const response = await sendUnpaidNoticeAction(companyId);
        if (response.success) {
          toast.success("안내 메일을 발송했습니다");
          return;
        }
        toast.error("발송하지 못했습니다");
      } catch {
        toast.error("발송하지 못했습니다");
      } finally {
        setNoticeTarget(null);
      }
    });
  };

  if (subscriptions.length === 0) {
    return (
      <div className="border-border bg-card flex items-center justify-center rounded-2xl border p-10 text-center">
        <p className="text-muted-foreground text-[13px] leading-5">구독 중인 기업이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border">
      <SystemCardHeading icon={CreditCard} action={action}>
        구독 목록
      </SystemCardHeading>
      <div className="overflow-x-auto">
        <Table className="min-w-[680px] table-fixed text-[13px]">
          {/* 각 컬럼 폭을 %로 고정 — 기업명 길이가 달라져도 다른 컬럼이 밀리지 않는다(위 COLUMN_WIDTH 참고) */}
          <colgroup>
            <col style={{ width: COLUMN_WIDTH.company }} />
            <col style={{ width: COLUMN_WIDTH.members }} />
            <col style={{ width: COLUMN_WIDTH.amount }} />
            <col style={{ width: COLUMN_WIDTH.billingDate }} />
            <col style={{ width: COLUMN_WIDTH.status }} />
            <col style={{ width: COLUMN_WIDTH.action }} />
          </colgroup>
          <TableHeader>
            <TableRow className={TABLE_HEAD_ROW_CLASS}>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "pl-7")}>기업명</TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "text-center")}>인원</TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "text-center")}>금액</TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "text-center")}>결제일</TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "text-center")}>상태</TableHead>
              <TableHead className={cn(TABLE_HEAD_CELL_CLASS, "pr-7 text-center")}>액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((subscription) => (
              <TableRow
                key={subscription.companyId}
                className={cn(ROW_HEIGHT_CLASS, "hover:bg-foreground/[0.04]")}
              >
                {/*
                  ⚠️ **이 줄의 주인공은 기업명이다.** 전에는 이름도 나머지 값과 같은 12px
                     흐린 글씨라 무엇을 보는 표인지 드러나지 않았다 — 먹색·medium으로 세운다.
                */}
                <TableCell
                  className="text-foreground max-w-0 truncate pl-7 font-medium"
                  title={subscription.companyName}
                >
                  {subscription.companyName}
                </TableCell>
                <TableCell className={VALUE_CELL_CLASS}>{subscription.memberCount}명</TableCell>
                <TableCell className={VALUE_CELL_CLASS}>{formatWon(subscription.amount)}</TableCell>
                <TableCell className={VALUE_CELL_CLASS}>
                  {subscription.billingDate ? formatDate(subscription.billingDate) : "–"}
                </TableCell>
                {/* 뱃지도 가운데다 — 상자를 한쪽 끝에 맞추면 안쪽 여백만큼 글자끼리 어긋난다(§table-style) */}
                <TableCell className="text-center">
                  <StatusBadge tone={STATUS_TONE[subscription.paymentStatus]}>
                    {PAYMENT_STATUS_LABEL[subscription.paymentStatus]}
                  </StatusBadge>
                </TableCell>
                <TableCell className="pr-7 text-center">
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    disabled={subscription.paymentStatus !== PAYMENT_STATUS.UNPAID}
                    title={
                      subscription.paymentStatus !== PAYMENT_STATUS.UNPAID
                        ? "미납 상태인 기업에만 안내를 보낼 수 있습니다"
                        : undefined
                    }
                    onClick={() =>
                      setNoticeTarget({
                        companyId: subscription.companyId,
                        companyName: subscription.companyName,
                        ownerEmail: subscription.ownerEmail,
                      })
                    }
                  >
                    안내 발송
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <NoticeMailDialog
        target={noticeTarget}
        onCancel={() => setNoticeTarget(null)}
        onConfirm={handleConfirm}
        isPending={isPending}
      />
    </div>
  );
}
