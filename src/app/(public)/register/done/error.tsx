"use client";

import { AuthError } from "@/features/auth/components/auth-error";

export default function Error({ reset }: { reset: () => void }) {
  return <AuthError title="화면을 불러오지 못했습니다" reset={reset} />;
}
