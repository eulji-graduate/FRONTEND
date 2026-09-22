"use client";

import { useEffect } from "react";

/**
 * 온보딩 도중 탭을 닫으려 하면 브라우저가 한 번 물어보게 한다.
 *
 * ⚠️ 적어 둔 내용은 **`sessionStorage`에만** 있다. 탭을 닫으면 통째로 사라지는데,
 *    부서를 서른 개 만들다 실수로 닫으면 처음부터 다시다 — 조용히 잃게 두지 않는다(§정직성).
 * ⚠️ 브라우저가 보여 주는 문구는 **우리가 정할 수 없다.** 스팸을 막으려고 막아 둔 규칙이라
 *    `returnValue`만 채우면 브라우저 기본 문구가 뜬다.
 * ⚠️ 적어 둔 게 없으면 걸지 않는다. 아무것도 안 한 사람까지 붙잡으면 그냥 성가신 창이다.
 * ⚠️ 서버 저장이 붙으면 이 컴포넌트는 지운다 — 잃을 게 없어지기 때문이다.
 */
interface LeaveGuardProps {
  /** 잃을 게 있는지 — 아무것도 안 적었으면 붙잡지 않는다 */
  hasUnsaved: boolean;
}

export function LeaveGuard({ hasUnsaved }: LeaveGuardProps) {
  useEffect(() => {
    if (!hasUnsaved) return;

    const confirmLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // 일부 브라우저는 아직 이 값이 채워져 있어야 창을 띄운다
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", confirmLeave);
    return () => window.removeEventListener("beforeunload", confirmLeave);
  }, [hasUnsaved]);

  return null;
}
