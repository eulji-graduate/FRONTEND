import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterDone } from "@/features/auth/components/register-done";

export const metadata: Metadata = {
  title: "신청 완료 — Z",
  description: "기업 등록 신청이 접수됐습니다.",
};

/** 신청 완료 — 접수됐을 뿐 승인이 남았다는 걸 분명히 한다(§정직성). */
export default function RegisterDonePage() {
  return (
    <AuthShell hasLegalNotice={false}>
      <RegisterDone />
    </AuthShell>
  );
}
