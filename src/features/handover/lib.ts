import { HANDOVER_TYPE, type HandoverType } from "@/constants/domain";

import type { HandoverActionItem } from "./types";

/** 휴직 신청 — 팀장이면 액션마다 담당자를 지정해 함께 보낸다(자가 재할당). */
export interface SubmitVacationHandoverPayload {
  type: typeof HANDOVER_TYPE.VACATION;
  startDate: string;
  endDate: string;
  actionIds: number[];
  /**
   * 액션 id → 배정받을 팀원 id. 팀장 신청이 아니면 빈 객체.
   * ⚠️ 생성 요청 바디에는 안 실린다 — BE POST 바디에 그런 필드가 없다. 생성 뒤 건별
   *    `PATCH .../items/{actionId}/reassign`으로 따로 보내야 한다(§4, `commitHandoverReassignments`).
   */
  assignments: Record<number, number>;
}

export interface SubmitOffboardingHandoverPayload {
  type: typeof HANDOVER_TYPE.OFFBOARDING;
  description: string;
  actionIds: number[];
  /** 마지막 근무일 `YYYY-MM-DD` — BE 필수(없으면 `HO-011`, BE 인수인계 문서 §2·§5). */
  lastWorkingDay: string;
}

export type SubmitHandoverPayload =
  SubmitVacationHandoverPayload | SubmitOffboardingHandoverPayload;

/**
 * FE 내부 payload → BE 생성 요청 바디. 경계에서만 이름을 바꾼다 — FE 내부 필드명(위 두 타입)은
 * 그대로 두고 fetch 직전에만 변환해 BE 계약을 흡수한다(BE 인수인계 문서, 2026-08-10).
 * `type`→`handoverType`, `startDate`/`endDate`→`leaveStartAt`/`leaveEndAt`(자정 시각 붙임),
 * `description`→`note`, `actionIds`→`selectedActionIds`.
 * ⚠️ `assignments`(팀장 본인 휴직의 자가 재배정)는 **생성 바디에 안 실린다** — BE POST 바디엔
 *    그런 필드가 없다. 생성 뒤 건별 `PATCH .../items/{actionId}/reassign`으로 따로 보내야
 *    한다(§4 재배정 오케스트레이션, 아직 미구현 — 별도 작업).
 */
/**
 * 신청 화면 달력의 최소 선택값 — 내일 이후만 허용한다(#637).
 * 휴직 시작 · 오프보딩 마지막 근무일 두 곳에서 쓴다. 종료일은 별도로 시작일 이후만
 * 허용해 상한이 자연히 이어지게 한다(WORKFLOW §7).
 */
export function handoverDateMin(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

export function toHandoverCreateRequestBody(payload: SubmitHandoverPayload) {
  if (payload.type === HANDOVER_TYPE.VACATION) {
    return {
      handoverType: payload.type,
      leaveStartAt: `${payload.startDate}T00:00:00`,
      leaveEndAt: `${payload.endDate}T00:00:00`,
      selectedActionIds: payload.actionIds,
    };
  }
  return {
    handoverType: payload.type,
    lastWorkingDay: payload.lastWorkingDay,
    note: payload.description,
    selectedActionIds: payload.actionIds,
  };
}

export const HANDOVER_TYPE_TABS: { type: HandoverType; label: string }[] = [
  HANDOVER_TYPE.VACATION,
  HANDOVER_TYPE.OFFBOARDING,
].map((type) => ({
  type,
  label: type === HANDOVER_TYPE.VACATION ? "휴직" : "오프보딩",
}));

export const DEFAULT_HANDOVER_TYPE: HandoverType = HANDOVER_TYPE.VACATION;

export function parseHandoverType(value: string | undefined): HandoverType {
  return HANDOVER_TYPE_TABS.find((t) => t.type === value)?.type ?? DEFAULT_HANDOVER_TYPE;
}

/** 마감일이 휴직 기간(양끝 포함) 안에 드는지 — `YYYY-MM-DD` 문자열 비교로 충분하다. */
export function isDueWithinRange(dueDate: string, startDate: string, endDate: string): boolean {
  if (!startDate || !endDate) return false;
  return dueDate >= startDate && dueDate <= endDate;
}

/**
 * 절충안(사용자 확정, 2026-08-08): 기간 밖 액션도 **숨기지 않는다** — 목록은 항상 전체를
 * 보여주고, 기간과 겹치는 것만 위로 정렬 + 배지로 표시한다. 필터로 감추면 "마감일은
 * 아니어도 자리를 비우면 인계가 필요한" 액션을 사용자가 잊어버릴 수 있다(§정직성).
 * ⚠️ **기본 체크는 안 한다**(2026-08-08 정정) — 인계할 생각이 없던 액션까지 체크돼
 *    있으면 오히려 하나씩 해제해야 해서 번거롭다. 정렬·배지까지만 돕고 선택은 전부
 *    사용자 몫으로 둔다.
 */
export function sortActionsForVacation(
  actions: HandoverActionItem[],
  startDate: string,
  endDate: string,
): { sorted: HandoverActionItem[]; inRangeIds: Set<number> } {
  const inRangeIds = new Set(
    actions
      .filter((action) => isDueWithinRange(action.dueDate, startDate, endDate))
      .map((a) => a.id),
  );
  const sorted = [...actions].sort((a, b) => {
    const aIn = inRangeIds.has(a.id) ? 0 : 1;
    const bIn = inRangeIds.has(b.id) ? 0 : 1;
    return aIn - bIn;
  });
  return { sorted, inRangeIds };
}
