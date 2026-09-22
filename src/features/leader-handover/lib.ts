import {
  LEADER_HANDOVER_CUSTODY_STATUS,
  LEADER_HANDOVER_CUSTODY_STATUS_LABEL,
  type LeaderHandoverCustodyStatus,
} from "@/constants/domain";

export const CUSTODY_FILTER_ALL = "all";

export const LEADER_HANDOVER_FILTER_TABS: { value: string; label: string }[] = [
  { value: CUSTODY_FILTER_ALL, label: "전체" },
  {
    value: LEADER_HANDOVER_CUSTODY_STATUS.PENDING,
    label: LEADER_HANDOVER_CUSTODY_STATUS_LABEL.PENDING,
  },
  {
    value: LEADER_HANDOVER_CUSTODY_STATUS.ASSIGNED,
    label: LEADER_HANDOVER_CUSTODY_STATUS_LABEL.ASSIGNED,
  },
];

/** URL의 `?status=` 값을 안전하게 필터로 — 모르는 값이면 기본(전체). */
export function parseCustodyFilter(value: string | undefined): string {
  return LEADER_HANDOVER_FILTER_TABS.some((tab) => tab.value === value)
    ? (value as string)
    : CUSTODY_FILTER_ALL;
}

export function toCustodyStatus(filter: string): LeaderHandoverCustodyStatus | null {
  return filter === CUSTODY_FILTER_ALL ? null : (filter as LeaderHandoverCustodyStatus);
}
