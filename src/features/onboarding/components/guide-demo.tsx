"use client";

import { Folder } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { ONBOARDING_STEP, type OnboardingStep } from "../types";

/** 한 프레임 — 실제 화면을 축소한 모양이다. */
interface DemoFrame {
  caption: string;
  rows: Array<{
    label: string;
    sub?: string;
    tone?: "muted" | "accent";
    indent?: boolean;
    /** 부서 트리처럼 폴더 아이콘을 붙인다 */
    folder?: boolean;
  }>;
}

/**
 * 단계마다 보여줄 짧은 예시.
 * ⚠️ 움직이는 그림(GIF)을 파일로 넣지 않는다 — 화면과 어긋나면 고칠 수 없고 용량도 늘어난다.
 *    실제 컴포넌트와 같은 토큰으로 그린 축소판을 프레임으로 넘긴다.
 */
const FRAMES: Record<OnboardingStep, DemoFrame[]> = {
  [ONBOARDING_STEP.DEPARTMENT]: [
    { caption: "팀을 하나 만들고", rows: [{ label: "개발팀", sub: "팀", folder: true }] },
    {
      caption: "그 안에 역할을 넣습니다",
      rows: [
        { label: "개발팀", sub: "팀", folder: true },
        { label: "프론트엔드", sub: "역할", indent: true, tone: "accent", folder: true },
      ],
    },
    {
      caption: "역할은 여러 개도 됩니다",
      rows: [
        { label: "개발팀", sub: "팀", folder: true },
        { label: "프론트엔드", sub: "역할", indent: true, folder: true },
        { label: "백엔드", sub: "역할", indent: true, tone: "accent", folder: true },
      ],
    },
  ],
  [ONBOARDING_STEP.POSITION]: [
    {
      caption: "직급마다 권한을 정합니다",
      rows: [
        { label: "팀장", sub: "Member" },
        { label: "사원", sub: "Member", tone: "muted" },
      ],
    },
    {
      caption: "리더는 딱 한 직급만",
      rows: [
        { label: "팀장", sub: "Leader", tone: "accent" },
        { label: "사원", sub: "Member", tone: "muted" },
      ],
    },
    {
      caption: "나머지는 Member만 고를 수 있습니다",
      rows: [
        { label: "팀장", sub: "Leader" },
        { label: "사원", sub: "Leader 잠김", tone: "muted" },
      ],
    },
  ],
  [ONBOARDING_STEP.INVITE]: [
    { caption: "메일 주소를 적고", rows: [{ label: "dev1@company.com", sub: "" }] },
    {
      caption: "팀을 고르면 역할이 열립니다",
      rows: [{ label: "dev1@company.com", sub: "개발팀", tone: "accent" }],
    },
    {
      caption: "역할·직급까지 정해 보냅니다",
      rows: [{ label: "dev1@company.com", sub: "개발팀 · 프론트엔드 · 사원", tone: "accent" }],
    },
  ],
  [ONBOARDING_STEP.PAYMENT]: [
    {
      caption: "회사당 기본료 하나입니다",
      rows: [{ label: "월 기본료", sub: "인원과 무관", tone: "muted" }],
    },
    {
      caption: "AI 토큰과 저장 공간이 포함되고",
      rows: [{ label: "포함량", sub: "넘긴 만큼만 다음 결제일에", tone: "accent" }],
    },
    {
      caption: "결제를 마치면 워크스페이스가 열립니다",
      rows: [{ label: "결제 완료", sub: "다음 결제일 9월 1일", tone: "accent" }],
    },
  ],
};

const FRAME_MS = 2200;

/** 단계별 예시를 프레임으로 돌려 보여준다. 움짤 대신 실제 토큰으로 그린다. */
export function GuideDemo({ step }: { step: OnboardingStep }) {
  const frames = FRAMES[step];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % frames.length), FRAME_MS);
    return () => clearInterval(timer);
  }, [frames.length]);

  const frame = frames[index];
  if (!frame) return null;

  // 프레임마다 줄 수가 달라 그림틀이 커졌다 작아진다 — 패널이 들썩인다.
  // 가장 긴 프레임 기준으로 자리를 미리 잡아두고, 모자란 줄은 빈칸으로 채운다.
  const maxRows = Math.max(...frames.map((item) => item.rows.length));
  const fillers = maxRows - frame.rows.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="border-guide-border bg-guide-foreground/5 flex flex-col gap-1.5 rounded-lg border p-3">
        {frame.rows.map((row) => (
          <div
            key={`${index}-${row.label}`}
            className={cn(
              "animate-in fade-in slide-in-from-bottom-1 flex items-center justify-between gap-2 rounded px-2 py-1.5 text-[11px] duration-300",
              row.indent && "ml-3",
              row.tone === "accent" ? "bg-guide-foreground/10" : "bg-transparent",
              row.tone === "muted" && "opacity-50",
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {row.folder && <Folder className="text-guide-muted size-3 shrink-0" aria-hidden />}
              <span className="text-guide-foreground truncate">{row.label}</span>
            </span>
            {row.sub && <span className="text-guide-muted shrink-0">{row.sub}</span>}
          </div>
        ))}

        {/* 자리만 잡는 빈 줄 — 줄 하나와 같은 높이다 */}
        {Array.from({ length: fillers }, (_, filler) => (
          <div key={`filler-${filler}`} className="px-2 py-1.5 text-[11px]" aria-hidden>
            &nbsp;
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {/* 오른쪽 점과 같은 폭을 왼쪽에도 둬서 캡션이 진짜 가운데 오게 한다 */}
        <span className="w-8 shrink-0" aria-hidden />
        {/* 문구 길이가 프레임마다 달라 줄이 늘면 또 들썩인다 — 두 줄 자리를 미리 잡는다 */}
        <p className="text-guide-muted flex min-h-8 flex-1 items-center justify-center text-center text-[11px] leading-4 break-keep">
          {frame.caption}
        </p>
        <span className="flex w-8 shrink-0 justify-end gap-1" aria-hidden>
          {frames.map((item, dot) => (
            <span
              key={item.caption}
              className={cn(
                "size-1 rounded-full transition-colors",
                dot === index ? "bg-guide-foreground" : "bg-guide-border",
              )}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
