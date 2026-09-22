"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { DEFAULT_SCALE, isScaledPath, parseScale } from "../scale";
import { readScale, subscribeScale } from "../scale-store";

/**
 * 배율을 **로그인 이후 화면에만** 붙였다 떼는 스위치(§scale `SCALED_PATH_PREFIXES`).
 *
 * 첫 페인트는 `SCALE_BOOT_SCRIPT`(같은 경로 판정)가 이미 맞춰 놓는다 — 여기는
 * **클라이언트 내비게이션** 몫이다. 부트 스크립트는 문서 로드 때 한 번만 돌아서,
 * 로그인 → 워크스페이스처럼 페이지를 새로 안 여는 이동에서는 아무도 배율을
 * 다시 계산하지 않았다. 그 반대(워크스페이스 → 랜딩)도 마찬가지라, 마이페이지에서
 * 75%를 고르면 랜딩까지 75%로 굳었다.
 *
 * ⚠️ 판정은 `isScaledPath` 한 곳이다 — 여기서 경로 목록을 다시 적지 않는다.
 * ⚠️ `subscribeScale`을 같이 듣는다 — 다른 탭에서 배율을 바꿔도 이 탭이 따라온다.
 *    (같은 탭의 변경은 배율 카드가 변수를 직접 만지지만, 구독이 겹쳐도 같은 값이라 무해하다.)
 * ⚠️ 렌더는 없다(`null`) — 루트 레이아웃에 놓여도 서버 렌더 결과에 영향을 주지 않는다.
 */
export function AppScaleScope() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const scale = parseScale(readScale());
      if (isScaledPath(pathname) && scale !== DEFAULT_SCALE) {
        root.style.setProperty("--app-scale", String(scale / 100));
      } else {
        root.style.removeProperty("--app-scale");
      }
    };

    apply();
    return subscribeScale(apply);
  }, [pathname]);

  return null;
}
