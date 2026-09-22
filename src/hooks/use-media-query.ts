"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * 화면 폭 조건을 **읽기만** 한다.
 *
 * ⚠️ `useEffect`+`setState`로 만들지 않는다 — 하이드레이션 직후 렌더가 한 번 더 돈다.
 *    `useSyncExternalStore`는 브라우저가 가진 값을 그대로 구독한다.
 * ⚠️ 서버는 화면 폭을 모른다 — **좁은 쪽으로** 그린다. 무거운 것을 안 그리는 쪽이 안전하다.
 * ⚠️ 보이기/숨기기는 CSS(`hidden md:block`)로 충분하다. 이 훅은 **아예 만들지 말아야 할 때**만
 *    쓴다(three.js Canvas처럼 숨겨도 자원을 먹는 것).
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
