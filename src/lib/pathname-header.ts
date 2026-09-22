/**
 * 문지기(`proxy.ts`)가 지금 주소를 실어 보내는 헤더 이름.
 *
 * ⚠️ **상수만 있는 파일이다.** `proxy.ts`에 두면 이 값을 읽는 쪽(`viewer.ts`)이 미들웨어
 *    모듈을 통째로 끌어와, `next/server`가 없는 곳(jsdom 테스트)에서 터진다.
 * ⚠️ 서버 컴포넌트는 지금 주소를 모른다 — 목에서 역할별 사이드바를 그리려면 이 값이 필요하다
 *    (`getViewer`). 로그인이 붙으면 세션이 그 자리를 맡는다.
 */
export const PATHNAME_HEADER = "x-z-pathname";
