"use client";

import Link from "next/link";

import { ResultDialog } from "@/components/common/result-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { calculatePrice, formatGb, formatTokens, formatWon } from "../pricing";
import type { BillingConfig } from "../types";

interface PaymentDoneDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  config: BillingConfig;
  /**
   * 결제 뒤에 갈 곳 — **화면마다 다르다.**
   *
   * ⚠️ 여기에 `/owner`를 박아 두지 않는다. 결제하는 사람이 대표라는 보장이 없고
   *    (Admin 겸직자도 한다), 이미 워크스페이스 안에서 결제한 사람에게는 대시보드로
   *    보내는 것 자체가 갈 일 없는 이동이다.
   */
  next: { href: string; label: string };
}

/**
 * 결제 완료 안내 — 모양은 공용 `ResultDialog`가 잡고, 여기서는 **무엇을 결제했는지**만 채운다.
 *
 * ⚠️ **실제 청구는 일어나지 않는다.** PG 연동 전이라 버튼을 누르면 이 창만 뜬다 —
 *    목 격리막으로 흐름만 이어 둔 것이고, 연동되면 결제 성공 응답을 받은 뒤에 연다.
 * ⚠️ 포함량을 같이 적는다. 결제 직후가 **"내가 얼마치를 쓸 수 있나"를 가장 궁금해하는 순간**이다.
 */
export function PaymentDoneDialog({ isOpen, onOpenChange, config, next }: PaymentDoneDialogProps) {
  const price = calculatePrice(config);

  return (
    <ResultDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="결제가 완료됐습니다"
      description="이제 바로 이용하실 수 있습니다."
      action={
        <Link
          href={next.href}
          className={cn(buttonVariants({ variant: "ink" }), "h-11 w-full text-[13px]")}
        >
          {next.label}
        </Link>
      }
    >
      <dl className="border-border flex flex-col gap-2.5 rounded-lg border p-4 text-[13px]">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">포함 AI 토큰</dt>
          <dd className="tabular-nums">월 {formatTokens(config.includedTokens)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">포함 저장 공간</dt>
          <dd className="tabular-nums">{formatGb(config.includedStorageGb)}</dd>
        </div>
        <div className="border-border mt-0.5 flex items-baseline justify-between border-t pt-3">
          <dt className="font-semibold">이번 결제</dt>
          <dd className="text-[13px] leading-5 font-semibold tabular-nums">
            {formatWon(price.total)}
          </dd>
        </div>
      </dl>
    </ResultDialog>
  );
}
