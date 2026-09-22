import { z } from "zod";

/**
 * 시스템 관리자 로그인 입력의 **스키마**와 검증.
 *
 * ⚠️ 여기서 보는 건 **모양뿐**이다(비었는지). 맞는 계정인지는 `session.ts`가 env var와
 *    대조한다(§권한: 화면 검증은 편의일 뿐, 판정은 서버가 다시 본다).
 */
export const systemCredentialsSchema = z.object({
  adminId: z.string().trim().min(1, "아이디를 입력해 주세요"),
  password: z.string().min(1, "비밀번호를 입력해 주세요"),
});

export type SystemCredentials = z.infer<typeof systemCredentialsSchema>;
export type SystemCredentialErrors = Partial<Record<keyof SystemCredentials, string>>;

export function validateSystemCredentials(input: SystemCredentials): SystemCredentialErrors {
  const result = systemCredentialsSchema.safeParse(input);
  if (result.success) return {};

  const errors: SystemCredentialErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof SystemCredentials | undefined;
    if (field && errors[field] === undefined) errors[field] = issue.message;
  }
  return errors;
}
