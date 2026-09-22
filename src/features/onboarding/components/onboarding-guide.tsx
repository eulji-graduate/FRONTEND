"use client";

import { Lightbulb, X } from "lucide-react";

import { ZLogo } from "@/components/icons/z-logo";
import { cn } from "@/lib/utils";

import { ONBOARDING_STEP, ONBOARDING_STEP_LABEL, type OnboardingStep } from "../types";
import { GuideDemo } from "./guide-demo";

/** 단계마다 짚어줄 것 — 화면을 보며 따라 할 수 있는 순서로 적는다. */
const GUIDE_STEPS: Record<OnboardingStep, string[]> = {
  [ONBOARDING_STEP.DEPARTMENT]: [
    "아래 칸에 팀 이름을 적고 Enter를 누릅니다.",
    "팀 줄에 마우스를 올리면 + 가 나옵니다. 누르면 그 안에 역할이 생깁니다.",
    "이름은 더블클릭해서 바꿉니다.",
    "손잡이를 끌면 순서를 바꾸거나 다른 팀으로 옮길 수 있습니다.",
  ],
  [ONBOARDING_STEP.POSITION]: [
    "직급 이름을 적고 Enter를 누릅니다.",
    "직급마다 권한을 고릅니다. Leader는 한 직급만 가질 수 있습니다.",
    "위에 있을수록 높은 직급입니다. 손잡이를 끌어 맞춥니다.",
  ],
  [ONBOARDING_STEP.INVITE]: [
    "팀 · 역할 · 직급을 앞에서부터 차례로 고릅니다.",
    /*
      ⚠️ **팀장 지정을 여기서도 말한다.** 전에는 "리더 권한 직급을 고르면 역할이 자동으로
         채워집니다"만 적혀 있었는데, 이제 역할에서 ‘리더’를 **직접 고르는** 게 정석 경로다
         (2026-08-10) — 옛 문장만 남으면 직급부터 고르러 갔다가 잠긴 칸을 만난다.
    */
    "팀장은 역할에서 ‘리더’를 고릅니다. 세부 역할이 없으면 ‘없음’을 고릅니다.",
    "팀마다 리더는 한 명입니다.",
    "주소를 적고 [완료]를 누르면 초대장이 함께 나갑니다.",
  ],
  [ONBOARDING_STEP.PAYMENT]: [
    "요금은 회사당 월 기본료 하나입니다.",
    "인원이 늘어도 금액은 그대로입니다.",
    "AI 토큰과 저장 공간은 기본료에 포함돼 있습니다. 넘긴 만큼만 다음 결제일에 더해집니다.",
    "결제를 마쳐야 워크스페이스가 열립니다.",
  ],
};

interface OnboardingGuideProps {
  step: OnboardingStep;
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * 온보딩 도움말 — 챗봇처럼 화면 위에 떠 있는 어두운 패널.
 *
 * ⚠️ **모달이 아니다.** 열어둔 채로 입력할 수 있어야 해서 덮개(overlay)도 포커스 가둠도 두지 않는다.
 *    본문 레이아웃도 건드리지 않는다 — 열고 닫아도 화면이 밀리지 않는다.
 * ⚠️ **오른쪽 아래**에 뜬다(도움말의 자리). 폭은 320px로 묶어 둔다 — 400px이던 시절엔
 *    초대 목록의 선택 칸들을 덮었다. 넓히지 말 것.
 */
export function OnboardingGuide({ step, isOpen, onToggle }: OnboardingGuideProps) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="onboarding-guide"
        aria-label={isOpen ? "도움말 닫기" : "도움말 열기"}
        className="bg-guide-surface text-guide-foreground border-guide-border focus-visible:ring-ring fixed right-6 bottom-20 z-50 flex size-11 items-center justify-center rounded-full border shadow-lg transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
      >
        {/*
          ⚠️ **Z 표식**이다. 온보딩은 아직 아무것도 없는 화면이라, 여기서 말을 거는 게
             누구인지가 표식으로 먼저 읽혀야 한다 — 일반 아이콘은 브라우저 확장처럼 보인다.
          ⚠️ 로고는 `currentColor`라 버튼이 정한 글자색(`--guide-foreground`)을 따라간다.
             패널이 밝아지든 어두워지든 따로 손댈 곳이 없다(§디자인 토큰).
        */}
        {isOpen ? <X className="size-[18px]" /> : <ZLogo className="size-[15px]" aria-hidden />}
      </button>

      <aside
        id="onboarding-guide"
        // 닫혀 있을 땐 클릭도 포커스도 받지 않게 한다
        aria-hidden={!isOpen}
        className={cn(
          "bg-guide-surface text-guide-foreground border-guide-border fixed right-6 bottom-[136px] z-50 flex max-h-[min(560px,calc(100dvh-200px))] w-[320px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border shadow-2xl transition-[opacity,transform] duration-200",
          isOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        <header className="border-guide-border flex shrink-0 items-center gap-2 border-b px-4 py-3">
          {/*
            ⚠️ **전구**다. 여기는 찾아보는 곳이 아니라 지금 단계에서 알아둘 것을 짚어 주는
               곳이라, 랜딩 도움말(돋보기)과 표식을 일부러 다르게 쓴다.
            ⚠️ 브랜드(Z)는 **런처 버튼**이 맡는다. 머리까지 Z로 두면 같은 표식이 두 번 나온다.
          */}
          <Lightbulb className="size-4 shrink-0" aria-hidden />
          <h2 className="text-[13px] font-semibold">온보딩 가이드</h2>
          <span className="text-guide-muted ml-auto text-[11px]">
            {step}단계 · {ONBOARDING_STEP_LABEL[step]}
          </span>
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
          <GuideDemo step={step} />

          <ol className="flex flex-col gap-2.5">
            {GUIDE_STEPS[step].map((text, index) => (
              <li key={text} className="flex gap-2.5">
                <span className="bg-guide-border text-guide-foreground mt-px flex size-4 shrink-0 items-center justify-center rounded-full text-[11px] leading-none tabular-nums">
                  {index + 1}
                </span>
                <p className="text-guide-muted text-[12px] leading-[19px] break-keep">{text}</p>
              </li>
            ))}
          </ol>
        </div>

        <p className="border-guide-border text-guide-muted shrink-0 border-t px-4 py-2.5 text-center text-[11px] leading-[17px] break-keep">
          열어둔 채로 그대로 입력하셔도 됩니다.
        </p>
      </aside>
    </>
  );
}
