"use server";

import { redirect } from "next/navigation";

import { type SystemCredentialErrors, validateSystemCredentials } from "./credentials";
import { clearSystemSession, createSystemSession, verifySystemCredentials } from "./session";

/** 로그인 결과 — `useActionState`가 그대로 들고 있는 모양(`features/auth/actions.ts`의 `LoginState`와 같은 문법) */
export interface SystemLoginState {
  errors: SystemCredentialErrors;
  /** 아이디·비밀번호 중 어느 쪽이 틀렸는지 가르지 않는다 — 계정이 하나뿐이라 가를 것도 없다 */
  error?: string;
  /** 방금 적은 아이디 — 실패했을 때 되살린다(비밀번호는 안 돌려준다) */
  adminId?: string;
  /** 몇 번째 시도인가 — 화면이 입력칸의 `key`를 바꿔 되살리는 데 쓴다(React 19 폼 리셋) */
  attempt: number;
}

export async function systemLoginAction(
  prevState: SystemLoginState,
  formData: FormData,
): Promise<SystemLoginState> {
  // ⚠️ 아이디는 여기서 한 번만 trim한다. zod 스키마도 trim하지만 검증에만 쓰이고 값은 안
  //    돌려주므로, 안 그러면 "admin "처럼 앞뒤 공백 있는 입력이 검증은 통과하고 실제 대조
  //    (`verifySystemCredentials`)에서는 원본 그대로 걸려 안 틀린 값이 틀렸다고 나온다.
  const adminId = String(formData.get("adminId") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const keep = (state: Omit<SystemLoginState, "adminId" | "attempt">): SystemLoginState => ({
    ...state,
    adminId,
    attempt: prevState.attempt + 1,
  });

  const errors = validateSystemCredentials({ adminId, password });
  if (Object.keys(errors).length > 0) return keep({ errors });

  if (!verifySystemCredentials(adminId, password)) {
    return keep({ errors: {}, error: "아이디 또는 비밀번호가 올바르지 않습니다." });
  }

  await createSystemSession();
  redirect("/system");
}

export async function systemLogoutAction(): Promise<void> {
  await clearSystemSession();
  redirect("/system");
}
