import {
  DASHBOARD_BOX_HEADER_HEIGHT,
  MEETING_ITEM_HEIGHT,
} from "@/components/common/dashboard-meeting-item";

/*
 * 대시보드 두 카드의 높이 기준. `page.tsx`와 `loading.tsx`가 같은 골격을 그려야 해서
 * 여기 한 곳에 둔다.
 */

/**
 * 팀원 현황이 넘어가면 안 되는 높이 — 인원이 가변이라 위로만 한도를 둔다.
 * ⚠️ **고정 높이가 아니다**(2026-08-10). 고정이면 팀원이 둘일 때 카드 바닥이 통째로 빈다 —
 *    내용만큼 자라고, 넘칠 때만 카드 안에서 스크롤한다.
 */
export const MEMBER_BOX_MAX_HEIGHT = 320;

/** 표 머리 줄(`h-9`)과 본문 한 행(`h-14`) 높이 — 뼈대 계산용(`owner/lib.ts`와 같은 값). */
const TABLE_HEAD_HEIGHT = 36;
const MEMBER_ROW_HEIGHT = 56;

/**
 * 로딩 뼈대 높이 — **상한(`MEMBER_BOX_MAX_HEIGHT`)을 그대로 쓰면 안 된다.**
 * 카드는 이제 내용만큼 자라는데 뼈대만 320으로 서면, 팀원이 적을 때 로딩이 끝나는 순간
 * 카드가 확 줄고 아래 회의 카드까지 딸려 올라간다(화면이 튄다).
 * ⚠️ 팀원 수는 서버가 알려 주기 전엔 모르므로 **네 명**을 어림값으로 쓴다.
 */
export const MEMBER_BOX_SKELETON_HEIGHT =
  DASHBOARD_BOX_HEADER_HEIGHT + TABLE_HEAD_HEIGHT + 4 * MEMBER_ROW_HEIGHT;

/** 회의 위젯 최대 노출 수. 서버가 이만큼 자르고, 박스도 이 수에 맞춰 높이를 잡아 스크롤이 안 생긴다. */
export const MEETING_MAX_ITEMS = 5;

/*
 * ⚠️ **회의 카드 높이를 고정하지 않는다**(2026-08-10). 머리 줄을 45px로 잡아 뒀는데 실제는
 *    65px이라 마지막 줄이 잘려 나갔다 — 카드는 내용만큼 자란다. 아래 값은 **로딩 뼈대 전용**이다
 *    (`owner/lib.ts`와 같은 정리).
 */
export const MEETING_BOX_SKELETON_HEIGHT =
  DASHBOARD_BOX_HEADER_HEIGHT + MEETING_MAX_ITEMS * MEETING_ITEM_HEIGHT;
