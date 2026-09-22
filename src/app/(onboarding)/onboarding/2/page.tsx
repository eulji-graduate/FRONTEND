import type { Metadata } from "next";

import { OnboardingShell } from "@/features/onboarding/components/onboarding-shell";
import { PositionSetup } from "@/features/onboarding/components/position-setup";
import { guardOnboardingStep } from "@/features/onboarding/guard";
import { getPositions } from "@/features/onboarding/server";
import { ONBOARDING_STEP } from "@/features/onboarding/types";

export const metadata: Metadata = {
  title: "직급 체계 설정",
};

export default async function OnboardingPositionPage() {
  // ⚠️ 이미 온보딩을 마쳤거나 OWNER가 아니면 여기 못 머문다 — 판정은 서버가 한다
  await guardOnboardingStep();

  const positions = await getPositions();

  return (
    <OnboardingShell step={ONBOARDING_STEP.POSITION}>
      <PositionSetup initialPositions={positions} />
    </OnboardingShell>
  );
}
