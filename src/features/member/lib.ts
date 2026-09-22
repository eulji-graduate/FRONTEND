import {
  DASHBOARD_BOX_HEADER_HEIGHT,
  MEETING_ITEM_HEIGHT,
} from "@/components/common/dashboard-meeting-item";
import { ACTION_STATUS, type ActionStatus } from "@/constants/domain";

/**
 * 처리할 액션(타임라인) 박스 최소 높이(px). 뷰포트를 채우도록 flex로 늘어나되, 짧은 화면에서도 이 높이는 보장한다.
 * 회의 박스는 아래에 고정으로 붙고, 이 박스가 남는 세로 공간을 채운 뒤 내부 스크롤한다.
 */
export const DUE_SOON_BOX_MIN_HEIGHT = 280;

/** 참석 회의 최대 노출 수 */
export const MEETING_MAX_ITEMS = 5;

/*
 * ⚠️ **회의 카드 높이를 고정하지 않는다**(2026-08-10). 머리 줄을 45px로 잡아 뒀는데 실제는
 *    65px이라 마지막 줄이 잘려 나갔다 — 카드는 내용만큼 자란다. 아래 값은 **로딩 뼈대 전용**이다
 *    (`owner/lib.ts`와 같은 정리).
 */
export const MEETING_BOX_SKELETON_HEIGHT =
  DASHBOARD_BOX_HEADER_HEIGHT + MEETING_MAX_ITEMS * MEETING_ITEM_HEIGHT;

/**
 * 마감까지 남은 일수 — 파생값이라 저장하지 않고 계산한다(CLAUDE.md §도메인 상수).
 * ⚠️ 날짜 전용 값을 UTC가 아니라 로컬 자정으로 파싱하려고 `T00:00:00`을 붙인다.
 */
export function getDaysUntilDue(dateIso: string): number {
  const due = new Date(`${dateIso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

/**
 * 처리할 액션 대상 여부 — **미완료이면서 마감이 7일 이내(연체 포함)**.
 * 연체(음수)도 가장 급하므로 포함한다.
 */
export function isDueSoon(action: { status: ActionStatus; dueDate: string }): boolean {
  return action.status !== ACTION_STATUS.DONE && getDaysUntilDue(action.dueDate) <= 7;
}
