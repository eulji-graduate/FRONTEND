"use client";

import { useEffect, useRef } from "react";

/**
 * 목록에 항목이 늘어나면 **새로 생긴 쪽으로 부드럽게 스크롤**한다.
 *
 * 스크롤바는 사이트 전체에서 숨긴다(`globals.css`) — 막대를 보여주는 대신
 * 화면이 따라 움직여서 "뭔가 추가됐다"를 알린다.
 * ⚠️ 줄어들 때는 움직이지 않는다. 지운 자리로 끌려가면 오히려 방해가 된다.
 */
export function useScrollToLatest<T extends HTMLElement>(count: number) {
  const ref = useRef<T>(null);
  const previousCount = useRef(count);

  useEffect(() => {
    const element = ref.current;
    const grew = count > previousCount.current;
    previousCount.current = count;

    if (!element || !grew) return;
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [count]);

  return ref;
}
