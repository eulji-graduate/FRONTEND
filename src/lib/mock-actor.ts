import "server-only";

import { AUTHORITY } from "@/constants/domain";

import type { Actor } from "./permission";

/**
 * 목 현재 사용자.
 *
 * ⚠️ 로그인(세션)이 아직 없다(BE 미개발) — 지금은 셸이 가정하는 **OWNER 한 명**이 고정으로 온다.
 *    auth가 붙으면 httpOnly 쿠키 세션에서 actor를 읽어 **이 함수만** 갈아끼운다 — 이 함수를 쓰는
 *    화면·Server Action은 그대로다(§Mock 격리막). 그래서 서버 재검사도 여기서 나온 actor로 한다.
 */
export function getMockActor(): Actor {
  return { id: 1, role: AUTHORITY.OWNER };
}
