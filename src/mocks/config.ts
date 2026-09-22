/**
 * 목 / 실서버 전환 스위치.
 *
 * ⚠️ ERD·API 스펙이 없어 지금은 목으로 개발한다(DECISIONS). BE가 붙으면 이 값만 끄면 된다.
 * 분기는 각 도메인의 `server.ts`와 `actions.ts`에서만 한다 — 컴포넌트는 이 값을 몰라야 한다.
 */
export const isMock = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
