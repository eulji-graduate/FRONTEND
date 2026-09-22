"use client";

import { useRouter } from "next/navigation";

import { OnboardingShell } from "@/features/onboarding/components/onboarding-shell";
import { ONBOARDING_STEP } from "@/features/onboarding/types";
import { cn } from "@/lib/utils";

import { PAYMENT_WIDTH } from "../layout";
import type { BillingConfig } from "../types";
import { SubscribeCard } from "./subscribe-card";

interface OnboardingPaymentProps {
  config: BillingConfig;
}

/**
 * 온보딩 4단계 · 결제.
 *
 * 결제 칸은 `/billing/checkout`과 **같은 것**을 쓴다. 다른 건 껍데기(온보딩 셸)와,
 * 여기서는 **건너뛸 수 없다**는 점뿐이다.
 *
 * ⚠️ **[나중에 하기]를 두지 않는다.** 결제를 마쳐야 워크스페이스가 열린다 —
 *    빠져나갈 길을 열어두면 조직만 만들고 멈춘 회사가 남는다.
 * ⚠️ **[이전]을 두지 않는다.** 3단계 [완료]가 초대장 발송까지 끝내서, 돌아가도 되돌릴 게 없다 —
 *    나간 메일은 취소되지 않는데 화면만 고칠 수 있으면 그게 더 큰 거짓말이다.
 *    사원 추가는 워크스페이스에 들어간 뒤 기업 설정에서 한다.
 * ⚠️ **실청구는 없다**(목 격리막). 흐름은 그대로 이어지고, 그 사실은 결제 칸이 화면에 적는다.
 */
export function OnboardingPayment({ config }: OnboardingPaymentProps) {
  const router = useRouter();

  return (
    <OnboardingShell step={ONBOARDING_STEP.PAYMENT}>
      {/*
        ⚠️ 결제 단계만 폭을 **1040px**로 좁힌다. 1·2·3단계는 표가 넓어 1320이 필요하지만,
           여기는 카드 두 장뿐이라 같은 폭에 두면 가운데가 텅 빈 채로 양끝에 붙어 보인다.
           1120px은 두 카드가 여백을 넉넉히 쓰면서도 한 화면에 들어오는 폭이다.
      */}
      <div className={cn(PAYMENT_WIDTH, "mx-auto flex w-full flex-col gap-[21px]")}>
        <div className="flex flex-col gap-[7px]">
          <h1 className="text-2xl leading-[30px] font-semibold tracking-[-0.48px]">
            구독을 시작합니다
          </h1>
          {/*
            ⚠️ **왜 지금 결제하는지**를 적는다. 앞 세 단계를 마친 사람에게 갑자기 결제창이
               뜨면 "이걸 왜 지금?"이 된다 — 결제가 마지막 관문이라는 걸 문장으로 말한다.
          */}
          <p className="text-muted-foreground text-[13px] leading-5 break-keep">
            마지막 단계입니다. 결제를 마치면 워크스페이스가 열립니다.
          </p>
        </div>

        {/* ⚠️ `replace` — 결제를 마친 뒤 뒤로가기로 결제 화면에 돌아오면 두 번 내는 것처럼 보인다 */}
        <SubscribeCard config={config} onSubscribe={() => router.replace("/onboarding/done")} />

        <div className="border-border flex items-center justify-end gap-2 border-t pt-[17.5px]">
          {/*
            ⚠️ 오른쪽에 [다음]을 두지 않는다. 넘어가는 길은 **결제 버튼 하나뿐**이고,
               버튼이 둘이면 어느 쪽이 진짜인지 헷갈린다.
          */}
          <p className="text-muted-foreground/70 text-[12px] leading-4 break-keep">
            초대장은 3단계에서 이미 나갔습니다
          </p>
        </div>
      </div>
    </OnboardingShell>
  );
}
