"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * 상단바 로고 이스터에그 — 랜딩에서 로고를 누르면 세 조각이 다시 날아와 붙는다.
 *
 * 참고한 문법: 만지면 반응하는 장난감 같은 사이트(Bruno Simon류)의 재미.
 * ⚠️ 홈이 아닐 때는 평범한 홈 링크다 — 재생은 이미 홈에 있을 때만(이동을 막지 않는다).
 * ⚠️ 세 path는 `ZLogo`와 같은 모양이다. 로고가 바뀌면 둘 다 바꾼다.
 */
export function PlayfulLogo() {
  const pathname = usePathname();
  const [round, setRound] = useState(0);
  const isHome = pathname === "/";

  return (
    <Link
      href="/"
      aria-label={isHome ? "Z 로고 — 누르면 조각이 다시 맞춰집니다" : "Z 홈"}
      onClick={(event) => {
        if (!isHome) return;
        event.preventDefault();
        setRound((value) => value + 1);
      }}
      className="focus-visible:ring-ring rounded transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:outline-hidden"
    >
      <svg
        key={round}
        viewBox="0 0 100 100"
        fill="currentColor"
        className="text-foreground size-[20px]"
        aria-hidden
      >
        <path className="animate-z-snap-top" d="M0 0 L63 0 L45.5 25 L0 25 Z" />
        <path className="animate-z-snap-slash" d="M70 0 L100 0 L30 100 L0 100 Z" />
        <path className="animate-z-snap-bottom" d="M54.5 75 L100 75 L100 100 L37 100 Z" />
      </svg>
    </Link>
  );
}
