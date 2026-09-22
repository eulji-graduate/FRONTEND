"use client";

import type Lenis from "lenis";
import { useEffect } from "react";

/**
 * 랜딩의 **부드러운 스크롤**(Lenis).
 *
 * ⚠️ **랜딩에만 건다.** 로그인 뒤 워크스페이스는 표·목록을 훑는 화면이라, 스크롤이 미끄러지면
 *    원하는 줄에 멈추기 어려워진다 — 일하는 화면은 브라우저 기본이 맞다.
 * ⚠️ **모션을 줄여 달라는 사람에게는 안 건다**(`prefers-reduced-motion`). 관성 스크롤은
 *    멀미를 유발하는 대표적인 연출이라, 이 설정을 무시하면 그 사람은 사이트를 못 본다.
 * ⚠️ 앵커 이동(`#가격` 같은 링크)도 Lenis가 맡는다 — 브라우저 기본과 섞이면 두 번 움직인다.
 * ⚠️ **본체는 effect 안에서 늦게 받아 온다**(`await import`, 2026-08-14). 정적 import로 두면
 *    랜딩 첫 로드 번들에 통째로 실리는데, 모션을 줄여 달라는 사람은 이걸 **아예 만들지도
 *    않는다** — 안 쓸 사람에게까지 내려보내면 First Load JS 예산이 샌다(CLAUDE.md §성능).
 *    `three`도 같은 이유로 `next/dynamic`으로 갈라 뒀다.
 * ⚠️ **스크롤 주체는 `window`가 아니라 `#app-scroll`이다**(2026-08-12에 발이 걸렸다). 화면 배율
 *    기능 때문에 `body`가 아니라 안쪽 상자가 스크롤을 맡는다(`globals.css`) — 그걸 안 알려주면
 *    Lenis는 아무것도 안 움직이는 창을 붙들고 헛돈다.
 */
/*
  ⚠️ **인스턴스를 모듈에 들고 있는다.** Lenis가 스크롤을 대신 굴리는 동안에는 `window.scrollTo`가
     다음 프레임에 곧바로 덮여 **아무 데도 못 간다** — 옮기고 싶으면 Lenis에게 부탁해야 한다.
     흐름 섹션의 카드 클릭이 이 길을 쓴다.
*/
let current: Lenis | null = null;

/** 부드럽게 그 자리로 — Lenis가 없으면(모션 최소화·아직 안 붙음) 브라우저 기본으로 간다 */
export function smoothScrollTo(top: number) {
  if (current) {
    current.scrollTo(top);
    return;
  }
  document.getElementById("app-scroll")?.scrollTo({ top, behavior: "smooth" });
}

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const wrapper = document.getElementById("app-scroll");
    if (!wrapper) return;

    /*
      ⚠️ 늦게 받아 오는 사이에 화면을 떠날 수 있다 — 그때는 만들지 않고 끝낸다.
         안 그러면 이미 없어진 화면에 `raf` 루프가 남는다.
    */
    let disposed = false;
    let lenis: Lenis | null = null;
    let frame = 0;

    void import("lenis").then(({ default: LenisCtor }) => {
      if (disposed) return;

      /*
        ⚠️ 값은 **은은하게**. `lerp`가 크면 화면이 손보다 늦게 따라와 답답하고, 작으면 미끄러진다.
           0.12는 "따라오긴 하는데 부드럽다"가 느껴지는 자리다.
      */
      lenis = new LenisCtor({
        wrapper,
        content: wrapper.firstElementChild ?? wrapper,
        lerp: 0.12,
        wheelMultiplier: 1,
        touchMultiplier: 1.4,
      });
      current = lenis;

      const raf = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      lenis?.destroy();
      current = null;
    };
  }, []);

  return null;
}
