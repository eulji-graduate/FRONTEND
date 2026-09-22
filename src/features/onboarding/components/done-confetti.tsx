"use client";

import { useEffect } from "react";

/**
 * 온보딩을 마친 순간의 축하 — **한 번만 터지고 사라진다.**
 *
 * ⚠️ `canvas-confetti`는 이 화면에서만 쓴다. 정적 import로 두면 온보딩 전 단계 번들에도
 *    딸려 들어가므로, **`import()`로 눌러 담아** 이 컴포넌트가 그려질 때만 받아 온다
 *    (CLAUDE.md §성능 — 무거운 건 지연 로드).
 * ⚠️ `prefers-reduced-motion`이면 **아예 부르지 않는다.** 어지럼증을 유발할 수 있는 움직임이라
 *    애니메이션만 멈추는 걸로는 부족하다.
 * ⚠️ 그리는 건 캔버스뿐이라 DOM에 남는 게 없다 — 스크린리더에게는 제목(`준비됐습니다`)이
 *    이미 같은 말을 한다.
 * ⚠️ 색은 **토큰에서 읽는다**(`--foreground` 등). 값을 박아 두면 다크모드에서 먹색 조각이
 *    검은 배경에 묻혀 안 보인다 — 캔버스는 CSS 변수를 모르니 우리가 읽어서 넘긴다
 *    (CLAUDE.md §디자인 토큰 — 하드코딩 금지).
 * ⚠️ 먹색 계열 + 액센트 하나로 묶는다. 무지개로 뿌리면 이 서비스에서 색을 쓰는
 *    유일한 규칙(에러=빨강)이 흐려진다.
 * ⚠️ 조각 절반은 **Z 마크**다. 다만 우리 Z는 세 조각으로 끊긴 형태라 작으면 점으로 뭉갠다 —
 *    그래서 `scalar`를 키우고 개수를 줄였다. 나머지 절반은 네모라 화면이 Z로만 덮이지 않는다.
 */

/** 조각에 쓸 토큰 — 지금 테마의 실제 색을 읽어 온다 */
const COLOR_TOKENS = ["--foreground", "--muted-foreground", "--border", "--primary"] as const;

function readColors(): string[] {
  const style = getComputedStyle(document.documentElement);
  return COLOR_TOKENS.map((token) => style.getPropertyValue(token).trim()).filter(Boolean);
}

/** `ZLogo`의 세 조각을 한 path로 이은 것 — 값이 갈라지지 않게 여기 한 곳에만 둔다 */
const Z_PATH =
  "M0 0 L63 0 L45.5 25 L0 25 Z M70 0 L100 0 L30 100 L0 100 Z M54.5 75 L100 75 L100 100 L37 100 Z";

export function DoneConfetti() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;

    void import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;

      const zShape = confetti.shapeFromPath({ path: Z_PATH });
      const colors = readColors();

      /** 표식이 차오른 뒤에 터진다 — `animate-fill-in`(450ms)이 끝나는 시점 */
      const shoot = (options: {
        particleCount: number;
        spread: number;
        startVelocity: number;
        scalar: number;
        shapes: confetti.Shape[];
      }) =>
        confetti({
          ...options,
          // 표식이 화면 위쪽 3분의 1쯤에 있다 — 거기서 터져야 표식이 터뜨린 것처럼 보인다
          origin: { x: 0.5, y: 0.34 },
          colors,
          ticks: 180,
          disableForReducedMotion: true,
        });

      window.setTimeout(() => {
        if (cancelled) return;
        // Z는 크게, 적게 — 작으면 뭉개지고 많으면 화면이 시끄럽다
        shoot({ particleCount: 22, spread: 70, startVelocity: 44, scalar: 1.9, shapes: [zShape] });
        shoot({
          particleCount: 55,
          spread: 62,
          startVelocity: 40,
          scalar: 0.9,
          shapes: ["square"],
        });
        // 조금 늦게 한 번 더 — 한 번만 터지면 "펑"이 아니라 "톡"으로 끝난다
        window.setTimeout(() => {
          if (cancelled) return;
          shoot({
            particleCount: 12,
            spread: 100,
            startVelocity: 32,
            scalar: 1.6,
            shapes: [zShape],
          });
          shoot({
            particleCount: 34,
            spread: 96,
            startVelocity: 30,
            scalar: 0.8,
            shapes: ["square"],
          });
        }, 170);
      }, 420);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
