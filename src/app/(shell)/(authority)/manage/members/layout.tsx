import type { ReactNode } from "react";

import { MembersPageHeader } from "@/features/member/components/members-page-header";

/**
 * ⚠️ **머리에 [계정 발급]을 두지 않는다.** 목록 카드 안 오른쪽에 둔다 — 그 버튼은
 *    권한에 따라 사라지는데, 머리에 두면 사라졌을 때 제목 줄이 휑해진다.
 * ⚠️ 상세도 이 레이아웃 아래다 — 헤더가 한 번만 마운트돼야 뒤로가기 화살표가 안 덜컥거린다.
 */
export default function ManageMembersLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MembersPageHeader />
      {children}
    </>
  );
}
