import type { Metadata } from "next";

import { OnboardingPayment } from "@/features/billing/components/onboarding-payment";
import { getBillingConfig } from "@/features/billing/server";

export const metadata: Metadata = {
  title: "결제",
};

/**
 * 온보딩 마지막 단계 — **결제해야 워크스페이스가 열린다.**
 *
 * ⚠️ 사이드바·상단바가 있는 `/billing/checkout`과 **다른 화면이 아니다.** 결제 칸은 그대로
 *    쓰고 껍데기만 온보딩 셸이다 — 셸이 보이면 이미 들어온 것처럼 읽혀
 *    "여기서 막혀 있다"가 전달되지 않는다.
 * ⚠️ **무료 요금제가 없다**(2026-08-04). 그래서 이 단계를 건너뛸 길을 두지 않는다 —
 *    "나중에 하기"를 두면 조직만 만들어 놓고 안 쓰는 회사가 남는다.
 */
export default async function OnboardingPaymentPage() {
  const config = await getBillingConfig();

  return <OnboardingPayment config={config} />;
}
