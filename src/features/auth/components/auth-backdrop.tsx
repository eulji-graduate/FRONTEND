"use client";

import dynamic from "next/dynamic";

import { ZLogo } from "@/components/icons/z-logo";

/**
 * 왼쪽 패널 뒤에서 도는 **진짜 3D Z**(three.js).
 *
 * ⚠️ three는 무겁다 — `ssr:false` 지연 로드로 첫 페인트에서 뺀다(§성능).
 *    로드 전·WebGL 미지원에서는 평면 Z가 자리를 지킨다(§정직성: 빈 자리를 두지 않는다).
 * ⚠️ 배경이라 `pointer-events-none`이다. 폼 입력을 방해하면 안 된다.
 */
const ThreeZ = dynamic(() => import("@/features/landing/components/three-z"), {
  ssr: false,
  loading: () => <ZLogo className="animate-breathe size-[220px] text-white/10" />,
});

export function AuthBackdrop() {
  return (
    /* 흐름 안에 둔다 — 절대 배치는 짧은 창에서 글과 겹치거나 잘린다 */
    <div
      aria-hidden
      className="pointer-events-none w-fit opacity-45 drop-shadow-[0_0_60px_rgba(96,165,250,0.18)]"
    >
      <ThreeZ size={320} tone="dark" isFeature />
    </div>
  );
}
