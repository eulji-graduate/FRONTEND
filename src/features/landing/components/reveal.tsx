import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 스크롤에 맞춰 떠오르는 껍데기.
 *
 * ⚠️ JS(IntersectionObserver) 방식은 일부 블록이 투명하게 남는 사고가 있어서 뺐다.
 *    지금은 CSS `animation-timeline: view()`다 — `@supports`로 감싸서
 *    미지원 브라우저는 그냥 정지 화면이 된다. 글이 사라질 길이 없다.
 */
/**
 * 나란히 놓인 것들이 한꺼번에 뜨지 않게 순서를 준다.
 * ⚠️ 스크롤 타임라인에는 시간 지연이 없다 — **구간을 미는** 방식이라 클래스로 단계를 준다.
 */
const STEP_CLASS = ["", "reveal-step-1", "reveal-step-2"] as const;

/** 어느 쪽에서 들어오는지 — 좌우로 갈린 배치에서는 자기 자리 쪽에서 밀려와야 자연스럽다 */
const FROM_CLASS = {
  bottom: "",
  left: "reveal-from-left",
  right: "reveal-from-right",
} as const;

export function Reveal({
  children,
  className,
  step = 0,
  from = "bottom",
}: {
  children: ReactNode;
  /** 나란한 형제들 사이의 순서(0·1·2). 그보다 많으면 마지막 단계로 묶인다 */
  step?: number;
  /** 들어오는 방향. 기본은 아래에서 위로 */
  from?: keyof typeof FROM_CLASS;
  className?: string;
}) {
  return (
    <div
      className={cn("reveal-on-scroll", FROM_CLASS[from], STEP_CLASS[Math.min(step, 2)], className)}
    >
      {children}
    </div>
  );
}
