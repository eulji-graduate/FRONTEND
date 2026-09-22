"use client";

import { Check } from "lucide-react";
import { type ReactNode, useState } from "react";

import { BrandBar } from "@/components/common/brand-bar";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { cn } from "@/lib/utils";

import { ONBOARDING_STEP_LABEL, ONBOARDING_TOTAL_STEPS, type OnboardingStep } from "../types";
import { OnboardingGuide } from "./onboarding-guide";
import { StepCircle } from "./step-circle";

const STEPS = Object.keys(ONBOARDING_STEP_LABEL).map(Number) as OnboardingStep[];

interface OnboardingShellProps {
  step: OnboardingStep;
  /**
   * 마지막 완료 화면인가.
   * 헤더의 단계 표기가 "완료"로 바뀌고, 스텝퍼는 전부 지나온 모양이 된다.
   * 도움말은 숨긴다 — 더 할 일이 없는 화면이라 알려줄 것도 없다.
   */
  isDone?: boolean;
  children: ReactNode;
}

/** 온보딩 3단계와 완료 화면이 공유하는 헤더·스텝퍼 프레임. */
export function OnboardingShell({ step, isDone = false, children }: OnboardingShellProps) {
  // 도움말은 화면 위에 떠 있는 패널이다 — 본문 레이아웃은 건드리지 않는다
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  return (
    // 배경 점 그리드 — 토큰(--border)을 그대로 써서 다크에서도 따라온다.
    // ⚠️ 화면 높이에 맞춘다 — 평소엔 페이지가 스크롤되거나
    //    끝에서 튕기지 않는다. 움직임은 카드 안쪽 목록에서만 일어난다.
    <div className="bg-background bg-dot-grid h-screen-z flex flex-col overflow-hidden overscroll-none">
      <BrandBar
        right={
          /*
            ⚠️ 테마 토글을 여기 둔다(2026-08-19) — 온보딩은 셸(사이드바) 밖이라 마이페이지의
               테마 설정에 닿을 수 없는데, 처음 여는 화면이 눈부시면 바꿀 방법이 없었다.
               전역 테마(next-themes)를 그대로 바꾸므로 워크스페이스에 들어가도 이어진다.
          */
          <span className="flex items-center gap-2">
            <ThemeToggle />
            {isDone ? (
              <span className="text-foreground text-[12px] leading-[18px]">완료</span>
            ) : (
              <span className="text-muted-foreground/70 text-[12px] leading-[18px] tabular-nums">
                단계 <span className="text-foreground">{step}</span> / {ONBOARDING_TOTAL_STEPS}
              </span>
            )}
          </span>
        }
      />

      {/*
        ⚠️ `overflow-hidden`이 아니라 `overflow-y-auto`다. 화면이 낮으면 내용이 안 들어가는데,
           숨겨버리면 다음 단계 버튼에 아예 닿을 수 없다. 평소에는 넘치지 않아 스크롤바가 안 보인다.
        ⚠️ 가운데 정렬을 `justify-center`로 하지 않는다 — 내용이 넘치면 **위쪽이 스크롤 시작점 밖으로**
           밀려나 아예 닿을 수 없다. `m-auto`는 자리가 남을 때만 가운데로 밀고, 넘치면 0이 된다.
      */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[21px] py-6 lg:py-10">
        {/*
          ⚠️ 폭은 **네 단계가 같이** 쓴다. 3단계(사원 초대)에 이름 칸이 생기면서
             1160px에서는 이름 칸·이메일 칸·에러 문구가 서로 밀어냈다.
             에러 문구를 **이메일 오른쪽**에 두려면 가로가 더 필요한데, 1440까지 키우면
             1600 미만 화면에서 오른쪽 칸(직급·Admin)이 잘린다 — 폭은 1320에서 멈추고
             문구 칸이 남는 자리를 **유연하게** 쓰게 했다.
             한 단계만 넓히면 단계를 넘길 때 화면이 들썩이므로 **전부 같이** 넓힌다.
        */}
        <div className="m-auto w-full max-w-[1320px]">{children}</div>
      </main>

      <footer className="border-border bg-background/90 flex h-16 shrink-0 items-center justify-center border-t px-[21px]">
        <ol className="flex flex-wrap items-center">
          {STEPS.map((value) => (
            <li key={value} className="flex items-center">
              <StepperItem
                label={ONBOARDING_STEP_LABEL[value]}
                step={value}
                // 완료 화면에서는 마지막 단계까지 전부 지나온 것으로 본다
                current={isDone ? ONBOARDING_TOTAL_STEPS + 1 : step}
              />
              {/* 지나온 구간은 선도 진하게 이어진다 */}
              <span
                className={cn(
                  "mx-[14px] h-px w-[35px]",
                  isDone || value < step ? "bg-foreground" : "bg-border",
                )}
                aria-hidden
              />
            </li>
          ))}
          <li className="flex items-center gap-[7px] pl-[14px]">
            <StepCircle tone={isDone ? "current" : "idle"} size={28}>
              <Check className="size-3" />
            </StepCircle>
            <span
              className={cn(
                "text-[12px] leading-[18px]",
                isDone ? "text-foreground" : "text-muted-foreground/70",
              )}
            >
              완료
            </span>
          </li>
        </ol>
      </footer>
      {!isDone && (
        <OnboardingGuide
          step={step}
          isOpen={isGuideOpen}
          onToggle={() => setIsGuideOpen((prev) => !prev)}
        />
      )}
    </div>
  );
}

function StepperItem({
  label,
  step,
  current,
}: {
  label: string;
  step: OnboardingStep;
  /** 완료 화면에서는 마지막 단계보다 큰 값이 들어온다 */
  current: number;
}) {
  const isDone = step < current;
  const isCurrent = step === current;

  return (
    <span
      className={cn(
        "flex items-center gap-[7px] text-[12px] leading-[18px]",
        isDone && "text-foreground",
        isCurrent && "text-foreground",
        !isDone && !isCurrent && "text-muted-foreground/70",
      )}
      aria-current={isCurrent ? "step" : undefined}
    >
      <StepCircle tone={isDone ? "done" : isCurrent ? "current" : "idle"} size={21}>
        {isDone ? (
          <>
            <Check className="size-[11px]" />
            <span className="sr-only">완료됨</span>
          </>
        ) : (
          <span className="text-[11px]">{step}</span>
        )}
      </StepCircle>
      {label}
    </span>
  );
}
