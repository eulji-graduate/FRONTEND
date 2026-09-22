"use client";

import { createContext, type ReactNode, useContext, useSyncExternalStore } from "react";

import { SupportWidget } from "@/features/support/components/support-widget";

import { HeroScrollDriver } from "./hero-scroll-driver";
import { LandingBackdrop } from "./landing-backdrop";
import { LandingFooter } from "./landing-footer";
import { LandingHeader } from "./landing-header";
import { SmoothScroll } from "./smooth-scroll";

const STORAGE_KEY = "z:landing-theme";
/** 스킨 토큰이 걸리는 자리 — globals.css가 이 id로 값을 내린다 */
const STAGE_ID = "landing-stage";

/**
 * 랜딩 껍데기 — 무대·상단바·푸터를 한자리에서 그린다.
 *
 * ⚠️ 랜딩의 밝기는 **앱 다크모드와 별개다.** 앱은 시스템 설정을 따르지만(`.dark`),
 *    랜딩은 방문자가 직접 고르고 그 선택만 기억한다. 두 곳이 같은 스위치를 쓰면
 *    "사내 도구는 밝게, 소개 페이지는 어둡게" 같은 조합이 불가능해진다.
 * ⚠️ 기본값은 **어두움**이다 — 3D Z가 도는 검정 무대가 이 페이지의 첫인상이다.
 * ⚠️ **스킨 클래스(`landing-day`/`landing-night`)는 이 컴포넌트가 붙이지 않는다.**
 *    `<html>`이 들고, 첫 페인트 전에 `PublicLayout`의 부트 스크립트가 정한다 —
 *    React가 붙이면 하이드레이션까지 기다려야 해서 새로고침마다 밝기가 번쩍인다.
 *    여기서는 토큰을 받을 자리(`id`)만 내주고, 토글할 때 html 클래스를 갈아 끼운다.
 * ⚠️ 저장값은 `useSyncExternalStore`로 읽는다. 서버 스냅숏은 기본값(어두움)이고
 *    클라이언트에서 저장값으로 이어 붙는다 — 색은 이미 스크립트가 맞춰 둔 상태다.
 */

/** 모듈 수준 저장소 — 스냅숏 하나를 셸과 배경이 함께 읽는다 */
let currentIsDark: boolean | null = null;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot() {
  /*
    ⚠️ `localStorage` 접근은 던질 수 있다 — 사파리 프라이빗 모드나 저장소를 막은 브라우저에서
       그렇다. 여기서 터지면 **랜딩 전체가 렌더 중 죽는다.** 읽기 실패는 기본값(어두움)으로 넘긴다.
  */
  if (currentIsDark === null) {
    try {
      currentIsDark = window.localStorage.getItem(STORAGE_KEY) !== "light";
    } catch {
      currentIsDark = true;
    }
  }
  return currentIsDark;
}

/** 서버는 방문자의 선택을 알 수 없다 — 스킨은 `PublicLayout`의 부트 스크립트가 첫 페인트 전에 붙인다 */
function getServerSnapshot() {
  return true;
}

/** 스킨 클래스는 `<html>`이 든다 — 부트 스크립트와 같은 규약을 토글에서도 지킨다 */
function applyStageSkin(isDark: boolean) {
  const root = document.documentElement.classList;
  root.toggle("landing-night", isDark);
  root.toggle("landing-day", !isDark);
}

function setIsDark(next: boolean) {
  currentIsDark = next;
  applyStageSkin(next);
  /* 저장에 실패해도 화면은 바뀌어야 한다 — 기억만 못 할 뿐이다 */
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  } catch {
    /* 저장소를 막은 브라우저 — 이번 방문에만 적용된다 */
  }
  listeners.forEach((listener) => listener());
}

const LandingThemeContext = createContext<{ isDark: boolean; toggle: () => void }>({
  isDark: true,
  toggle: () => {},
});

export function useLandingTheme() {
  return useContext(LandingThemeContext);
}

export function LandingShell({ children }: { children: ReactNode }) {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = () => setIsDark(!isDark);

  return (
    <LandingThemeContext value={{ isDark, toggle }}>
      <div
        id={STAGE_ID}
        // 상단바가 `fixed`라 문서 흐름에서 빠진다 — 그 높이(56px)를 여기서 메운다
        className="text-foreground bg-landing-stage min-h-screen-z relative flex flex-col pt-14"
      >
        <LandingBackdrop />
        {/*
          읽은 만큼 차오르는 막대 — 랜딩과 문서가 **같은 껍데기**를 쓰므로 여기 한 곳에 둔다.
          긴 화면에서 남은 양이 보이지 않으면 사람은 중간에 닫는다.
        */}
        <span
          aria-hidden
          className="read-progress fixed top-14 right-0 left-0 z-40 h-[2px] origin-left bg-[linear-gradient(90deg,#3b82f6,#7c3aed,#8b5cf6,#60a5fa)]"
        />
        {/* 화면 전체에 옅은 필름 그레인 — 질감 */}
        <span className="film-grain" aria-hidden />
        <LandingHeader />

        {/* 콘텐츠는 고정 배경(z-0) 위로 — 이 층이 없으면 배경이 글을 덮는다 */}
        {/*
          ⚠️ 부드러운 스크롤은 **랜딩에만** 건다(§smooth-scroll). 일하는 화면에서 관성이 붙으면
             원하는 줄에 못 멈춘다.
        */}
        <SmoothScroll />
        <HeroScrollDriver />

        <main className="relative z-10 flex-1">{children}</main>

        <LandingFooter />

        {/*
          도움말은 **셸에 둔다** — 랜딩·요금제·약관 어디서든 같은 자리에 있어야 한다.
          ⚠️ 로그인 뒤 화면에는 아직 붙이지 않는다. 답변이 로그인 전 질문(요금제·가입)이라
             앱 안에서 열면 쓸 말이 없다 — 쓸 내용이 생기면 그때 앱 셸에 한 줄 더한다.
        */}
        <SupportWidget />
      </div>
    </LandingThemeContext>
  );
}
