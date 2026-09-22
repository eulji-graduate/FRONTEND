import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { redirectIfSignedIn } from "@/features/auth/me";

export const metadata: Metadata = {
  title: "로그인 — Z",
  description: "기업 코드로 워크스페이스에 연결하고 로그인하세요.",
};

/**
 * 로그인 — 기업 코드 확인 후 계정을 받는다.
 *
 * ⚠️ **기업 코드를 주소에 붙이지 않는다**(CLAUDE.md §라우트 그룹). 주소창 값은 사용자가
 *    고칠 수 있어 어차피 서버가 세션과 대조해야 한다. 코드는 로그인 전 화면에만 등장한다.
 */
export default async function LoginPage() {
  /*
    ⚠️ 이미 로그인한 사람은 자기 자리로 보낸다 — **미들웨어가 아니라 여기서** 한다.
       미들웨어는 쿠키가 있는지만 알아서, 만료된 토큰을 든 사람을 로그인 화면 밖으로
       밀어 버린다(다시 로그인할 자리가 사라진다).
  */
  await redirectIfSignedIn();

  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
