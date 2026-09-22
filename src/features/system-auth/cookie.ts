/**
 * 시스템 관리자 세션 쿠키의 이름과 수명.
 *
 * ⚠️ 회사 로그인 세션(`z_access_token`, `features/auth/cookie.ts`)과는 **완전히 다른 축**이다 —
 *    시스템 관리자는 기업 계정이 아니라 서비스 운영자 단일 계정(env var)이라 별도 쿠키로 가른다.
 */
export const SYSTEM_SESSION_COOKIE = "z_system_session";

/** 4시간 — 회사 세션(30분)보다 길게 둔다. 운영자는 하루 중 드문드문 여러 화면을 오간다. */
export const SYSTEM_SESSION_MAX_AGE = 60 * 60 * 4;
