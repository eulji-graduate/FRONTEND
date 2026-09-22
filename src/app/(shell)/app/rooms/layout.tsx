import { CalendarRange } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/features/shell/components/page-header";

interface RoomsLayoutProps {
  children: ReactNode;
}

/**
 * 사이드바에서 바로 닿는 화면이라 뒤로가기를 두지 않는다(`calendar`·`notice` 목록과 같은 규칙).
 * ⚠️ 아이콘은 사이드바의 "회의 예약" 항목(`sidebar-item.tsx`의 `room: CalendarRange`)과 같은 걸 쓴다 —
 *    메뉴에서 본 아이콘과 화면 머리의 아이콘이 다르면 같은 화면으로 안 읽힌다.
 */
export default function RoomsLayout({ children }: RoomsLayoutProps) {
  return (
    <>
      <PageHeader title="회의 예약" icon={CalendarRange} />
      {children}
    </>
  );
}
