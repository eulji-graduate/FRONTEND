"use client";

import { SCALE_STORAGE_KEY, type ScreenScale } from "./scale";

/**
 * 배율을 담는 **바깥 저장소**(`localStorage`)와 React를 잇는 자리.
 *
 * ⚠️ **구독하면 곧바로 지금 값을 한 번 알린다.** 그래야 구독하는 쪽이 효과 본문에서 값을
 *    읽지 않아도 되고(그러면 렌더가 한 번 더 돈다), 하이드레이션 직후에 저장된 값으로 맞는다.
 * ⚠️ 서버는 이 값을 모른다. 첫 렌더는 기본값으로 그려지지만 **화면은 안 튄다** —
 *    실제 확대는 첫 페인트 전에 루트 부트 스크립트가 이미 끝냈고(`SCALE_BOOT_SCRIPT`),
 *    여기서 맞추는 건 "어느 칸이 눌려 있나"뿐이다.
 */

const listeners = new Set<() => void>();

/**
 * 저장소가 막혔을 때 쓰는 **이번 세션용 값**.
 *
 * ⚠️ 사생활 모드나 저장소 차단에서는 `setItem`이 던진다. 그걸 삼키고 끝내면 곧바로 이어지는
 *    `readScale()`이 `null`을 돌려줘서, **누른 배율이 100%로 되돌아간다** — 눌렀는데
 *    아무 일도 안 일어난 것처럼 보인다. 이번 탭에서만이라도 고른 값이 살아 있어야 한다.
 */
let fallback: string | null = null;

/**
 * 다른 탭에서 바뀐 것도 따라간다(`storage` 이벤트).
 * ⚠️ 같은 탭에서 바꾼 건 `storage`가 안 온다 — 그래서 `writeScale`이 직접 알린다.
 */
export function subscribeScale(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  // ⚠️ 지금 값을 한 번 알린다 — 구독하는 쪽이 효과 본문에서 저장소를 읽지 않게 한다
  queueMicrotask(onChange);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function readScale(): string | null {
  try {
    // ⚠️ 저장소가 살아 있어도 아직 아무것도 안 썼으면 `null`이다 — 그때는 세션 값을 쓴다
    return localStorage.getItem(SCALE_STORAGE_KEY) ?? fallback;
  } catch {
    // 사생활 모드·저장소 차단 — 이번 세션에 고른 값으로 산다
    return fallback;
  }
}

export function writeScale(next: ScreenScale): void {
  // ⚠️ **먼저 세션에 담는다.** 저장소가 막혀도 이번 탭에서는 고른 값이 유지된다
  fallback = String(next);

  try {
    localStorage.setItem(SCALE_STORAGE_KEY, String(next));
  } catch {
    // 다음에 열 때는 기본값으로 돌아간다 — 저장할 데가 없으니 그게 맞다
  }

  listeners.forEach((notify) => notify());
}

/**
 * 화면 폭 — 배율을 **권할지** 판단할 재료.
 *
 * ⚠️ `devicePixelRatio`는 **안 본다.** 전에는 같이 실어 보냈는데, 중요한 건 OS가 어떻게
 *    거기 도달했는지가 아니라 **지금 CSS 폭이 기준(1440)에서 얼마나 벗어났나**다 —
 *    dpr 2로 1152인 기기와 dpr 1로 1152인 기기는 똑같이 크게 보인다.
 *    쓰지 않는 값을 실어 보내면 다음 사람이 판정에 쓰이는 줄 안다.
 * ⚠️ 값은 **문자열 하나**로 다룬다. 객체로 들고 다니면 매번 새 참조라 쓸데없이 다시 그린다.
 */
export function subscribeViewport(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  queueMicrotask(onChange);
  return () => window.removeEventListener("resize", onChange);
}

export function readViewport(): string {
  return String(window.innerWidth);
}
