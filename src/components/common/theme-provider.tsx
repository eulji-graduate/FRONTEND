"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * 전 페이지 다크모드의 단일 진입점.
 * `<html>`에 `.dark` 클래스를 붙였다 뗀다 → globals.css의 토큰이 통째로 뒤집힌다.
 * 컴포넌트는 토큰(`bg-background` 등)만 쓰면 되고, 다크 대응을 따로 하지 않는다.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
