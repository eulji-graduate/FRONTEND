"use client";

import { type ReactNode, useRef } from "react";

/**
 * 커서를 따라 기우는 3D 카드 — 마우스가 어디 있느냐에 따라 프레임이 그쪽으로 눕는다.
 *
 * ⚠️ 상태를 쓰지 않는다 — pointermove마다 리렌더하면 버벅인다. style을 직접 만진다.
 * ⚠️ `prefers-reduced-motion`이면 기본 각도로 고정된다(움직임 없음).
 * ⚠️ 터치 기기에는 커서가 없다 — pointerType이 mouse일 때만 반응한다.
 */
export function TiltCard({
  children,
  baseX = 4,
  baseY = -6,
  range = 7,
}: {
  children: ReactNode;
  /** 쉬고 있을 때의 기본 기울기(도) */
  baseX?: number;
  baseY?: number;
  /** 커서가 끝까지 갔을 때 더해지는 최대 각도(도) */
  range?: number;
}) {
  const frameRef = useRef<HTMLDivElement>(null);

  const rest = `rotateX(${baseX}deg) rotateY(${baseY}deg)`;

  return (
    <div
      className="[perspective:1200px]"
      onPointerMove={(event) => {
        const frame = frameRef.current;
        if (!frame || event.pointerType !== "mouse") return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const rect = frame.getBoundingClientRect();
        const px = ((event.clientX - rect.left) / rect.width) * 2 - 1; // -1(왼쪽) ~ 1(오른쪽)
        const py = ((event.clientY - rect.top) / rect.height) * 2 - 1; // -1(위) ~ 1(아래)
        frame.style.transform = `rotateX(${baseX - py * range}deg) rotateY(${baseY + px * range}deg)`;
      }}
      onPointerLeave={() => {
        const frame = frameRef.current;
        if (frame) frame.style.transform = rest;
      }}
    >
      <div
        ref={frameRef}
        style={{ transform: rest }}
        className="transition-transform duration-300 ease-out"
      >
        {children}
      </div>
    </div>
  );
}
