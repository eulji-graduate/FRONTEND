"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ZLogo } from "@/components/icons/z-logo";
import { cn } from "@/lib/utils";

import { RoleScreen } from "./role-screens";
import { ROLE_VIEWS } from "./role-views";

/**
 * 역할마다 무엇이 다른지 — 왼쪽에서 역할을 고르면 오른쪽 **화면 자체가** 바뀐다.
 *
 * ⚠️ 네 역할이 같은 대시보드 틀을 공유하지 않는다. Admin에게는 대시보드가 없다 —
 *    역할마다 **가장 중요한 화면 하나**를 실제 셸(사이드바 + 본문) 축소판으로 보여준다.
 *    Owner=현황·승인 / Admin=사원 관리 / Leader=팀 액션 보드 / Member=내 업무.
 * ⚠️ 숫자·이름은 전부 목이다. 역할 색은 역할 배지 토큰(`--role-*`)을 그대로 쓴다 —
 *    랜딩은 `.landing-night`가 그 토큰을 검정 무대용으로 뒤집어 둔다.
 * ⚠️ 고른 탭의 글자는 `text-background`다 — 검정 무대에선 먹색, 밝은 바탕에선 흰색으로 뒤집힌다.
 *    역할색도 밝기에 따라 값이 바뀌므로 한쪽에 맞춰 생 hex를 박으면 반대쪽에서 안 읽힌다.
 * ⚠️ 역할 이름은 영어(CLAUDE.md §카피). 상태 점 색은 상태 토큰과 같은 회색·초록·보라다.
 */

export function RoleSection() {
  const [selected, setSelected] = useState(0);
  const role = ROLE_VIEWS[selected] ?? ROLE_VIEWS[0];

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1144px] px-7">
        {/* 다른 섹션과 같은 헤더 문법 — eyebrow + 중앙 제목 */}
        <div className="flex flex-col items-center gap-2.5 text-center">
          <p className="text-landing-accent text-[11px] leading-4 font-semibold tracking-[1.1px] uppercase">
            Roles
          </p>
          <h2 className="text-[32px] leading-[40px] font-semibold tracking-[-0.7px] break-keep lg:text-[36px] lg:leading-[44px]">
            어느 자리에서도 Z는 이어집니다
          </h2>
        </div>

        <div className="grid items-center gap-12 pt-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
          <div className="reveal-on-scroll">
            <div role="tablist" aria-label="권한" className="flex flex-wrap gap-1.5">
              {ROLE_VIEWS.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  role="tab"
                  aria-selected={index === selected}
                  id={`role-tab-${item.name}`}
                  aria-controls="role-preview-panel"
                  onClick={() => setSelected(index)}
                  className={cn(
                    "focus-visible:ring-ring h-9 rounded-full px-4 text-[13px] leading-5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
                    index === selected
                      ? item.activeTab
                      : "border-border text-muted-foreground hover:text-foreground bg-card border",
                  )}
                >
                  {item.name}
                </button>
              ))}
            </div>

            {/* 문구 길이가 달라도 아래가 흔들리지 않게 자리를 잡아둔다 */}
            <p className="text-muted-foreground flex min-h-[52px] max-w-[400px] items-center pt-5 text-[16px] leading-[26px] break-keep">
              {role.body}
            </p>

            <Link
              href="/roles"
              className="text-landing-accent flex w-fit items-center gap-1 pt-1 text-[13px] leading-5 hover:underline"
            >
              권한 매트릭스 전체 보기
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>

          {/* 역할을 바꾸면 화면 통째로 갈아끼워진다 — 실제 셸(사이드바+본문) 축소판 */}
          {/* 탭과 패널을 id로 잇는다 — 없으면 스크린 리더가 탭 선택과 화면 변경을 연결하지 못한다 */}
          <div
            className="tilt-scene reveal-on-scroll"
            role="tabpanel"
            id="role-preview-panel"
            aria-labelledby={`role-tab-${role.name}`}
          >
            {/*
              ⚠️ **진짜 셸의 축소판이다.** 사이드바 + 상단바 + 본문 + 카드, 실제 화면과 같은
                 뼈대를 쓴다. 전에는 사이드바를 `bg-secondary`로 칠하고 상단바를 아예 빼서,
                 우리 서비스가 아니라 아무 대시보드 그림처럼 보였다 —
                 여기서 본 화면이 로그인 뒤에 그대로 나와야 미리보기가 값을 한다.
              ⚠️ 셸 껍데기(사이드바·상단바)는 **`--background` 한 색**이다
                 (CLAUDE.md §디자인 토큰 — 색으로 층을 3단 나누지 않는다).
              ⚠️ 다만 **그대로 베끼지는 않는다.** 실제 본문의 점 격자는 이 크기에서 점이
                 글자만큼 굵게 보여 지저분해진다 — 축소판의 목적은 흉내가 아니라 **읽히는 것**이다.
            */}
            <div
              key={role.name}
              className="border-border bg-background animate-in fade-in-0 slide-in-from-bottom-2 tilt-left overflow-hidden rounded-2xl border shadow-lg duration-300"
            >
              <div className="flex min-h-[280px]">
                {/* 미니 사이드바 — 역할마다 메뉴가 다르다(실제 셸과 같은 문법) */}
                <div className="border-border hidden w-[116px] shrink-0 flex-col border-r px-2 pb-2 sm:flex">
                  {/* 실제 셸도 로고 줄이 상단바와 같은 높이다 — 첫 줄이 한 선에 놓인다 */}
                  <span className="flex h-[34px] shrink-0 items-center px-2">
                    <ZLogo className="text-foreground size-3.5" />
                  </span>
                  {role.nav.map((item, index) => (
                    <span
                      key={item}
                      className={cn(
                        "flex h-[22px] items-center rounded-md px-2 text-[11px] leading-4 whitespace-nowrap",
                        index === 0 ? "bg-foreground text-background" : "text-muted-foreground",
                      )}
                    >
                      {item}
                    </span>
                  ))}
                  {/* 실제 셸은 맨 아래가 계정 줄이다 — 역할 배지가 거기 붙는다 */}
                  <span className="border-border/60 mt-auto flex items-center gap-1.5 border-t px-1 pt-2">
                    <span
                      className={cn(
                        "flex size-[15px] shrink-0 items-center justify-center rounded-full text-[8px] leading-none",
                        role.chip,
                      )}
                      aria-hidden
                    >
                      Z
                    </span>
                    <span className="text-muted-foreground/80 min-w-0 truncate text-[9px] leading-[13px]">
                      {role.name}
                    </span>
                  </span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  {/* 상단바 — 실제 화면은 아이콘 + 제목이다. 없으면 본문만 떠 있는 그림이 된다 */}
                  <div className="border-border flex h-[34px] shrink-0 items-center gap-2 border-b px-3.5">
                    <span className="bg-foreground/15 size-2.5 rounded-[3px]" aria-hidden />
                    <p className="text-[11px] leading-4 font-semibold">{role.screen}</p>
                  </div>

                  {/* 본문 — 카드가 뜨도록 아주 옅게만 눌러 둔다(점 격자는 위 주석 참고) */}
                  <div className="bg-secondary/30 min-w-0 flex-1 p-3.5">
                    <RoleScreen name={role.name} />
                    <p className="text-muted-foreground/70 pt-3 text-[11px] leading-4">
                      화면 구성 예시 — 숫자는 실제 데이터가 아닙니다
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
