import type { Metadata } from "next";

import { SubscriptionGate } from "@/features/billing/components/subscription-gate";
import { getBillingConfig, getOnboardingSubscription } from "@/features/billing/server";
import { getViewer } from "@/features/shell/viewer";
import { canManageBilling } from "@/lib/permission";

export const metadata: Metadata = {
  title: "구독 재개",
};

/**
 * 구독이 끊긴 회사가 로그인하면 오는 화면.
 *
 * ⚠️ **셸(사이드바) 밖이다.** 라우트 그룹을 `(shell)`에 두면 사이드바가 붙어, 막혀 있는데도
 *    들어와 있는 것처럼 보인다.
 * ⚠️ **아직 여기로 보내는 길이 없다.** 세션에 구독 상태가 실리면 `middleware.ts`가 막고
 *    여기로 돌린다 — 지금은 주소로 직접 들어와 확인한다(개발 중 라우트 보호는 넣지 않는다).
 * ⚠️ 조회는 Server Component가 한다(CLAUDE.md §렌더링).
 * ⚠️ 결제 권한은 **역할이 아니라 `canManageBilling`** 이 정한다 — 대표뿐 아니라 Admin 겸직자도
 *    결제한다(DECISIONS §(shared)). 잠긴 쪽을 보려면 `viewer.ts`의 목을 바꿔 확인한다.
 */
export default async function SubscriptionGatePage() {
  const [config, subscription, viewer] = await Promise.all([
    getBillingConfig(),
    getOnboardingSubscription(),
    getViewer(),
  ]);

  return (
    <SubscriptionGate
      config={config}
      status={subscription.status}
      role={viewer.role}
      canManage={canManageBilling(viewer)}
    />
  );
}
