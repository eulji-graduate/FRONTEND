import { Building2 } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/features/shell/components/page-header";

/**
 * ⚠️ **머리에 저장 버튼을 두지 않는다.** 저장은 카드마다 따로다 — 머리에 하나 두면
 *    무엇이 저장되는지 알 수 없고, 팀만 고쳤는데 기본 정보까지 보내게 된다.
 */
export default function OwnerSettingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="기업 설정" icon={Building2} />
      {children}
    </>
  );
}
