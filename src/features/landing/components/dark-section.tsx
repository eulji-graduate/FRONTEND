import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 랜딩 섹션 껍데기.
 *
 * ⚠️ 예전엔 검정을 덧칠하고 광원을 두 개 깔아 "띠"를 만들었다 — **지금은 안 그런다.**
 *    랜딩은 이미 `.landing-night`로 통째로 어둡고, 섹션마다 색을 더하면 그 경계가
 *    배너처럼 드러나 페이지가 조각나 보인다. 배경은 `LandingBackdrop` 한 장이 전담한다.
 * ⚠️ 남은 건 여백과 가운데 배경 장식(`backdrop`)뿐이다. 밝은 섹션과 같은 여백을 쓴다.
 */
export function DarkSection({
  children,
  className,
  backdrop,
}: {
  children: ReactNode;
  className?: string;
  /** 섹션 정중앙에 까는 배경 장식 — 안쪽 컨테이너에 넣으면 중앙이 어긋난다 */
  backdrop?: ReactNode;
}) {
  return (
    <section className={cn("relative overflow-hidden py-20 lg:py-28", className)}>
      {backdrop && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          {backdrop}
        </span>
      )}

      <div className="relative mx-auto w-full max-w-[1144px] px-7">{children}</div>
    </section>
  );
}
