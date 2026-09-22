import { CalendarRange } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/features/shell/components/page-header";

/** ⚠️ 상단바에 "추가" 버튼을 두지 않는다 — 카드 위 액션 자리에 둔다(DESIGN.md §1). */
export default function ManageRoomsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="회의실 관리" icon={CalendarRange} />
      {children}
    </>
  );
}
