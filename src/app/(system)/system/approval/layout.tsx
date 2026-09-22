import { ClipboardCheck } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/features/shell/components/page-header";

/**
 * ⚠️ 뒤로가기 화살표가 없다 — 상세가 모달이라 더 깊은 화면이 없다. 경로를 보고 화살표를
 *    붙이던 잎사귀(`approval-header.tsx`)도 그래서 없앴다(`companies/layout.tsx`와 같은 모양).
 */
export default function SystemApprovalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="기업 가입 승인" icon={ClipboardCheck} showNotifications={false} />
      {children}
    </>
  );
}
