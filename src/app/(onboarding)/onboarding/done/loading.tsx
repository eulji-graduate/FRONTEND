import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingShell } from "@/features/onboarding/components/onboarding-shell";
import { ONBOARDING_STEP } from "@/features/onboarding/types";

/** 완료 화면을 그리는 동안 — 실제 화면과 같은 골격이라 뜰 때 흔들리지 않는다. */
export default function Loading() {
  return (
    <OnboardingShell step={ONBOARDING_STEP.INVITE} isDone>
      <div className="mx-auto flex w-full max-w-[420px] flex-col items-center gap-6">
        <Skeleton className="size-[68px] rounded-full" />
        <div className="flex w-full flex-col items-center gap-2">
          <Skeleton className="h-[26px] w-[120px] rounded-md" />
          <Skeleton className="h-[21px] w-full rounded-md" />
        </div>
        <Skeleton className="h-[141px] w-full rounded-lg" />
        <Skeleton className="h-[38px] w-full rounded-md" />
      </div>
    </OnboardingShell>
  );
}
