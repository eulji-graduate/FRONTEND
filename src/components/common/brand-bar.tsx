import type { ReactNode } from "react";

import { ZLogo } from "@/components/icons/z-logo";

interface BrandBarProps {
  /** 오른쪽 끝에 붙일 것 — 단계 표시처럼 화면마다 다른 값 */
  right?: ReactNode;
}

/**
 * 로고만 있는 상단 바 — **셸(사이드바) 밖 화면들이 같이 쓴다.**
 *
 * 온보딩 1~4단계 · 완료 화면 · 구독 재개 화면이 이 바를 쓴다. 전부 "로그인은 했지만
 * 워크스페이스는 아직 안 열린" 상태라, 같은 껍데기를 써야 같은 서비스로 읽힌다.
 *
 * ⚠️ 높이·여백을 화면마다 적지 않는다. 전에는 `h-[52px] px-[21px] …`를 온보딩 셸과
 *    구독 재개 화면이 **각자 손으로 적고 있었다** — 한쪽만 고치면 두 화면이 어긋난다.
 */
export function BrandBar({ right }: BrandBarProps) {
  return (
    <header className="border-border bg-background/90 flex h-[52px] shrink-0 items-center gap-[7px] border-b px-[21px] backdrop-blur">
      <ZLogo className="text-foreground size-[18px]" title="Z" />
      {right && <span className="ml-auto">{right}</span>}
    </header>
  );
}
