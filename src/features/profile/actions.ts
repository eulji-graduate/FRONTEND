"use server";

import { redirect } from "next/navigation";

import { clearSession, requireAccessToken } from "@/features/auth/session";
import { ApiError, serverApi, toUserMessage } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { isMock } from "@/mocks/config";

import { type ChangePasswordErrors, validateChangePassword } from "./password";

/** 비밀번호 변경 폼 결과 — `useActionState`가 그대로 들고 있는 모양. */
export interface ChangePasswordState {
  errors: ChangePasswordErrors;
  /** 칸에 못 매길 오류(현재 비번 틀림·과다 시도·통신 실패) */
  error?: string;
  /** 몇 번째 시도인가 — 다이얼로그가 입력칸의 `key`를 바꿔 되살리는 데 쓴다 */
  attempt: number;
}

/**
 * `PATCH /api/auth/me/password` 실패를 칸별 오류로 나눈다 — 마이페이지 담당자 문서(2026-08-14).
 *
 * ⚠️ **전부 400이다(429 제외).** "현재 비밀번호 틀림"(`AU-041`)도 400이라 401 인터셉터가
 *    이걸 토큰 만료로 잡아 로그아웃시키지 않는다 — 그래서 이 액션은 상태 코드가 아니라
 *    `errorCode`로만 가른다.
 * ⚠️ `Z-001`(길이·조합·공백 위반)의 필드별 오류는 `details`에 실려 오지만, 그 봉투 모양이
 *    아직 실코드로 확인되지 않았다(§연동 검증: Swagger·구두 추측 금지) — 여기서는 폼이 같은
 *    규칙을 먼저 막아 두고(`changePasswordSchema`), 서버까지 뚫고 온 `Z-001`은 전체 오류
 *    문구로만 보여준다.
 */
function toChangePasswordErrors(error: unknown): Pick<ChangePasswordState, "errors" | "error"> {
  if (!(error instanceof ApiError)) return { errors: {}, error: toUserMessage(error) };

  switch (error.code) {
    case "AU-041":
      return { errors: { currentPassword: error.message } };
    case "AU-040":
      return { errors: { newPasswordConfirm: error.message } };
    case "AU-042":
    case "AU-043":
      return { errors: { newPassword: error.message } };
    default:
      return { errors: {}, error: error.message };
  }
}

/**
 * 비밀번호 변경(마이페이지) — 3칸 폼(현재·새·새 확인) 전용.
 *
 * ⚠️ **`memberId`는 안 보낸다.** 토큰에서 꺼내 쓰는 값이라 보내도 서버가 무시한다.
 * ⚠️ **성공하면 모든 기기의 로그인이 풀린다**(BE가 전 세션을 폐기). 여기서 쿠키를 지우고
 *    로그인 화면으로 보내지 않으면, 화면은 바뀐 비밀번호로 이미 로그아웃된 토큰을 들고
 *    아무 요청에서나 401을 맞는다 — `logoutAction`과 같은 이유로 같은 자리에서 지운다.
 */
export async function changePasswordAction(
  prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const draft = {
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    newPasswordConfirm: String(formData.get("newPasswordConfirm") ?? ""),
  };

  const keep = (state: Omit<ChangePasswordState, "attempt">): ChangePasswordState => ({
    ...state,
    attempt: prevState.attempt + 1,
  });

  const errors = validateChangePassword(draft);
  if (Object.keys(errors).length > 0) return keep({ errors });

  if (isMock) {
    // 목 모드에는 바꿀 서버가 없다 — 조용히 성공한 척하지 않는다(§정직성).
    return keep({ errors: {}, error: "목 모드입니다. 실제 변경은 연동 후 동작합니다." });
  }

  const accessToken = await requireAccessToken();
  try {
    await serverApi<null>(ep.changePassword(), {
      method: "PATCH",
      accessToken,
      json: {
        currentPassword: draft.currentPassword,
        newPassword: draft.newPassword,
        newPasswordConfirm: draft.newPasswordConfirm,
      },
    });
  } catch (error) {
    return keep(toChangePasswordErrors(error));
  }

  await clearSession();
  // ⚠️ `redirect`는 예외를 던진다 — try/catch 밖이다(§렌더링·데이터).
  redirect("/login");
}
