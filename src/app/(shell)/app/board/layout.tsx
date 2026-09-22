import { Columns3 } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/features/shell/components/page-header";

export default function BoardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="보드" icon={Columns3} />
      {children}
    </>
  );
}
