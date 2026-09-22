import { z } from "zod";

/**
 * 비밀번호 변경 폼의 **모양**과 검증 — 마이페이지 담당자 문서(2026-08-14)로 확인한 정책.
 *
 * ⚠️ **재사용 금지(이전 비밀번호)는 여기서 못 본다.** 서버만 아는 값이라 `AU-042`·`AU-043`으로
 *    돌아오면 그 응답을 그대로 화면에 옮긴다(`actions.ts`) — 여기 스키마는 모양(길이·조합·공백)만 본다.
 * ⚠️ **밖으로 낸다**(2026-08-19 — "새 비밀번호는 타이핑하다 안 맞으면 바로 빨갛게"라는
 *    지적). 제출해야만 걸리는 서버 왕복 없이 그 자리에서 판정하려면 화면(`change-password
 *    -dialog.tsx`)도 같은 정규식·같은 문구를 써야 한다 — 둘로 쪼개면 규칙이 두 벌이 된다.
 */
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9])[!-~]{8,16}$/;

/** 형식 오류 문구 — 서버 제출 검증과 화면 실시간 검증이 같은 말을 쓴다(§라벨 하드코딩 금지와 같은 이유) */
export const PASSWORD_FORMAT_ERROR =
  "비밀번호는 8~16자이며 영문, 숫자, 특수문자를 모두 포함해야 합니다";

/**
 * 입력칸 아래 안내 문구 — 정책이 바뀌면 여기만 고친다(라벨 하드코딩 금지와 같은 이유).
 *
 * ⚠️ **문장이 아니라 짧은 구절이다**(2026-08-19 축소 — "글자가 중간에 뭉쳐 있어 가독성이
 *    나쁘다"는 지적). 네 문장을 온전한 문법으로 다 적으면 폼 한가운데 문단이 하나 더
 *    생긴다 — 요구사항은 훑어서 확인하는 자리이지 읽는 자리가 아니다. 렌더링 쪽
 *    (`change-password-dialog.tsx`)이 이 배열을 점 목록(`list-disc`)으로 그린다.
 */
export const PASSWORD_POLICY_HINTS = [
  "8~16자",
  "영문·숫자·특수문자 모두 포함",
  "공백 불가",
  "이전 비밀번호 재사용 불가",
] as const;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "현재 비밀번호를 입력해 주세요"),
    newPassword: z.string().regex(PASSWORD_PATTERN, PASSWORD_FORMAT_ERROR),
    newPasswordConfirm: z.string().min(1, "새 비밀번호 확인을 입력해 주세요"),
  })
  .refine((draft) => draft.newPassword === draft.newPasswordConfirm, {
    message: "새 비밀번호가 일치하지 않습니다",
    path: ["newPasswordConfirm"],
  });

export type ChangePasswordDraft = z.infer<typeof changePasswordSchema>;
export type ChangePasswordErrors = Partial<Record<keyof ChangePasswordDraft, string>>;

/**
 * 화면이 쓰는 모양(칸별 오류 한 줄)으로 옮긴다 — `credentials.ts`(로그인)와 같은 자리.
 * ⚠️ 한 칸에 오류가 여러 개 나와도 **첫 줄만** 쓴다.
 */
export function validateChangePassword(input: ChangePasswordDraft): ChangePasswordErrors {
  const result = changePasswordSchema.safeParse(input);
  if (result.success) return {};

  const errors: ChangePasswordErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof ChangePasswordDraft | undefined;
    if (field && errors[field] === undefined) errors[field] = issue.message;
  }
  return errors;
}
