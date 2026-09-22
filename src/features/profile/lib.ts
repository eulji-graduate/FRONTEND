import {
  DEFAULT_PROFILE_TAB,
  PROFILE_TAB,
  PROFILE_TAB_LABEL,
  type ProfileTab,
} from "@/constants/profile";

/** 마이페이지 탭 목록 — 값·라벨은 도메인 상수에서 온다(라벨 하드코딩 금지). */
export const PROFILE_TABS: { tab: ProfileTab; label: string }[] = [
  { tab: PROFILE_TAB.INFO, label: PROFILE_TAB_LABEL[PROFILE_TAB.INFO] },
  { tab: PROFILE_TAB.UNCONFIRMED, label: PROFILE_TAB_LABEL[PROFILE_TAB.UNCONFIRMED] },
];

/** URL의 `?tab=` 값을 안전하게 탭으로 — 모르는 값이면 기본(기본 정보). */
export function parseProfileTab(value: string | undefined): ProfileTab {
  return PROFILE_TABS.find((t) => t.tab === value)?.tab ?? DEFAULT_PROFILE_TAB;
}
