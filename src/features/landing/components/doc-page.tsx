import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ZLogo } from "@/components/icons/z-logo";
import { cn } from "@/lib/utils";

import { LandingShell } from "./landing-shell";

/**
 * 로그인 전 설명 문서 한 장(약관·개인정보·권한 안내).
 *
 * ⚠️ 랜딩 안에서 스크롤로 넘기지 않고 **각각 독립된 주소**를 갖는다.
 *    주소를 공유하거나 북마크할 수 있어야 하고, 약관은 법적으로도 따로 가리킬 수 있어야 한다.
 * ⚠️ 문서라고 글만 흘려두지 않는다 — 머리(로고 배지·제목·설명)와 꼬리(다음 행동)를 갖춰
 *    **완성된 한 장**으로 보이게 한다. 경고 띠 같은 임시 표식은 화면에 두지 않는다.
 */
export function DocPage({
  title,
  description,
  isDescriptionOneLine = false,
  children,
  isWide = false,
  hasClosing = true,
}: {
  title: string;
  description?: string;
  /** 설명을 데스크톱에서 한 줄로 편다 — 좁은 화면에서는 접혀야 하므로 lg에서만 */
  isDescriptionOneLine?: boolean;
  children: ReactNode;
  /** 카드가 여러 장 들어가는 화면(요금제)은 조금 넓게 쓴다 */
  isWide?: boolean;
  /** 아래 CTA 카드. 요금제처럼 그 자체가 목적지인 화면에서는 끈다 */
  hasClosing?: boolean;
}) {
  return (
    /* 랜딩과 같은 껍데기·무대 — 문서로 넘어와도 같은 사이트로 읽힌다(밝기 선택도 따라온다) */
    <LandingShell>
      <div
        className={cn(
          "mx-auto w-full px-7 py-16 lg:py-20",
          isWide ? "max-w-[960px]" : "max-w-[820px]",
        )}
      >
        {/* 문서 머리 — 로고 배지를 얹어 랜딩과 같은 손에서 나온 문서로 읽히게 한다 */}
        <div className="flex flex-col items-start gap-4">
          <span className="border-border bg-card flex size-11 items-center justify-center rounded-xl border shadow-sm">
            <ZLogo className="text-foreground size-4" title="Z" />
          </span>
          <h1 className="text-[32px] leading-[40px] font-semibold tracking-[-0.7px] break-keep lg:text-[36px] lg:leading-[44px]">
            {title}
          </h1>
          {description && (
            <p
              className={cn(
                "text-muted-foreground text-[15px] leading-[26px] break-keep",
                isDescriptionOneLine ? "max-w-none lg:whitespace-nowrap" : "max-w-[560px]",
              )}
            >
              {description}
            </p>
          )}
        </div>

        <div className="pt-10">{children}</div>

        {/* 문서 꼬리 — 다 읽고 나면 갈 곳이 있어야 한다. 끝이 뚝 끊기지 않게 */}
        {hasClosing && (
          <div className="border-border bg-card ring-landing-accent/10 mt-16 flex flex-col gap-4 rounded-2xl border p-7 shadow-sm ring-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[16px] leading-6 font-semibold break-keep">
                회의를 하면, 조직의 기억이 된다
              </p>
              <p className="text-muted-foreground pt-1 text-[13px] leading-[21px] break-keep">
                궁금한 점이 남았다면 요금제부터 살펴보세요.
              </p>
            </div>
            <Link
              href="/plans"
              className="border-border bg-secondary hover:bg-accent focus-visible:ring-ring flex h-11 shrink-0 items-center gap-1.5 rounded-lg border px-5 text-[13px] leading-5 font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
            >
              요금제 보기
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </LandingShell>
  );
}

/**
 * 문서 안의 한 절 — 제목과 본문 문단들.
 *
 * ⚠️ 제목·본문만 흘리면 어디서 끊기는지 안 보인다. 절마다 카드로 감싸 **덩어리**를 만든다.
 */
export function DocSection({
  title,
  children,
  icon: Icon,
}: {
  title: string;
  children: ReactNode;
  /** 절을 한눈에 구분해 주는 아이콘. 없으면 점만 찍는다 */
  icon?: LucideIcon;
}) {
  return (
    /*
      절 카드 — 읽고 있는 절이 스스로 앞으로 나온다.
      ⚠️ 호버 반응은 사이트 전체가 **한 가지 문법**을 쓴다 — 살짝 떠오르고 RGB 테두리가 켜진다.
         단색 파랑을 쓰지 않는다: 같은 화면 안에서 어떤 건 파랑, 어떤 건 무지개면 따로 논다.
         **회전하는** 링은 강조 한 곳(요금제 Team·완성 배지)에만 남긴다 — 호버엔 정지형이 빠르다.
      ⚠️ 바탕은 불투명(`bg-card`)이다. 반투명이면 뒤의 3D Z가 글 위로 올라온다.
    */
    <section className="group border-border bg-card ring-rgb-static relative mt-3 overflow-hidden rounded-xl border p-6 pl-7 transition-[transform,box-shadow] duration-300 first:mt-0 hover:-translate-y-[2px] hover:shadow-[0_10px_28px_-14px_rgba(124,58,237,0.32)]">
      {/* 왼쪽 모서리에서 번지는 빛 — 링만 돌면 안쪽이 비어 보인다 */}
      <span
        aria-hidden
        className="from-landing-accent/[0.05] pointer-events-none absolute inset-0 bg-gradient-to-r via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      {/*
        ⚠️ 아이콘을 2.5px 끌어올려 맞춘다. `items-center`는 **글자 상자**를 맞추는데,
           16px 한글은 그 상자 안에서 위쪽에 앉아 아이콘이 상대적으로 내려가 보인다.
      */}
      <h2 className="relative flex items-center gap-2.5 text-[16px] leading-6 font-semibold tracking-[-0.2px] break-keep">
        {/* 절 표시 — 아이콘이 있으면 아이콘, 없으면 점 */}
        {Icon ? (
          /* ⚠️ 상자를 두르지 않는다 — "1. 용어"처럼 번호가 붙은 제목 옆에 사각 배지까지 오면
             표식이 둘이라 어수선하다. 아이콘 하나로 충분하다 */
          <Icon
            className="text-foreground/70 mt-[-2.5px] size-[18px] shrink-0 transition-transform duration-300 group-hover:scale-110"
            aria-hidden
          />
        ) : (
          <span
            aria-hidden
            className="bg-foreground ring-foreground/15 size-[6px] shrink-0 rounded-full ring-0 transition-all duration-300 group-hover:ring-4"
          />
        )}
        <span>{title}</span>
      </h2>
      <div className="text-muted-foreground relative flex flex-col gap-3 pt-3 pl-[15px] text-[13px] leading-[24px] break-keep">
        {children}
      </div>
    </section>
  );
}
