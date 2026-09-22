"use client";

import { useState } from "react";

import { BrandBar } from "@/components/common/brand-bar";
import type { Authority } from "@/constants/authority";
import { roleHome } from "@/features/shell/home";
import { cn } from "@/lib/utils";

import { PAYMENT_WIDTH } from "../layout";
import { type Subscription, SUBSCRIPTION_STATUS } from "../subscription";
import type { BillingConfig } from "../types";
import { PaymentDoneDialog } from "./payment-done-dialog";
import { SubscribeCard } from "./subscribe-card";
import { SubscriptionBlockedDialog } from "./subscription-blocked-dialog";

interface SubscriptionGateProps {
  config: BillingConfig;
  status: Subscription["status"];
  /** 지금 보고 있는 사람의 역할 — 결제 뒤 어느 대시보드로 보낼지가 여기서 갈린다 */
  role: Authority;
  /** 결제할 수 있는 사람인지 — 대표이거나 Admin을 겸한 사람 */
  canManage: boolean;
}

/**
 * 구독이 끊긴 회사가 로그인하면 만나는 화면 — **결제 말고는 아무것도 없다.**
 *
 * ⚠️ **사이드바를 두지 않는다.** 셸이 보이면 이미 들어와 있는 것처럼 읽혀서, 왜 아무것도
 *    안 눌리는지 알 수 없다. 온보딩 4단계처럼 껍데기를 벗기고 결제 칸만 남긴다.
 * ⚠️ 결제 칸은 온보딩·구독 관리와 **같은 것**(`SubscribeCard`)을 쓴다. 돈을 내는 자리가
 *    화면마다 다르게 생기면 같은 서비스로 안 읽힌다(§컴포넌트 위생).
 * ⚠️ **결제 권한이 없는 사람에게는 이 화면을 아예 안 준다.** 눌러도 못 하는 버튼은 물론이고,
 *    결제하라는 안내 화면조차 그 사람에게는 할 일이 없는 화면이다 —
 *    공통 결과 창(`SubscriptionBlockedDialog`)으로 막고 끝낸다(§정직성).
 * ⚠️ 결제를 마치면 **`/billing/checkout`과 같은 완료 창**(`PaymentDoneDialog`)이 뜬다.
 *    온보딩 완료 화면은 못 쓴다 — 거기는 부서·직급·초대 수를 요약하는 자리라, 이미 다 만들어
 *    놓고 결제만 끊긴 회사에게는 맞지 않는 말이다.
 * ⚠️ 이 화면으로 **보내는 일은 아직 없다.** 서버 세션에 구독 상태가 실리면 `middleware.ts`가
 *    막고 여기로 돌린다 — 화면에서 막는 건 UX일 뿐 보안이 아니다(CLAUDE.md §권한).
 */
export function SubscriptionGate({ config, status, role, canManage }: SubscriptionGateProps) {
  const [isDone, setIsDone] = useState(false);

  /*
    결제할 수 없는 사람 — **창으로 막는다.** 뒤에는 브랜드 바만 남긴다.
    ⚠️ 결제 칸을 감춘 화면을 대신 보여주지 않는다. 제목·안내·카드가 전부 "결제해라"는 말인데
       정작 그럴 수 없는 사람이라, 읽을수록 무엇을 하라는 건지 알 수 없어진다.
  */
  if (!canManage) {
    return (
      <div className="bg-background bg-dot-grid min-h-screen-z flex flex-col">
        <BrandBar />

        {/*
          ⚠️ **같은 말을 창 뒤에도 그대로 둔다.** 창은 포털이라 서버가 그린 HTML에 한 글자도
             안 들어간다 — 이것만 두면 하이드레이션 전까지, 그리고 번들이 늦거나 실패하면
             영영, 로고 한 줄만 있는 빈 화면이 남는다. 왜 못 들어오는지는 JS 없이도
             읽혀야 한다(§정직성).
          ⚠️ 이 페이지의 **`h1`도 여기 있다.** 창 제목은 `h2`로 나가서(Base UI `Dialog.Title`),
             이게 없으면 권한 있는 사람의 화면에는 있는 제목이 권한 없는 사람에게만 사라진다.
          ⚠️ **결제 칸은 여전히 안 그린다.** 눌러도 못 하는 버튼을 주는 건 안내가 아니라
             막다른 길이다 — 말만 남기고 조작은 창이 준다.
        */}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[21px] py-6">
          <div className="m-auto flex w-full max-w-[420px] flex-col gap-[7px] pb-16 text-center">
            <h1 className="text-2xl leading-[30px] font-semibold tracking-[-0.48px] break-keep">
              {status === SUBSCRIPTION_STATUS.UNPAID
                ? "결제가 확인되지 않았습니다"
                : "구독이 종료되었습니다"}
            </h1>
            <p className="text-muted-foreground text-[13px] leading-5 break-keep">
              결제가 끝나야 워크스페이스가 열립니다. 결제는 대표 또는 Admin 권한을 가진 분만 할 수
              있습니다.
            </p>
          </div>
        </main>

        <SubscriptionBlockedDialog status={status} />
      </div>
    );
  }

  const isUnpaid = status === SUBSCRIPTION_STATUS.UNPAID;

  return (
    <div className="bg-background bg-dot-grid min-h-screen-z flex flex-col">
      <BrandBar />

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[21px] py-6 lg:py-10">
        {/*
          ⚠️ `m-auto`다(`mx-auto`가 아니다). 온보딩 셸과 같은 방식으로 **자리가 남을 때만**
             세로 가운데로 밀고, 내용이 넘치면 0이 된다 — `justify-center`로 하면 넘칠 때
             위쪽이 스크롤 시작점 밖으로 밀려나 아예 닿을 수 없다.
          ⚠️ 아래 여백(`pb-16`)은 **온보딩 하단 바(64px) 자리**다. 저기는 스텝퍼가 아래를
             받쳐 주는데 여기는 없어서, 똑같이 가운데에 두면 화면이 아래로 처져 보인다.
        */}
        <div className={cn(PAYMENT_WIDTH, "m-auto flex w-full flex-col gap-[21px] pb-16")}>
          <div className="flex flex-col gap-[7px]">
            <h1 className="text-2xl leading-[30px] font-semibold tracking-[-0.48px]">
              {isUnpaid ? "결제가 확인되지 않았습니다" : "구독이 종료되었습니다"}
            </h1>
            {/*
              ⚠️ **무엇이 사라졌는지 적지 않는다.** 회의록·자막을 어떻게 다루는지는 팀이 정하지
                 않은 정책이라, 화면에 적으면 그게 약속이 된다(DECISIONS §미확정).
                 지금 말할 수 있는 건 "결제해야 다시 열린다"까지다.
            */}
            <p className="text-muted-foreground text-[13px] leading-5 break-keep">
              결제를 마치면 워크스페이스가 다시 열립니다.
            </p>
          </div>

          <SubscribeCard config={config} onSubscribe={() => setIsDone(true)} />
        </div>
      </main>

      {/*
        여기는 반대다 — 워크스페이스가 **닫혀 있던** 사람이라, 결제를 마치면 안으로 들여보낸다.
        ⚠️ 갈 곳은 **그 사람의 역할**이 정한다. 결제한 사람이 대표라는 보장이 없다.
      */}
      <PaymentDoneDialog
        isOpen={isDone}
        onOpenChange={setIsDone}
        config={config}
        next={{ href: roleHome(role), label: "대시보드로 가기" }}
      />
    </div>
  );
}
