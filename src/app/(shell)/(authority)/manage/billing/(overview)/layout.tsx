import { CreditCard } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/features/shell/components/page-header";

/**
 * ⚠️ **`(overview)` 그룹에만 걸리는 머리다.** `billing/` 바로 아래에 두면 `checkout`까지
 *    이 레이아웃을 물려받아 상단바가 두 개로 겹친다 — 결제는 자기 머리를 따로 갖고 있다.
 *    괄호 그룹은 URL에 안 들어가므로 주소는 `/manage/billing`이다.
 * ⚠️ **머리에 버튼을 두지 않는다.** 플랜 변경은 지금 쓰는 플랜 카드 안에 있어야
 *    "무엇을" 바꾸는지가 함께 읽힌다 — 머리에 떼어 놓으면 대상이 사라진다.
 */
export default function BillingOverviewLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="구독" icon={CreditCard} />
      {children}
    </>
  );
}
