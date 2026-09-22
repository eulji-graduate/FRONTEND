"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { FLASH_TOAST, FLASH_TOAST_PARAM, isFlashToastKey } from "@/constants/flash-toast";

/**
 * 옮겨 온 화면에서 **한 번만** 띄우는 토스트.
 *
 * ⚠️ `redirect`가 걸린 서버 액션은 성공을 화면에 못 돌려준다 — 액션이 주소에 열쇠를 얹고
 *    (`?toast=PROJECT_CREATED`) 도착한 화면이 이 컴포넌트로 대신 말한다(§토스트).
 * ⚠️ **띄운 뒤 주소를 지운다**(`replace`). 안 지우면 새로고침·뒤로가기마다 같은 말이 다시 뜨고,
 *    주소를 복사해 공유하면 남에게도 "만들었습니다"가 뜬다.
 * ⚠️ `useRef`로 한 번만 실행한다 — `replace` 뒤에도 이 효과가 한 번 더 도는 경우가 있어서,
 *    없으면 같은 토스트가 두 번 겹쳐 뜬다.
 */
export function FlashToast() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const shown = useRef(false);

  const key = params.get(FLASH_TOAST_PARAM);

  useEffect(() => {
    if (shown.current || !isFlashToastKey(key)) return;

    shown.current = true;
    toast.success(FLASH_TOAST[key]);

    /*
      ⚠️ 다른 조건(검색어·필터)은 그대로 두고 **이 열쇠만** 뺀다 — 목록 화면은 주소에
         조건을 싣기 때문에 통째로 지우면 사용자가 고른 조건이 날아간다.
    */
    const next = new URLSearchParams(params);
    next.delete(FLASH_TOAST_PARAM);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [key, params, pathname, router]);

  return null;
}
