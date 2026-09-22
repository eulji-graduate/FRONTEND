import { z } from "zod";

/**
 * 로그인 입력의 **스키마**와 검증.
 *
 * ⚠️ 타입을 손으로 적지 않고 **스키마에서 파생**한다(`z.infer`).
 * ⚠️ 여기서 보는 건 **모양뿐**이다. 맞는 계정인지는 서버만 안다 — 화면이 통과시켜도
 *    서버가 다시 본다(§권한: 화면 숨김은 보안이 아니다).
 * ⚠️ 비밀번호 규칙(길이·문자 종류)은 **BE 정책을 모른다.** 임의로 정하면 서버가 받아 줄
 *    비밀번호를 화면이 막는다 — 비었는지만 본다.
 */
export const credentialsSchema = z.object({
  email: z.string().trim().min(1, "이메일을 입력해 주세요").includes("@", {
    message: "이메일 주소를 다시 확인해 주세요",
  }),
  password: z.string().min(1, "비밀번호를 입력해 주세요"),
});

export type Credentials = z.infer<typeof credentialsSchema>;
export type CredentialErrors = Partial<Record<keyof Credentials, string>>;

/**
 * 화면이 쓰는 모양(칸별 오류 한 줄)으로 옮긴다.
 *
 * ⚠️ 한 칸에 오류가 여러 개 나와도 **첫 줄만** 쓴다. 빈 칸이면 "입력해 주세요"와 "형식이
 *    틀렸어요"가 같이 나오는데, 아직 아무것도 안 적은 사람에게 형식 얘기는 소음이다.
 */
export function validateCredentials(input: Credentials): CredentialErrors {
  const result = credentialsSchema.safeParse(input);
  if (result.success) return {};

  const errors: CredentialErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof Credentials | undefined;
    if (field && errors[field] === undefined) errors[field] = issue.message;
  }
  return errors;
}
