/**
 * 클라이언트·서버 양쪽에서 쓰는 순수 상수만 모은다.
 * ⚠️ `validate.ts`에 두지 않는다 — `validate.ts`는 `lib/permission.ts`(`server-only`)를
 *    가져오는데, 이 상수는 클라이언트 컴포넌트(`room-reservation-dialog.tsx`)도 써야 해서
 *    그 경로로 가져오면 `server-only`가 클라이언트 번들까지 끌려온다(빌드 에러).
 */

/** 예약 길이 — 팀 확정: 30분 한 타임, 연장하지 않는다(CLAUDE.md §브라우저 API). */
export const RESERVATION_DURATION_MINUTES = 30;

/*
  ⚠️ **참석자 피커 필터 상수(`ROOM_ATTENDEE_FILTER`·`ROOM_ATTENDEE_FILTER_LABEL`)는 지웠다**
     (2026-08-13 — 2026-08-12에 넣었던 "전체 · 팀장급만"/"전체 · 내 부서만" 토글을 뒤집었다).
     참석자 범위가 개설자의 권한으로 **고정**돼(Owner=팀장만, Leader·Member=자기 팀만) 고를
     것이 남지 않았고, 규칙은 `attendee-scope.ts` 한 곳으로 옮겼다.
     안 쓰는 값을 남겨 두면 나중에 누가 되살린다(§도메인 상수) — 그래서 여기 문장만 남긴다.
*/

/** 회의실 캘린더 툴바(`rooms-calendar-toolbar.tsx`)·회의실 목록(`room-list-panel.tsx`) 카피
 * — 라벨 하드코딩 금지 원칙에 맞춰 뺐다. */
export const ROOMS_CALENDAR_TOOLBAR_LABEL = {
  roomFilter: "회의실 선택",
  addMeeting: "회의 추가",
} as const;

/** 회의실 목록 패널(`room-list-panel.tsx`) 카피 — 위 툴바 상수와 같은 이유로 뺐다. */
export const ROOM_LIST_PANEL_LABEL = {
  title: "회의실 목록",
  /* ⚠️ 명령이 아니라 **설명**이다 — `~하세요`는 §카피(명령은 `~해 주세요`) 밖이고, 이 줄은
     시키는 말이 아니라 이 목록이 무엇인지 알리는 말이다.
     ⚠️ "예약 가능 시간"이 아니라 "위치"다(2026-08-15, BE PR #523 — 운영시간 개념이 없어져
     회의실은 이제 항상 이용 가능하다, 목록에 남는 부가 정보는 위치뿐이다). */
  guidance: "회의실별 위치입니다.",
  countSuffix: "개",
} as const;

/** 회의실 삭제 확인창 문구 — `room-delete-dialog.tsx` 하나만 쓰지만, 카피 하드코딩 금지
 * 원칙(CLAUDE.md §도메인 상수)에 맞춰 컴포넌트 밖으로 뺐다(`NOTICE_DELETE_CONFIRM`과 같은 자리). */
export const ROOM_DELETE_CONFIRM = {
  /** 확인창 제목 — 회의실 이름을 끼워 넣는다 */
  title: (roomName: string) => `'${roomName}'을 삭제할까요?`,
  description: "삭제하면 예약 화면 목록에서도 사라집니다. 되돌릴 수 없습니다.",
  confirmLabel: "삭제",
  pendingLabel: "삭제 중",
} as const;
