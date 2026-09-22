import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { DarkSection } from "./dark-section";

/** 마지막 한 번 더 — 여기까지 읽었으면 시작할 마음이 있는 사람이다. */
export function ClosingSection() {
  return (
    <DarkSection className="py-28 lg:py-36">
      <div className="reveal-on-scroll relative flex flex-col items-center gap-6 text-center">
        <h2 className="text-[36px] leading-[44px] font-semibold tracking-[-0.9px] break-keep lg:text-[48px] lg:leading-[56px]">
          지금 Z를 시작해 보세요
        </h2>
        {/*
          ⚠️ **"결제 없이"라고 하지 않는다.** 무료 요금제가 없어졌으므로(2026-08-04)
             그 말은 거짓이고, 신청까지 온 사람이 결제 화면에서 배신감을 느낀다(§정직성).
          ⚠️ **"승인 뒤 바로 열린다"고도 하지 않는다.** 승인과 워크스페이스 사이에 초기 설정과
             결제가 있다 — 순서를 빼먹으면 결제 관문에서 이야기가 달라진다.
        */}
        <p className="text-landing-dark-muted text-[16px] leading-6 break-keep">
          기업 등록이 승인되면 초기 설정과 결제를 마치고 바로 시작합니다
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          <Link
            href="/plans"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "border-landing-dark-border text-landing-dark-foreground hover:bg-landing-dark-surface landing-light:bg-gradient-to-b landing-light:from-white landing-light:to-[#fbfbfa] h-11 rounded-lg bg-transparent px-5 text-[13px]",
            )}
          >
            요금제 보기
          </Link>
          {/* 검정 위라 버튼은 흰 바탕에 먹색 글자로 뒤집는다 */}
          <Link
            href="/register"
            className={cn(
              buttonVariants(),
              "bg-foreground text-background hover:bg-foreground/90 h-11 gap-1.5 rounded-lg px-6 text-[13px]",
            )}
          >
            시작하기
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </DarkSection>
  );
}
