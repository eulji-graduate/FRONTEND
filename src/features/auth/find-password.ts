import { z } from "zod";

/**
 * 비밀번호 찾기 폼의 **모양**과 검증 — `credentials.ts`(로그인)와 같은 자리.
 *
 * ⚠️ 이메일은 **회사 안에서만 유일**하다(마이페이지 담당자 문서, 2026-08-14) — 그래서
 *    이메일 하나만으로는 계정을 못 찾고 `companyCode`가 항상 같이 필요하다.
 * ⚠️ 여기서 보는 건 **모양뿐**이다. 계정이 있는지·재직 중인지는 서버만 안다(`AU-049`).
 */
export const findPasswordSchema = z.object({
  companyCode: z.string().trim().min(1, "기업 코드를 입력해 주세요"),
  email: z.string().trim().min(1, "이메일을 입력해 주세요").includes("@", {
    message: "이메일 주소를 다시 확인해 주세요",
  }),
});

export type FindPasswordDraft = z.infer<typeof findPasswordSchema>;
export type FindPasswordErrors = Partial<Record<keyof FindPasswordDraft, string>>;

/** 화면이 쓰는 모양(칸별 오류 한 줄)으로 옮긴다 — 한 칸에 오류가 여러 개면 첫 줄만 쓴다. */
export function validateFindPassword(input: FindPasswordDraft): FindPasswordErrors {
  const result = findPasswordSchema.safeParse(input);
  if (result.success) return {};

  const errors: FindPasswordErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof FindPasswordDraft | undefined;
    if (field && errors[field] === undefined) errors[field] = issue.message;
  }
  return errors;
}
