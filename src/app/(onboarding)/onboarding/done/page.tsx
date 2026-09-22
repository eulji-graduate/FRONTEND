import type { Metadata } from "next";

import { calculatePrice, formatWon } from "@/features/billing/pricing";
import { getBillingConfig } from "@/features/billing/server";
import { OnboardingDone } from "@/features/onboarding/components/onboarding-done";

export const metadata: Metadata = {
  title: "초기 설정 완료",
};

/**
 * 온보딩 완료.
 *
 * ⚠️ **결제 결과는 서버에서 읽는다.** 앞 단계(4단계 결제)가 끝난 뒤라 구독이 살아 있고,
 *    그 값을 그대로 요약에 보여준다 — 화면이 들고 넘어오면 새로고침 한 번에 사라진다.
 * ⚠️ **목이다.** 실제 결제가 안 붙어 있어(Toss 미정) 구독 목이 늘 결제된 상태로 온다.
 *    연동되면 결제 응답의 금액·포함량을 그대로 쓴다.
 */
export default async function OnboardingDonePage() {
  const config = await getBillingConfig();
  // 금액은 결제 화면과 **같은 함수**로 만든다 — 따로 계산하면 방금 본 숫자와 어긋난다
  const price = calculatePrice(config);
  /*
    ⚠️ **금액만** 적는다. 포함량(AI 토큰 · 저장 공간)까지 붙였더니 이 줄만 다른 줄의 두 배로
       길어져 표가 한쪽으로 쏠렸다 — 포함량은 방금 결제 화면에서 본 값이라 여기서 또 말할 이유가 없다.
  */
  const paymentSummary = `월 ${formatWon(price.total)}`;

  return <OnboardingDone paymentSummary={paymentSummary} />;
}
