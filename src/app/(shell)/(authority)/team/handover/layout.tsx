import type { ReactNode } from "react";

import { TeamHandoversPageHeader } from "@/features/team-handover/components/team-handovers-page-header";

/** 상세도 이 레이아웃 아래다 — 헤더가 한 번만 마운트돼야 뒤로가기 화살표가 안 덜컥거린다. */
export default function TeamHandoverLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TeamHandoversPageHeader />
      {children}
    </>
  );
}
