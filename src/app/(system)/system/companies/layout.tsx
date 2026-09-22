import { Building2 } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/features/shell/components/page-header";

export default function SystemCompaniesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="기업 관리" icon={Building2} showNotifications={false} />
      {children}
    </>
  );
}
