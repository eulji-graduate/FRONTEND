import { Megaphone } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/features/shell/components/page-header";

export default function SystemNoticeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="공지 관리" icon={Megaphone} showNotifications={false} />
      {children}
    </>
  );
}
