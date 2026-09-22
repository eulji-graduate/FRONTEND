import { type PaletteColor, pickPaletteColor } from "@/lib/palette";

/**
 * `RoomReservationEvent`의 기본값 — prop이 비어 오는 순간(예: dev HMR)에도 화면 전체가
 * 죽는 것보다 중립색으로라도 그리는 쪽을 택한다. 프로젝트 태그는 이제 항상 있어서
 * (WORKFLOW.md §3-1) 정상 흐름에서는 이 색이 실제로 쓰일 일이 없다.
 */
export const NEUTRAL_ACCENT_COLOR: PaletteColor = {
  bgColor: "var(--secondary)",
  textColor: "var(--muted-foreground)",
  solidColor: "var(--muted-foreground)",
};

/**
 * 예약 막대 색 — 지금은 프로젝트 태그를 해시해 임의로 고른다(`pickPaletteColor`, 프로젝트
 * 칩과 같은 팔레트).
 * ⚠️ **컴포넌트(`RoomReservationEvent`)는 이 값을 prop으로만 받고 스스로 계산하지 않는다** —
 *    나중에 프로젝트 API가 색 필드를 내려주면 이 함수 안만 그 값을 쓰도록 바꾸면 되고,
 *    화면 쪽은 손댈 곳이 없다(CLAUDE.md §Mock 격리막).
 */
export function getReservationAccentColor(projectTag?: string): PaletteColor {
  return projectTag ? pickPaletteColor(projectTag) : NEUTRAL_ACCENT_COLOR;
}
