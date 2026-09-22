import { addDays, addMinutes, startOfDay } from "date-fns";

/**
 * 주간 그리드가 보여주는 시간대와 칸 크기 — 00:00~24:00, 30분 한 칸(2026-08-14, BE 회의실
 * 24시간 운영 협의로 08:00~18:00에서 확장).
 *
 * ⚠️ **한 곳에서만 정한다.** 예전엔 `weekly-room-calendar.tsx`의 `min`/`max`/`step`과
 *    `calendar-height.ts`의 `START_HOUR`/`END_HOUR`가 8·18을 따로 들고 있었다 — 한쪽만 바꾸면
 *    칸 높이와 칸 시각이 어긋나, 누른 칸과 다른 시각이 예약 모달에 뜬다.
 * ⚠️ 30분은 임의값이 아니다. 회의 예약은 **30분 한 타임 고정**이다(CLAUDE.md §브라우저 API,
 *    팀 확정) — 연속 예약으로 늘리지 않는다.
 */
export const GRID_START_HOUR = 0;
export const GRID_END_HOUR = 24;
export const SLOT_MINUTES = 30;

/** 하루 한 열. `work_week` 뷰라 월~금 다섯 열이 `.rbc-time-content` 바로 밑에 선다. */
const DAY_COLUMN_SELECTOR = ".rbc-day-slot";
/**
 * 열 안의 30분 칸.
 * ⚠️ 왼쪽 시간 눈금(`.rbc-time-gutter`)에도 같은 클래스가 붙는다 — 반드시 **열 안에서만** 찾는다.
 */
const TIME_SLOT_SELECTOR = ".rbc-time-slot";

interface FindSlotStartInput {
  /** 클릭 이벤트의 `target` — 빈 칸이면 칸 자체, 예약 막대 위면 그 막대가 들어온다. */
  target: Element;
  /** 클릭 지점의 세로 좌표(`MouseEvent.clientY`). */
  clientY: number;
  /** 이 주의 월요일 — `work_week` 첫 열이 이 날이다. */
  weekStart: Date;
}

/**
 * 클릭한 **30분 칸의 시작 시각**을 읽는다 — 좌표 계산이 아니라 **DOM 칸**으로 찾는다.
 *
 * ⚠️ **`react-big-calendar`의 `selectable`을 안 쓴다**(2026-08-13, #141). 그쪽 계산
 *    (`Selection.getBoundsForNode`)이 한 상자 안에 **좌표계 둘**을 섞어 담는다 —
 *    `top`·`left`는 `getBoundingClientRect()`(화면 배율이 **적용된 뒤** 값)에서 가져오고
 *    `right`·`bottom`은 `offsetWidth`/`offsetHeight`(배율이 **적용되기 전** 레이아웃 값)를
 *    더해 만든다. `body`에 `transform: scale()`이 걸려 있어서(DECISIONS §화면 배율) 배율
 *    100%에서만 둘이 우연히 같고, 80%면 상자가 실제보다 1.25배 커진 채
 *    `floor((x - left) / 칸너비)`를 돌려 **옆 날짜·옆 시간대**가 골라졌다.
 * ⚠️ **라이브러리를 고치지 않는다**(#141 본문) — 대신 **같은 상자 안에서만 잰다.**
 *    `clientY`도 칸의 `rect`도 둘 다 배율이 적용된 값이라, 포함 여부만 보면 배율이 약분된다.
 *    날짜는 아예 좌표를 안 쓴다 — 누른 자리가 몇 번째 열인지는 DOM이 이미 안다.
 *    (`flow-section.tsx`가 스크롤 좌표에서 쓰는 것과 같은 수법이다: 배율 섞인 두 좌표계를
 *    비교하지 말고, 한 좌표계 안에서 비율·포함으로만 본다.)
 * ⚠️ 칸을 못 찾으면 `null`이다 — 눈금·헤더·칸 사이 여백을 눌렀을 때 아무 데나 열지 않는다.
 */
export function findSlotStart({ target, clientY, weekStart }: FindSlotStartInput): Date | null {
  const column = target.closest(DAY_COLUMN_SELECTOR);
  if (!column) return null;

  const columns = Array.from(
    column.parentElement?.querySelectorAll(`:scope > ${DAY_COLUMN_SELECTOR}`) ?? [],
  );
  const dayIndex = columns.indexOf(column);
  if (dayIndex < 0) return null;

  const slots = Array.from(column.querySelectorAll(TIME_SLOT_SELECTOR));
  const slotIndex = slots.findIndex((slot) => {
    const rect = slot.getBoundingClientRect();
    return clientY >= rect.top && clientY < rect.bottom;
  });
  if (slotIndex < 0) return null;

  return addMinutes(
    addDays(startOfDay(weekStart), dayIndex),
    GRID_START_HOUR * 60 + slotIndex * SLOT_MINUTES,
  );
}
