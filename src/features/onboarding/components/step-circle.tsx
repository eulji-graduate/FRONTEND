import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StepCircleTone = "current" | "done" | "idle";

interface StepCircleProps {
  children: ReactNode;
  tone: StepCircleTone;
  /** 지름(px). 좌측 제목 옆은 28, 하단 스텝퍼는 21을 쓴다. */
  size: number;
  className?: string;
}

const TONE_CLASS: Record<StepCircleTone, string> = {
  current: "bg-foreground text-background",
  // 완료도 먹색이다 — 초록은 "발송됨"처럼 상태를 알릴 때만 쓴다
  done: "bg-foreground text-background",
  idle: "bg-secondary text-muted-foreground/70",
};

/**
 * 단계 번호를 담는 원.
 * ⚠️ `leading-none`이 핵심이다 — 줄높이를 주면 숫자가 원 안에서 아래로 밀려 가운데가 안 맞는다.
 */
export function StepCircle({ children, tone, size, className }: StepCircleProps) {
  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full leading-none tabular-nums",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
