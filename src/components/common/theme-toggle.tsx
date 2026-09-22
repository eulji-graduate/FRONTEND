"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { useScopedTheme } from "@/components/common/scoped-theme";
import { Button } from "@/components/ui/button";

/**
 * 라이트 ↔ 다크 토글.
 *
 * 아이콘 전환은 JS 상태가 아니라 CSS(`dark:`)로 한다 — 마운트 전후 아이콘이 달라지는
 * hydration 불일치를 피한다.
 *
 * ⚠️ **범위 테마 안이면 그쪽을 바꾼다**(`useScopedTheme`). 운영자 화면(`/system`)은 자기
 *    밝기를 따로 들고 있어서, 여기서 전역 테마를 건드리면 운영자 화면을 어둡게 봤다는
 *    이유로 사용자 화면까지 어두워진다. 범위 밖이면 지금까지처럼 전역을 바꾼다.
 */
export function ThemeToggle() {
  const scoped = useScopedTheme();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="테마 변경"
      onClick={scoped ? scoped.toggle : () => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="dark:hidden" />
      <Moon className="hidden dark:block" />
    </Button>
  );
}
