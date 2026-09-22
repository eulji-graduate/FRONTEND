import { ClipboardCheck } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/features/shell/components/page-header";

/** 인수인계서 신청 상단바 — 사이드바에서 바로 닿는 화면이라 backTo는 두지 않는다. */
export default function HandoverLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="인수인계서" icon={ClipboardCheck} />
      {children}
    </>
  );
}
