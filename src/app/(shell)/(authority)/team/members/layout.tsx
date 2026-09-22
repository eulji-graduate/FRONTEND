import { UserRoundCheck } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/features/shell/components/page-header";

/** 팀원 관리 상단바 — 사이드바에서 바로 닿는 화면이라 backTo는 두지 않는다. */
export default function TeamMembersLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="팀원 관리" icon={UserRoundCheck} />
      {children}
    </>
  );
}
