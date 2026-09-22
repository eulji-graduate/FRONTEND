import { AUTHORITY, type Authority } from "@/constants/authority";

/**
 * 역할별 첫 화면 — **로그인·결제·온보딩을 마친 사람을 데려다 놓는 자리.**
 *
 * ⚠️ `/owner`를 화면마다 적지 않는다. 결제는 **대표만 하는 게 아니라 Admin 겸직자도** 한다
 *    (DECISIONS §(shared)) — 그 사람을 `/owner`로 보내면 자기 화면이 아닌 곳에 떨어진다.
 * ⚠️ **Admin 겸직은 첫 화면을 바꾸지 않는다.** Admin은 역할이 아니라 사람에게 덧붙는 부가
 *    권한이라(#59), 그 사람의 자리는 여전히 Leader·Member 대시보드다. `/manage`는 사이드바로
 *    들어가는 관리 화면이지 그 사람의 집이 아니다.
 * ⚠️ 화면에 역할 상수를 하드코딩하지 않는다(CLAUDE.md §권한).
 */
const ROLE_HOME: Record<Authority, string> = {
  [AUTHORITY.OWNER]: "/owner",
  [AUTHORITY.LEADER]: "/team",
  [AUTHORITY.MEMBER]: "/my",
  /** Z 서비스 운영자 — 기업 화면이 아니라 운영 화면으로 간다 */
  [AUTHORITY.SYSTEM]: "/system",
};

export function roleHome(role: Authority): string {
  return ROLE_HOME[role];
}
