import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingShell } from "@/features/onboarding/components/onboarding-shell";
import { ONBOARDING_STEP } from "@/features/onboarding/types";

/** 구독 상태를 불러오는 동안. 실제 화면과 같은 골격이라 레이아웃이 흔들리지 않는다. */
export default function Loading() {
  return (
    <OnboardingShell step={ONBOARDING_STEP.PAYMENT}>
      <div className="flex flex-col gap-[21px]">
        <div className="flex flex-col gap-[7px]">
          <Skeleton className="h-[30px] w-56" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <Skeleton className="h-[320px] w-full rounded-xl" />
            <Skeleton className="h-[220px] w-full rounded-xl" />
          </div>
          <Skeleton className="h-[380px] w-full shrink-0 rounded-2xl lg:w-[380px]" />
        </div>
      </div>
    </OnboardingShell>
  );
}
