"use client";

import { useEffect, useState } from "react";

interface DraftSyncOptions<T> {
  /** 화면이 지금 들고 있는 값 */
  value: T;
  /** 임시 보관함에서 읽기 — 없으면 undefined */
  load: () => T | undefined;
  /** 임시 보관함에 쓰기 */
  save: (value: T) => void;
  /** 보관함 값으로 화면 상태를 되돌리기 */
  restore: (value: T) => void;
}

/**
 * 단계를 오갈 때 입력이 사라지지 않게 임시 보관함과 맞춰준다.
 * ⚠️ BE 연동 전까지만 쓰는 코드다 — `draft.ts` 참고.
 *
 * 순서가 중요하다: **먼저 복원하고, 복원이 끝난 뒤부터 저장**한다.
 * 반대로 하면 서버에서 받은 초기값이 보관함을 덮어써서 편집 내용이 날아간다.
 */
export function useDraftSync<T>({ value, load, save, restore }: DraftSyncOptions<T>) {
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    const saved = load();
    if (saved) restore(saved);
    // 브라우저에만 있는 값(sessionStorage)이라 첫 렌더 뒤에야 읽을 수 있다.
    // 렌더 중에 읽으면 서버 HTML과 어긋난다(hydration) — 한 번만 일어나는 동기화다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsRestored(true);
    // 첫 렌더에서 한 번만 — 이후에는 화면 상태가 기준이다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isRestored) return;
    save(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRestored, value]);
}
