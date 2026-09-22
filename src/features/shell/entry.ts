import { canUseWorkspace, type SubscriptionStatus } from "@/features/billing/subscription";

import { roleHome } from "./home";
import type { Viewer } from "./viewer";

/**
 * 로그인 직후 어디로 보낼지 — **한 곳에서 정한다.**
 *
 * 계정이 생기는 길이 둘이라 첫 화면이 갈린다.
 *   기업 등록 신청 → 관리자 승인 → **대표에게** 아이디·비밀번호가 메일로 간다
 *     → 그 대표의 첫 로그인은 **온보딩**이다(부서·직급·초대·결제를 아직 안 했다)
 *   대표가 3단계에서 초대 → **사원에게** 아이디·비밀번호가 메일로 간다
 *     → 회사 설정은 이미 끝나 있으므로 바로 **자기 역할 대시보드**다
 *
 * ⚠️ 순서가 중요하다. 온보딩을 안 끝냈으면 **구독보다 먼저** 온보딩이다 —
 *    결제는 온보딩 4단계라, 아직 3단계도 안 한 사람을 결제 화면으로 보내면 되돌아올 길이 없다.
 * ⚠️ 판정은 **서버가** 한다. 이 함수는 목적지만 고르고, 실제로 막는 건 세션이 붙은 뒤
 *    `middleware.ts`다 — 화면 이동은 UX일 뿐 보안이 아니다(CLAUDE.md §권한).
 *    ⚠️ 지금은 미들웨어를 두지 않는다(개발 중 화면 확인). 붙일 때 이 함수를 그대로 쓴다.
 */
export interface EntryState {
  viewer: Viewer;
  /** 온보딩(부서·직급·초대·결제)을 끝냈는가 — 기업 단위 값이다 */
  isOnboarded: boolean;
  status: SubscriptionStatus;
}

export function loginRedirect({ viewer, isOnboarded, status }: EntryState): string {
  if (!isOnboarded) return "/onboarding/1";
  if (!canUseWorkspace(status)) return "/subscription";
  return roleHome(viewer.role);
}
