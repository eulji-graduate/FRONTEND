"use client";

import { useTheme } from "next-themes";
import { type KeyboardEvent, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

/**
 * 마운트 여부 — `useEffect`+`setState`로 만들지 않는다(`hooks/use-media-query.ts`와 같은 이유,
 * 하이드레이션 직후 렌더가 한 번 더 도는 걸 피한다). 서버 스냅숏은 항상 `false`다.
 */
function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

type ThemeOption = "light" | "dark" | "system";

const THEME_OPTIONS: { value: ThemeOption; label: string }[] = [
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
  { value: "system", label: "시스템" },
];

function nextThemeByKey(key: string): 1 | -1 | null {
  if (key === "ArrowRight" || key === "ArrowDown") return 1;
  if (key === "ArrowLeft" || key === "ArrowUp") return -1;
  return null;
}

/**
 * 테마 카드 — 라이트/다크/시스템 3단 선택.
 *
 * ⚠️ 헤더의 2단(라이트/다크) `ThemeToggle`은 그대로 둔다 — 여기는 "시스템"까지 고를 수 있는
 *    자리를 마이페이지에 별도로 둔 것뿐이다. 둘 다 `next-themes`의 같은 값을 읽고 써서
 *    한쪽에서 바꾸면 다른 쪽도 그대로 따라온다.
 * ⚠️ `resolvedTheme`이 아니라 `theme`을 쓴다 — "시스템"을 골랐을 때도 그 칸이 선택된 채로
 *    보여야 한다(`resolvedTheme`은 시스템이 지금 라이트/다크 중 뭘로 풀렸는지만 안다).
 * ⚠️ 마운트 전에는 아무 칸도 선택 표시하지 않는다 — 서버는 저장된 테마를 몰라 하이드레이션이
 *    어긋난다(`screen-scale-card.tsx`의 `stored === null` 가드와 같은 이유).
 */
export function ThemeCard() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  const handleKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction = nextThemeByKey(event.key);
    if (direction === null) return;

    const currentIndex = THEME_OPTIONS.findIndex((option) => option.value === theme);
    const baseIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = (baseIndex + direction + THEME_OPTIONS.length) % THEME_OPTIONS.length;
    const next = THEME_OPTIONS[nextIndex];
    if (!next) return;

    event.preventDefault();
    setTheme(next.value);
    event.currentTarget
      .querySelector<HTMLButtonElement>(`[data-theme-option="${next.value}"]`)
      ?.focus();
  };

  return (
    <section className="border-border bg-card flex h-full flex-col rounded-2xl border p-7">
      <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">테마</h2>

      <p className="text-muted-foreground pt-2 text-[13px] leading-[21px] break-keep">
        화면을 라이트·다크 중 하나로 고정하거나, 기기 설정을 따르게 둘 수 있습니다.
      </p>

      <div
        role="radiogroup"
        aria-label="테마"
        onKeyDown={handleKeys}
        /* ⚠️ 세 칸 격자다 — 곁 칸(360)에서 `flex-wrap`이 `시스템`만 다음 줄로 떨어뜨렸다 */
        className="grid grid-cols-3 gap-2 pt-5"
      >
        {THEME_OPTIONS.map((option) => {
          const isSelected = mounted && theme === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected || (!mounted && option.value === "system") ? 0 : -1}
              data-theme-option={option.value}
              onClick={() => setTheme(option.value)}
              className={cn(
                "focus-visible:ring-ring flex flex-col items-center gap-2 rounded-xl border p-2 transition-colors focus-visible:ring-2 focus-visible:outline-hidden",
                isSelected ? "border-foreground" : "border-border hover:bg-secondary",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "h-11 w-full rounded-lg border",
                  option.value === "light" && "border-border bg-white",
                  option.value === "dark" && "border-border bg-black",
                  option.value === "system" && "border-border bg-linear-to-br from-white to-black",
                )}
              />
              <span className="text-[13px] leading-none">{option.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
