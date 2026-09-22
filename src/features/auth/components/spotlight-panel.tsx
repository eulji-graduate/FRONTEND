"use client";

import { type ReactNode, useRef } from "react";

/**
 * 커서를 따라 빛이 번지는 패널.
 *
 * 어두운 면은 가만히 두면 죽은 판이 된다 — 포인터가 지나간 자리만 은은하게 밝혀
 * 화면이 살아 있다는 신호를 준다(로그인 화면처럼 볼 게 적은 자리에 특히 값이 있다).
 *
 * ⚠️ 상태를 쓰지 않는다. `pointermove`마다 리렌더하면 3D 캔버스까지 다시 그려 버벅인다 —
 *    CSS 변수만 직접 갈아끼운다.
 * ⚠️ 마우스일 때만 반응한다. 터치에는 커서가 없어서 빛이 마지막 터치 자리에 박힌다.
 * ⚠️ `prefers-reduced-motion`이면 아예 켜지 않는다.
 */
export function SpotlightPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className={className}
      style={{ "--spot-x": "50%", "--spot-y": "35%" } as React.CSSProperties}
      onPointerMove={(event) => {
        const panel = ref.current;
        if (!panel || event.pointerType !== "mouse") return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const rect = panel.getBoundingClientRect();
        panel.style.setProperty("--spot-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
        panel.style.setProperty("--spot-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
      }}
    >
      {/* 커서 자리를 따라오는 빛 — 배경 위, 내용 아래 */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(420px_circle_at_var(--spot-x)_var(--spot-y),rgba(96,165,250,0.16),transparent_70%)] transition-opacity duration-300"
      />
      {children}
    </div>
  );
}
