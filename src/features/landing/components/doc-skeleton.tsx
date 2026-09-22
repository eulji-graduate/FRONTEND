import { Skeleton } from "@/components/ui/skeleton";

import { LandingShell } from "./landing-shell";

/**
 * 문서형 화면을 불러오는 동안 — `DocPage`와 **같은 골격**이라 뜰 때 레이아웃이 흔들리지 않는다.
 *
 * ⚠️ 껍데기(`LandingShell`)는 그대로 그린다. 상단바까지 껌뻑이면 로딩이 더 길어 보인다 —
 *    바뀌는 건 본문뿐이다.
 */
interface DocSkeletonProps {
  /** 본문 자리 몇 칸을 잡아 둘지 — 문서마다 길이가 다르다 */
  rowCount?: number;
}

export function DocSkeleton({ rowCount = 4 }: DocSkeletonProps) {
  return (
    <LandingShell>
      <div className="mx-auto w-full max-w-[820px] px-7 py-16 lg:py-20">
        <div className="flex flex-col items-start gap-4">
          <Skeleton className="size-11 rounded-xl" />
          <Skeleton className="h-10 w-[280px] rounded-lg" />
          <Skeleton className="h-6 w-[440px] max-w-full rounded-md" />
        </div>

        <div className="flex flex-col gap-3 pt-10">
          {Array.from({ length: rowCount }, (_, index) => (
            <Skeleton key={index} className="h-[132px] rounded-2xl" />
          ))}
        </div>
      </div>
    </LandingShell>
  );
}
