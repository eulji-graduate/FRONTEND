/**
 * 보이는 창 높이의 기준 시간 수 — **그리드 전체 시간대(`grid-slot.ts`)와 독립이다.**
 * ⚠️ 그리드는 00:00~24시간을 다 그리지만(2026-08-14, BE 24시간 운영 협의), 화면에 한 번에
 *    보이는 창은 예전 08:00~18:00 기준(10시간) 높이로 **고정**해 두고, 나머지는 내부 스크롤로
 *    본다(팀 확정) — 여기서 `GRID_END_HOUR - GRID_START_HOUR`를 그대로 쓰면 창 자체가
 *    24시간 치로 늘어나 버려 스크롤이 필요 없어진다.
 */
const VISIBLE_HOURS = 10;
/**
 * 요일 헤더 높이 — `weekly-room-calendar.css`의 `.rbc-time-header-content` 기준.
 * ⚠️ `.rbc-allday-cell`을 숨겨서 헤더는 이제 요일 행 하나뿐이다(예전엔 그 행까지 감안해 더 컸다).
 */
const HEADER_HEIGHT_PX = 32;
/**
 * 30분 칸 높이 — 이벤트 카드가 제목 1줄 + (시간·참석자) 1줄, 총 2줄로 줄어서(2026-08-10)
 * 52px보다 낮아도 내용이 잘리지 않는다.
 */
export const HALF_HOUR_SLOT_HEIGHT_PX = 40;

/**
 * 주간 캘린더 기준 높이(px) — **화면 크기와 무관하게 항상 이 값으로 고정한다**(2026-08-14,
 * 24시간 확장과 함께 팀 확정 — 예전엔 `lg` 미만/이상으로 반응형이었으나, 그리드가 24시간 치로
 * 늘어나면서 "한 화면에 다 들어와야 한다"는 전제 자체가 깨져 내부 스크롤 고정 높이로 바꿨다).
 * 격자는 `.rbc-time-content`가 `overflow-y: auto`로 안에서만 스크롤되고, 이 박스 자체는
 * 늘어나지 않는다.
 */
export const WEEKLY_CALENDAR_HEIGHT_PX =
  HEADER_HEIGHT_PX + VISIBLE_HOURS * 2 * HALF_HOUR_SLOT_HEIGHT_PX;
