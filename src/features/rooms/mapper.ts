/**
 * BE shape → UI 계약 (§Mock 격리막). 컴포넌트는 이 파일을 모른다 — `server.ts`/`actions.ts`만 쓴다.
 * 도메인별로 나뉘어 있다 — ROOM-02(주간 현황)=`mapper/availability.ts`,
 * ROOM-01·03·04(회의실 CRUD)=`mapper/rooms.ts`, MEET-01(회의 개설·예약)=`mapper/meetings.ts`.
 */

export * from "./mapper/availability";
export * from "./mapper/meetings";
export * from "./mapper/rooms";
