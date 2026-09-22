"use client";

import { useState } from "react";
import { toast } from "sonner";

import { registerCardAction, toggleCancelAction } from "../actions";
import { requestCardAuth } from "../payment-method";
import {
  type BillingOverview,
  canUseWorkspace,
  type PaymentMethod,
  SUBSCRIPTION_STATUS,
} from "../subscription";
import type { BillingConfig } from "../types";
import { CancelSubscription } from "./cancel-subscription";
import { PaymentHistoryPanel } from "./payment-history-panel";
import { PaymentMethodsPanel } from "./payment-methods-panel";
import { PlanPanel } from "./plan-panel";
import { UsagePanel } from "./usage-panel";

interface BillingViewProps {
  config: BillingConfig;
  overview: BillingOverview;
  /** 바꿀 수 있는 사람인지 — Owner이거나 Admin을 겸한 사람 */
  canManage: boolean;
  /** `requestCardAuth`의 customerKey — BE가 principal의 companyId와 대조한다(다르면 400) */
  companyId: number;
}

/**
 * 구독·결제 본문 — **탭 없이 한 장**이다(2026-08-04).
 *
 * ⚠️ 처음엔 탭 셋(플랜·결제 수단·내역)이었다. 파는 플랜이 하나뿐이라 각 탭에 카드 한 장씩만
 *    있었고, 탭을 오가야 "무엇을 얼마에 어떤 카드로 내고 지난달엔 얼마였나"가 보였다 —
 *    나눌 만큼의 양이 아니면 나누지 않는 편이 낫다.
 * ⚠️ 순서가 곧 읽는 순서다: **무엇을 얼마에 → 왜 그만큼 → 어떤 카드로 → 지난 기록 → 그만두기.**
 *    해지가 맨 아래인 건 의도다 — 위에 두면 쓰는 사람이 그만두는 버튼을 먼저 만난다.
 *
 * ⚠️ 데이터는 **서버에서 받아 props로** 내려온다. 이 컴포넌트가 클라이언트인 건
 *    탭 전환과 아래 목 상태 때문이지 데이터를 가져오려는 게 아니다(§서버우선).
 * ⚠️ **상태 변경은 지금 여기 화면 안에서만 일어난다.** Server Action이 없어서다 —
 *    확인해 볼 수 있게 목으로 움직여 두되, 새로고침하면 서버 값으로 돌아간다.
 *    연동되면 이 `useState`를 지우고 액션 호출 + `revalidatePath`로 바꾼다.
 * ⚠️ 결과 토스트는 **한 줄**이다. "지금은 화면에서만 바뀐다"는 설명을 붙였더니 두 줄이 되어
 *    알약이 판처럼 커졌다 — 목이라는 사실은 연동 전 임시 상태라 화면 문구로 남길 것이 아니다.
 */
