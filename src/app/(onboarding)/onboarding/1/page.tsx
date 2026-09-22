import type { Metadata } from "next";

import { DepartmentSetup } from "@/features/onboarding/components/department-setup";
import { OnboardingShell } from "@/features/onboarding/components/onboarding-shell";
import { guardOnboardingStep } from "@/features/onboarding/guard";
import { getDepartments } from "@/features/onboarding/server";
import { ONBOARDING_STEP } from "@/features/onboarding/types";

export const metadata: Metadata = {
  title: "팀 체계 만들기",
};

export default async function OnboardingDepartmentPage() {
  // ⚠️ 이미 온보딩을 마쳤거나 OWNER가 아니면 여기 못 머문다 — 판정은 서버가 한다
  await guardOnboardingStep();

  const departments = await getDepartments();

  return (
    <OnboardingShell step={ONBOARDING_STEP.DEPARTMENT}>
      <DepartmentSetup initialDepartments={departments} />
    </OnboardingShell>
  );
}
