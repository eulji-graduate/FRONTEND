"use client";

import { Check, ChevronLeft } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 3단계 아래 버튼 줄.
 *
 * ⚠️ **[다음]이 아니라 [완료]다**(2026-08-04). 조직 구성이 여기서 끝나고 초대장도 함께 나간다 —
 *    다음 칸으로 넘어가는 것과 무게가 다르다. 남은 결제는 4단계 진행 표시가 알린다.
 * ⚠️ [완료]는 링크가 아니라 **버튼**이다. 확인 창을 거쳐야 넘어간다.
 * ⚠️ 시안의 주 버튼은 액센트(파랑)가 아니라 먹색이다(토큰 충돌 — 팀 확인 필요).
 */
export function InviteFooter({ onCommit }: { onCommit: () => void }) {
  return (
    <div className="border-border flex items-center justify-end gap-2 border-t pt-[17.5px]">
      <Link
        href="/onboarding/2"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-[34px] gap-1 text-[13px] leading-none",
        )}
      >
        <ChevronLeft className="size-3.5" />
        <span className="leading-none">이전</span>
      </Link>

      <button
        type="button"
        onClick={onCommit}
        className={cn(
          buttonVariants(),
          "bg-foreground text-background hover:bg-foreground/90 h-[34px] gap-[5.25px] rounded-md px-[12.25px] text-[13px] leading-none",
        )}
      >
        <Check className="size-3.5" />
        <span className="leading-none">완료</span>
      </button>
    </div>
  );
}
