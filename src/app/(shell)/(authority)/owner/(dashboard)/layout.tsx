import { LayoutDashboard } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/features/shell/components/page-header";

/** 대시보드 상단바 — 사이드바에서 바로 닿는 화면이라 backTo는 두지 않는다. */
export default function OwnerDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="대시보드" icon={LayoutDashboard} />
      {children}
    </>
  );
}