export function BillingView({ overview, config, canManage, companyId }: BillingViewProps) {
  const [subscription, setSubscription] = useState(overview.subscription);
  const [method, setMethod] = useState<PaymentMethod | null>(overview.method);

  const isCanceling = subscription.status === SUBSCRIPTION_STATUS.CANCELING;

  /*
    ⚠️ 액션은 **거절될 수도 있다.** 권한·검증 실패는 값으로 오지만, 네트워크가 끊기거나
       서버가 죽으면 호출 자체가 거절된다 — 잡지 않으면 아무 일도 안 일어난 것처럼 보이고
       콘솔에만 남는다(§정직성).
  */
  const handleToggleCancel = async () => {
    const result = await toggleCancelAction(isCanceling).catch(() => null);
    if (!result?.isSuccess) {
      toast.error(result?.message ?? "구독 상태를 바꾸지 못했습니다");
      return;
    }
    setSubscription((prev) => ({
      ...prev,
      status: isCanceling ? SUBSCRIPTION_STATUS.ACTIVE : SUBSCRIPTION_STATUS.CANCELING,
    }));
    /*
      ⚠️ **한 줄로 끝낸다.** 언제까지 쓸 수 있는지·언제 청구되는지는 화면의 해지 카드가
         계속 보여 준다 — 사라지는 토스트에 옮겨 적으면 읽기도 전에 없어진다(DECISIONS §토스트).
    */
    toast.success(isCanceling ? "구독을 계속 이어갑니다" : "구독을 해지했습니다");
  };

  /*
    결제 수단 변경 — **연동 자리를 미리 갈라 뒀다**(`payment-method.ts`).
    ⚠️ 카드 정보는 이 화면을 지나가지 않는다. 결제사 창에서 인증만 받고, 빌링키는 서버가
       발급·보관한다 — 프론트가 만지면 PCI-DSS 대상이 된다.
    ⚠️ PG가 정해지면 `requestCardAuth` 한 함수만 바꾸면 되고 여기는 그대로다.
    ⚠️ **더하는 게 아니라 갈아 끼운다.** 카드는 회사당 한 장이라 이미 있으면 그 자리를 덮는다.
    ⚠️ **던질 수 있는 호출이다.** 결제사 창을 닫거나 서버가 거절하면 예외가 난다 —
       잡지 않으면 아무 일도 안 일어난 것처럼 보이고 콘솔에만 남는다(§정직성).
    ⚠️ 여기서는 창이 아니라 토스트다. 카드 등록은 결제와 달리 **돈이 빠지지 않아서**,
       멈춰 세울 만큼의 일이 아니다(DECISIONS §토스트).
  */
  const handleChangeMethod = async () => {
    const isFirst = method === null;

    try {
      /*
        ⚠️ **결제사 창만 브라우저에서 연다.** 카드 번호는 그 창에서만 입력되고, 우리는
           `authKey`만 받는다 — 빌링키로 바꾸고 저장하는 건 서버(액션)의 일이다.
        ⚠️ `customerKey`는 세션의 기업 id다(props로 받은 `companyId`) — BE가 principal의
           companyId와 문자열 대조하므로(`BillingCommandService.register`), 다르면 BIL-009로
           400이 온다.
      */
      const auth = await requestCardAuth(String(companyId));
      const result = await registerCardAction(auth);

      if (!result.isSuccess || !result.method) {
        // ⚠️ 토스트는 한 줄(220px)이라 짧게 쓴다 — 길면 잘린다(`sonner.tsx`)
        toast.error(result.message ?? "결제 수단을 바꾸지 못했습니다");
        return;
      }

      setMethod(result.method);
      toast.success(isFirst ? "결제 수단을 등록했습니다" : "결제 수단을 변경했습니다");
    } catch {
      // 결제사 창을 닫은 경우 — 여기서만 예외로 온다
      toast.error("결제 수단을 바꾸지 못했습니다");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-7">
      {/*
        ⚠️ **`list`가 아니라 `detail`(1440 2컬럼)이다**(CLAUDE.md §디자인 토큰 — PageLayout).
           전에는 전폭 카드 다섯을 세로로 쌓았는데, 내용이 얇은데 폭만 1440이라 **옆이 비고
           아래로만 길어졌다** — 별거 없는데 스크롤이 긴 화면이 됐다.
           저장소 화면이 안 그런 건 카드가 둘이고 그중 하나가 표라서 1440을 실제로 채우기
           때문이다. 구독은 목록이 아니라 **구독 하나의 상세**라 원래 이쪽이 맞다.
        ⚠️ 나누는 기준은 **1440을 채우는가**다. 읽을 게 많은 사용량·결제 내역(표)은 주 컬럼,
           값 두어 개뿐인 플랜 지표·결제 수단·해지는 곁 컬럼이다. 한 줄짜리 카드를 전폭으로
           두면 그 줄만 1440을 가로지른다.
        ⚠️ 좁은 화면에서는 한 줄로 돌아간다(`lg:` 아래). 곁 컬럼이 먼저 오지 않게 순서를
           그대로 두었다 — 사용량이 이 화면의 본문이다.
        ⚠️ **컬럼이 아니라 줄로 나눈다.** 두 컬럼을 각각 세로로 쌓으면 왼쪽 첫 카드와
           오른쪽 첫 카드의 높이가 5px만 달라도 **둘째 줄 카드의 시작선이 그만큼 어긋난다** —
           여백을 손으로 맞춰 봤자 내용이 바뀌면 또 틀어진다. 줄마다 그리드를 두면
           같은 줄이 **저절로** 맞는다(짧은 쪽은 늘어나고 안쪽 내용은 위에 붙는다).
      */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7">
        {/*
          ⚠️⚠️ **2026-08-14** — 이 화면의 사용량·결제 내역은 실 연동이 안정되기 전까지
             더미 데이터다(`server.ts` 주석 참고). 아무 말 없이 실제인 척하면 화면이 거짓말을
             하는 셈이라, 베타 서버라는 사실을 짧게 밝힌다(§정직성).
        */}
        <p className="text-muted-foreground/70 text-[12px] leading-4">
          베타 서버라 이번 주기 사용량·결제 내역은 예시 데이터입니다
        </p>

        {/* 첫 줄 — 이번 주기 사용량 · 플랜 */}
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          <UsagePanel subscription={subscription} config={config} />
          <PlanPanel subscription={subscription} config={config} />
        </div>

        {/* 둘째 줄 — 결제 내역 · (결제 수단 → 해지) */}
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          <PaymentHistoryPanel payments={overview.payments} />

          <div className="flex flex-col gap-7">
            <PaymentMethodsPanel
              method={method}
              canManage={canManage}
              onChange={handleChangeMethod}
            />

            {/*
              ⚠️ 해지 카드는 **결제 수단 바로 밑**이다. 돈에 관한 것들이 곁 컬럼에 모여 있고
                 (플랜 → 결제 수단 → 해지), 해지는 그 이야기의 마지막이다.
              ⚠️ 아직 못 쓰는 상태(결제 전·만료)에는 해지할 게 없으니 두지 않는다.
            */}
            {canUseWorkspace(subscription.status) && (
              <CancelSubscription
                periodEnd={subscription.currentPeriodEnd}
                isCanceling={isCanceling}
                canManage={canManage}
                onConfirm={handleToggleCancel}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
