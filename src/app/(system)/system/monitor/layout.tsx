import { Activity } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/features/shell/components/page-header";

export default function SystemMonitorLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="시스템 모니터링" icon={Activity} showNotifications={false} />
      {children}
    </>
  );
}
