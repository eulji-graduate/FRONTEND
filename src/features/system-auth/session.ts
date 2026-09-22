import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies, headers } from "next/headers";

import { isSecureRequest, tokenCookieOptions } from "@/features/auth/cookie";

import { SYSTEM_SESSION_COOKIE, SYSTEM_SESSION_MAX_AGE } from "./cookie";

/**
 * 시스템 관리자 로그인 — 단일 계정, 아이디·비밀번호가 **env var**(`SYSTEM_ADMIN_ID` /
 * `SYSTEM_ADMIN_PASSWORD`)다. 운영자는 서비스 전체에 한 명뿐이라 DB 계정 없이 이걸로
 * 충분하다(팀 결정, 2026-08-19).
 *
 * ⚠️ 쿠키 값은 **서명한다**(HMAC-SHA256). "authenticated" 문자열만 그대로 구우면 그 문자열을
 *    아는 누구나 브라우저에서 쿠키를 직접 심어 들어올 수 있다 — 서명해야 시크릿(env var)을
 *    아는 서버만 만들 수 있는 값이 된다.
 * ⚠️ 서명 비밀키를 **따로 두지 않고 admin id·password로 만든다.** 로그인 비밀 자체가 이미
 *    같은 env var라, 세 번째 시크릿을 추가해도 배포 쪽 값만 하나 늘 뿐 안전성은 안 늘어난다.
 * ⚠️ `(system)/layout.tsx`에서만 쓴다. `proxy.ts`(Edge)는 이 파일을 import할 수 없다
 *    (`server-only`) — 값을 봐야 하는 가드는 레이아웃에서 한다는 규칙(`proxy.ts` 상단 주석)과
 *    같은 이유로, 애초에 `/system`은 `proxy.ts`의 보호 목록에서 뺐다.
 */

const SESSION_TAG = "system-admin";

function requireEnvCredentials(): { id: string; password: string } {
  const id = process.env.SYSTEM_ADMIN_ID;
  const password = process.env.SYSTEM_ADMIN_PASSWORD;
  if (!id || !password) {
    throw new Error("SYSTEM_ADMIN_ID / SYSTEM_ADMIN_PASSWORD 환경변수가 설정되어 있지 않습니다.");
  }
  return { id, password };
}

function sign(payload: string): string {
  const { id, password } = requireEnvCredentials();
  return createHmac("sha256", `${id}:${password}`).update(payload).digest("hex");
}

/** 길이부터 맞춰 본다 — 다르면 `timingSafeEqual`이 그대로 던진다 */
function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * ⚠️ 발급 시각을 페이로드에 함께 서명한다. 시각 없이 고정 문자열만 서명하면 쿠키의
 *    `Max-Age`는 **브라우저만 지키는 약속**이라, 그 쿠키 값이 어디선가 그대로 새 나가면
 *    (프록시 로그·백업·devtools export 등) 서버는 서명만 맞으면 영원히 받아 준다 —
 *    발급 시각을 실어 서버가 직접 수명을 재는 쪽이 아니면 "4시간짜리 세션"이 이름뿐이다.
 */
function buildPayload(): string {
  return `${SESSION_TAG}:${Math.floor(Date.now() / 1000)}`;
}

function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const [tag, issuedAtRaw] = payload.split(":");
  if (tag !== SESSION_TAG) return false;

  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return false;

  const ageSeconds = Math.floor(Date.now() / 1000) - issuedAt;
  // 음수(미래 발급)면 위조됐거나 시계가 안 맞는 값이다 — 둘 다 거부한다
  if (ageSeconds < 0 || ageSeconds > SYSTEM_SESSION_MAX_AGE) return false;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * 입력값이 env var와 같은가 — 아이디·비밀번호 어느 쪽이 틀렸는지는 가르지 않는다(계정이
 * 하나뿐이라 가를 것도 없다).
 *
 * ⚠️ `===`가 아니라 `timingSafeEqual`로 본다. 위 `isValidToken`이 서명값을 이렇게 비교하는
 *    것과 같은 이유 — 문자열을 앞에서부터 비교하다 다른 글자에서 바로 멈추는 비교는,
 *    반복 시도하며 응답 시간을 재면 몇 글자까지 맞았는지가 새 나간다. 계정이 하나뿐이라
 *    이 계정 하나가 뚫리면 그걸로 끝이라 더 위험하다.
 * ⚠️ **둘 다 항상 계산한다.** `idMatches && verify(password)`처럼 짧게 쓰면 아이디가 틀렸을
 *    때 비밀번호 비교 자체를 건너뛰어, 그 건너뜀만으로도 "아이디가 틀렸다"는 타이밍이
 *    새 나간다 — 그래서 두 결과를 각자 변수로 받아 두고 마지막에만 합친다.
 */
export function verifySystemCredentials(adminId: string, password: string): boolean {
  const expected = requireEnvCredentials();
  const idMatches = timingSafeStringEqual(adminId, expected.id);
  const passwordMatches = timingSafeStringEqual(password, expected.password);
  return idMatches && passwordMatches;
}

export async function createSystemSession(): Promise<void> {
  const jar = await cookies();
  const isSecure = isSecureRequest((await headers()).get("x-forwarded-proto"));
  const payload = buildPayload();
  const token = `${payload}.${sign(payload)}`;
  jar.set(SYSTEM_SESSION_COOKIE, token, tokenCookieOptions(SYSTEM_SESSION_MAX_AGE, isSecure));
}

/** 유효한 시스템 세션이 있는가 — `(system)/layout.tsx`가 이 값으로 로그인 폼과 실제 화면을 가른다 */
export async function hasSystemSession(): Promise<boolean> {
  const jar = await cookies();
  return isValidToken(jar.get(SYSTEM_SESSION_COOKIE)?.value);
}

export async function clearSystemSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SYSTEM_SESSION_COOKIE);
}
