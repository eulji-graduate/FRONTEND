"use client";

import { Moon, Sun } from "lucide-react";

import { useLandingTheme } from "./landing-shell";

/**
 * 랜딩 밝기 스위치 — 지금 상태가 아니라 **누르면 될 상태**를 보여준다.
 * 어두울 때 해를 띄우는 건 "밝게 바꾼다"는 뜻이다(토글의 관례).
 */
export function ThemeToggle() {
  const { isDark, toggle } = useLandingTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "밝은 화면으로 바꾸기" : "어두운 화면으로 바꾸기"}
      className="border-border text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:ring-ring flex size-[34px] items-center justify-center rounded-md border transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
    >
      {isDark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  );
}
