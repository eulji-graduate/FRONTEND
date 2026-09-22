import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "기업 등록 신청 — Z",
  description: "회사 정보를 남기면 검토 후 기업 코드를 메일로 보내 드립니다.",
};

/**
 * 기업 등록 신청.
 *
 * ⚠️ 여기서 계정이 만들어지지 않는다 — **신청**이다. 승인 뒤 기업 코드가 메일로 간다.
 * ⚠️ 등록 신청 API는 아직 없다(BE 미개발) — 검증만 하고 완료 화면으로 넘긴다(§Mock 격리막).
 */
export default function RegisterPage() {
  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
}
