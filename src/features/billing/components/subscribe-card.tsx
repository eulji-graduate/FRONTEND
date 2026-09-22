"use client";

import { useState } from "react";

import { confirmSubscriptionAction } from "../actions";
import type { BillingConfig } from "../types";
import { CheckoutPanel } from "./checkout-panel";
import { PaymentFailedDialog } from "./payment-failed-dialog";
import { PlanSummaryCard } from "./plan-summary-card";

interface SubscribeCardProps {
  config: BillingConfig;
  /** **결제에 성공했을 때만** 불린다 — 실패는 이 카드가 창을 띄워 직접 처리한다 */
  onSubscribe: () => void;
  /** 버튼 문구. 기본은 "결제하기" */
  actionLabel?: string;
}

/**
 * 구독 시작 — **고를 게 없는 화면**이다.
 *
 * 좌석 슬라이더도 결제 주기 토글도 없다(2026-08-04 팀 확정) — 과금이 좌석이 아니라
 * **기본료 + 사용량**이고 주기는 월간뿐이라, 여기서 정할 값이 남아 있지 않다.
 * 그래서 "고르는 화면"이 아니라 **"이걸 삽니다"를 확인하는 화면**으로 만든다.
 *
 * ⚠️ **금액·포함량을 화면에 박지 않는다.** 전부 `BillingConfig`에서 읽는다 —
 *    실측 전 가정값이라 바뀔 것이 확정돼 있다(팀 확정: 하드코딩 금지).
 * ⚠️ **실제 청구는 아직 없다.** 목 격리막으로 흐름만 이어 두고, 화면에는 그 사실을 적는다 —
 *    연결도 안 된 PG 이름을 적어 두면 실제로 빠져나가는 줄 안다(§정직성).
 */
export function SubscribeCard({
  config,
  onSubscribe,
  actionLabel = "결제하기",
}: SubscribeCardProps) {
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedRecurring, setAgreedRecurring] = useState(false);
  const [isPending, setIsPending] = useState(false);
  /** 실패했을 때 띄울 창 — `null`이면 안 뜬다 */
  const [failure, setFailure] = useState<string | null>(null);

  const canSubmit = agreedTerms && agreedRecurring && !isPending;

  /*
    ⚠️ **결제 요청을 이 안에서 한다.** 세 화면(온보딩 4단계 · 구독 재개 · 그다음에 붙을 것)이
       이 카드를 함께 쓰는데, 부르는 쪽에 맡기면 실패 처리를 하나만 빠뜨려도 그 화면에서는
       결제가 조용히 실패한다 — 성공만 밖으로 알린다.
    ⚠️ 누르는 동안 잠근다. 두 번 눌러 두 번 청구되는 건 되돌리기 어렵다.
  */
  const handleSubmit = async () => {
    setIsPending(true);
    try {
      const result = await confirmSubscriptionAction();
      if (result.isSuccess) {
        onSubscribe();
        return;
      }
      // ⚠️ 사유를 모르면 `undefined`로 넘긴다 — 창이 일반 문구를 쓴다. 지어내지 않는다.
      setFailure(result.message ?? "");
    } catch {
      /*
        ⚠️ **던지는 경우도 실패다.** 결제사 창을 닫거나 네트워크가 끊기면 예외로 온다 —
           잡지 않으면 아무 일도 안 일어난 것처럼 보인다.
      */
      setFailure("");
    } finally {
      /*
        ⚠️ `finally`다. 전에는 `await` 뒤에서 풀었는데, 요청이 거절되면 그 줄에 닿지 못해
           **버튼이 영영 잠긴 채로** 남았다 — 새로고침 말고는 빠져나갈 길이 없었다.
      */
      setIsPending(false);
    }
  };

  return (
    /*
      ⚠️ 두 카드는 **같은 높이**로 선다(`items-stretch`). 다만 늘어난 자리를 한 곳에 몰지 않는다 —
         오른쪽 카드는 덩어리 넷(표식 · 금액 · 내역 · 동의)을 `justify-between`으로 벌려서
         남는 높이를 **간격으로 나눠 먹는다.** 한 곳에 몰면 카드에 구멍이 뚫린 것처럼 보인다.
    */
    <div className="flex flex-col gap-7 lg:flex-row lg:items-stretch">
      <PlanSummaryCard config={config} />

      <CheckoutPanel
        config={config}
        actionLabel={actionLabel}
        agreedTerms={agreedTerms}
        agreedRecurring={agreedRecurring}
        onAgreeTerms={setAgreedTerms}
        onAgreeRecurring={setAgreedRecurring}
        canSubmit={canSubmit}
        isPending={isPending}
        onSubmit={handleSubmit}
      />

      <PaymentFailedDialog
        isOpen={failure !== null}
        onOpenChange={(open) => !open && setFailure(null)}
        message={failure || undefined}
      />
    </div>
  );
}
