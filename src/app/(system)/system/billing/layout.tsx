import { CreditCard } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/features/shell/components/page-header";

export default function SystemBillingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="구독·매출 관리" icon={CreditCard} showNotifications={false} />
      {children}
    </>
  );
}
