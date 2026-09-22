import type { ReactNode } from "react";

import type { OnboardingStep } from "../types";
import { StepCircle } from "./step-circle";

interface StepHeadingProps {
  step: OnboardingStep;
  title: string;
  children: ReactNode;
}

/** 좌측 상단 — 단계 번호 · 구분선 · 제목 · 설명. 온보딩 3단계가 같은 형태를 쓴다. */
export function StepHeading({ step, title, children }: StepHeadingProps) {
  return (
    <>
      <div className="flex items-center gap-[10.5px]">
        <StepCircle tone="current" size={28} className="text-[13px]">
          {step}
        </StepCircle>
        <span className="bg-border h-px flex-1" aria-hidden />
      </div>

      <div>
        <h1 className="text-xl leading-[25px] font-semibold tracking-[-0.4px]">{title}</h1>
        {/* ⚠️ `break-keep` — 없으면 한글이 단어 중간에서 끊긴다(`관리합니 / 다`) */}
        <p className="text-muted-foreground pt-[7px] text-[13px] leading-[21px] break-keep">
          {children}
        </p>
      </div>
    </>
  );
}
