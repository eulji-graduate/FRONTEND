import { AUTHORITY, type Authority } from "@/constants/authority";

/**
 * 계정 발급 창의 직급 기본값 — **Member 권한 직급 중 가장 낮은 것**(#30).
 *
 * ⚠️ 직급 목록은 **높은 순**이다(팀장 → … → 사원, 온보딩 2단계·기업 설정 순서). 전에는 첫
 *    번째를 기본으로 잡아 실서버에서 `팀장`이 골라졌고, 그대로 발급하면 권한은 Member인데
 *    직급만 팀장인 계정이 생겼다 — BE는 권한을 `role`(권한 칸)로 정하고 직급은 이름표로만
 *    붙인다(`MemberDirectoryService.issue`). 민섭님 실서버 점검에서 발견(2026-11-10).
 * ⚠️ 권한 칸의 기본값(Member)과 **같은 쪽**을 고른다 — 둘이 어긋난 채로 시작하면 안 된다.
 * ⚠️ Member 직급이 하나도 없으면(이상한 회사 설정) 마지막 직급, 그것도 없으면 빈 값이다.
 */
export function pickDefaultPositionName(
  positions: readonly { name: string; role: Authority }[],
): string {
  const memberPositions = positions.filter((position) => position.role === AUTHORITY.MEMBER);
  return memberPositions.at(-1)?.name ?? positions.at(-1)?.name ?? "";
}
