import {
  DASHBOARD_BOX_HEADER_HEIGHT,
  MEETING_ITEM_HEIGHT,
} from "@/components/common/dashboard-meeting-item";

/*
 * 대시보드 두 카드의 높이 기준.
 *
 * ⚠️ **카드 높이를 고정하지 않는다**(2026-08-10 변경). 두 카드가 `height`로 못박혀 있었는데
 *    그 값이 내용과 안 맞아서, 팀장 현황은 마지막 행 아래가 **90px 비고** 회의 카드는
 *    마지막 줄이 **21px 잘렸다**(머리 줄을 45px로 잡았는데 실제는 65px이었다).
 *    카드는 내용만큼 자라는 게 맞다 — 고정 높이는 내용이 바뀔 때마다 둘 중 하나가 된다.
 * ⚠️ 다만 **인원이 가변인 것**(팀장 현황)은 위로 한도를 둔다. 팀이 늘어도 카드 하나가
 *    화면을 다 먹지 않게, 넘치면 카드 안에서 스크롤한다.
 * ⚠️ 아래 뼈대 값들은 **로딩 전용**이다 — 본문과 같은 높이로 서야 로딩이 끝날 때 화면이
 *    안 튄다(DESIGN §4).
 */

/** 회의 위젯 최대 노출 수. 서버가 이만큼 자른다(`server.ts`). */
export const MEETING_MAX_ITEMS = 5;

/** 표 머리 줄(`h-9`)과 본문 한 행(`h-14`) 높이 — 뼈대 계산용. */
const TABLE_HEAD_HEIGHT = 36;
const LEADER_ROW_HEIGHT = 56;

/** 팀장 현황이 넘어가면 안 되는 높이 — 여섯 팀까지는 그대로 보이고, 그 위로는 안에서 스크롤한다. */
export const LEADER_BOX_MAX_HEIGHT =
  DASHBOARD_BOX_HEADER_HEIGHT + TABLE_HEAD_HEIGHT + 6 * LEADER_ROW_HEIGHT;

/** 로딩 뼈대 — 팀 수는 서버가 알려 주기 전엔 모르므로 지금 팀 수(4)를 기준으로 그린다. */
export const LEADER_BOX_SKELETON_HEIGHT =
  DASHBOARD_BOX_HEADER_HEIGHT + TABLE_HEAD_HEIGHT + 4 * LEADER_ROW_HEIGHT;

/** 로딩 뼈대 — 회의는 최대 수가 하드 캡이라 꽉 찬 높이로 그린다. */
export const MEETING_BOX_SKELETON_HEIGHT =
  DASHBOARD_BOX_HEADER_HEIGHT + MEETING_MAX_ITEMS * MEETING_ITEM_HEIGHT;
