"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

/**
 * 숫자가 **0부터 굴러 올라온다**.
 *
 * ⚠️ **마운트될 때 센다.** 흐름 섹션의 축소판은 그 단계가 열릴 때마다 새로 마운트되므로
 *    (`flow-section.tsx`의 `key`), 따로 신호를 주고받을 필요 없이 조립과 함께 시작한다.
 * ⚠️ **서버가 그린 값은 최종값이다.** 0부터 그리면 자바스크립트가 죽었을 때 영영 0으로 남고,
 *    검색 로봇도 0을 읽는다 — 시작값은 화면에 붙은 뒤에만 낮춘다(§정직성).
 * ⚠️ **모션을 줄여 달라는 사람에게는 안 센다.** 숫자가 튀는 건 어지럼을 유발한다.
 * ⚠️ `tabular-nums`는 부르는 쪽이 준다 — 안 주면 세는 동안 폭이 흔들려 옆 글자가 밀린다.
 *
 * ⚠️ **"한 번만 센다" 가드를 두지 않는다**(2026-08-14). `useRef`로 막아 뒀더니 개발 모드
 *    Strict Mode에서 첫 effect가 애니메이션을 시작 → cleanup이 멈춤 → 두 번째 effect가
 *    가드에 걸려 그냥 끝나서, **숫자가 중간값에 멈춰** 있었다. `value`가 바뀌어도 같은 가드가
 *    새로 세는 걸 막았다. 지금은 effect가 돌 때마다 처음부터 다시 센다 — cleanup이 멈추면
 *    다음 실행이 이어받으므로 두 번 도는 게 문제가 안 된다.
 * ⚠️ **상태가 아니라 DOM에 직접 쓴다.** effect 안에서 `setState`를 부르면 렌더가 한 번 더
 *    돌고(`react-hooks/set-state-in-effect`), 여기서는 그 일이 초당 60번 일어난다 —
 *    바뀌는 건 글자 하나뿐이라 리렌더가 필요 없다.
 */
export function CountUp({ value, duration = 0.9 }: { value: number; duration?: number }) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (prefersReduced) {
      element.textContent = String(value);
      return;
    }

    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        element.textContent = String(Math.round(latest));
      },
    });

    return () => controls.stop();
  }, [value, duration, prefersReduced]);

  /* 첫 렌더(서버 포함)는 언제나 최종값이다 — 세는 동안만 위 effect가 낮춰 쓴다 */
  return <span ref={ref}>{value}</span>;
}
