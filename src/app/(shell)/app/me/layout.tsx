import { UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/features/shell/components/page-header";

export default function AppMeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="마이페이지" icon={UserRound} />
      {children}
    </>
  );
}
