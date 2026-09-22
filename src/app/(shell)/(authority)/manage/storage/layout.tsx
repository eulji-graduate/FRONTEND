import { HardDrive } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/features/shell/components/page-header";

/**
 * ⚠️ **머리에 버튼을 두지 않는다.** 특히 `플랜 업그레이드`는 둘 수 없다 — 유료 플랜이
 *    하나뿐이고 무료도 체험도 없어서(CLAUDE.md §요금제), 올라갈 플랜 자체가 없다.
 *    용량이 모자라면 올리는 게 아니라 **넘긴 만큼 다음 결제일에 합산 청구**된다.
 */
export default function ManageStorageLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="저장소 관리" icon={HardDrive} />
      {children}
    </>
  );
}
