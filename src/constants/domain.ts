/**
 * 도메인 상수 — **모아 내보내는 자리**다. 값은 도메인별 파일에 있다.
 *
 * ⚠️ 여기에 새 상수를 적지 않는다. 도메인 파일에 넣고 이 줄에 더한다 —
 *    한 파일에 다 모으면 회의 상수를 고치러 들어가서 기업 상수를 같이 보게 된다.
 * ⚠️ ERD·API 스펙이 아직 없다(BE 협의 전). 코드값은 **FE 제안**이고,
 *    담당자 도메인 문서를 받으면 해당 파일부터 맞춘다(CLAUDE.md §연동 검증).
 *
 * 새로 쓰는 코드는 `@/constants/meeting`처럼 **도메인 파일에서 직접** 가져와도 된다.
 */

export * from "./action";
export * from "./authority";
export * from "./handover";
export * from "./meeting";
export * from "./member";
export * from "./project";
export * from "./system";
