/**
 * `next/cache` 대역 — **테스트 환경에서만** 쓴다(`jest.config.ts`의 `moduleNameMapper`).
 *
 * ⚠️ 왜 필요한가: `"use server"` 파일을 클라이언트 컴포넌트가 import하면, **실제 Next는**
 *    그 자리를 클라이언트 참조로 바꿔치기해서 서버 코드가 브라우저 번들에 안 들어간다.
 *    jest에는 그 변환이 없어서 `next/cache`를 곧이곧대로 읽고, 그 안에서 서버 스트림
 *    유틸이 `Request`·`TextEncoder` 같은 전역을 건드려 **jsdom 테스트가 통째로 터진다.**
 *    (`InviteSetup` → `useInviteCommit` → `commitOnboardingAction` → `next/cache`)
 * ⚠️ **제품 코드를 테스트에 맞춰 비틀지 않는다.** 변경 뒤 `revalidatePath`는 규칙이라
 *    빼는 게 아니라, 테스트 환경이 못 읽는 부분을 여기서 대신한다.
 * ⚠️ 폴리필을 하나씩 채우는 길도 있었지만(`TextEncoder` 넣으면 다음은 `Request`…),
 *    Next 내부 구현이 바뀔 때마다 따라다녀야 한다. 경계에서 한 번 끊는 게 낫다.
 * ⚠️ 재검증이 **불렸는지**를 확인하고 싶으면 테스트에서 이 모듈을 `jest.mock`으로 감싸
 *    스파이를 건다 — 여기 기본값은 아무 일도 하지 않는다.
 */
/* eslint-disable @typescript-eslint/no-unused-vars -- 대역이라 인자를 안 쓴다. 실제 시그니처를 그대로 둔다 */
export function revalidatePath(path: string, type?: "layout" | "page"): void {}
export function revalidateTag(tag: string): void {}
export function unstable_cache<T extends (...args: never[]) => unknown>(fn: T): T {
  return fn;
}
