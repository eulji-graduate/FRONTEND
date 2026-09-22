import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingShell } from "@/features/onboarding/components/onboarding-shell";
import { ONBOARDING_STEP } from "@/features/onboarding/types";

/** 부서를 불러오는 동안. 실제 화면과 같은 골격을 보여줘서 레이아웃이 흔들리지 않게 한다. */
export default function Loading() {
  return (
    <OnboardingShell step={ONBOARDING_STEP.DEPARTMENT}>
      <div className="flex flex-col gap-[21px]">
        <div className="flex flex-col gap-7 lg:h-[560px] lg:flex-row">
          <div className="flex w-full flex-col gap-[17.5px] lg:w-[300px] lg:shrink-0">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="flex-1" />
          </div>
          <Skeleton className="h-[440px] flex-1 lg:h-full" />
        </div>
        <div className="border-border flex justify-end border-t pt-[17.5px]">
          <Skeleton className="h-[34px] w-[68px]" />
        </div>
      </div>
    </OnboardingShell>
  );
}
