import {
  differenceInCalendarWeeks,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ko } from "date-fns/locale";

/** 그 달이 몇 주(행)로 그려지는지 — 5주가 기본, 5일이 남으면 6주가 된다. */
function getWeeksInMonth(date: Date): number {
  const start = startOfWeek(startOfMonth(date), { locale: ko });
  const end = endOfWeek(endOfMonth(date), { locale: ko });
  return differenceInCalendarWeeks(end, start, { locale: ko }) + 1;
}

/** 요일 헤더 높이 — `personal-calendar.css`의 `.rbc-header` padding(8px*2)+글자 한 줄 기준. */
const HEADER_HEIGHT_PX = 37;
/** 5주짜리 달 기준 컨테이너 높이 — 지금까지 쓰던 값을 그대로 "행 5개 기준선"으로 삼는다. */
const BASE_HEIGHT = "calc(100vh - 216px)";
const BASE_WEEKS = 5;

/**
 * 달마다 5주/6주로 행 수가 갈리는데, 컨테이너 높이를 고정해두면 RBC가 행 수만큼 나눠 채우기 때문에
 * 6주짜리 달에서 한 행이 얇아진다(§디자인 일관성 — 달을 넘길 때 셀 높이가 출렁이면 안 된다).
 * 그래서 **한 행의 높이를 5주 기준으로 고정**하고, 6주짜리 달은 컨테이너 전체 높이를 그만큼 늘린다
 * (기존 행은 그대로, 아래로 한 행만 더 생긴다).
 *
 * ⚠️ `calendar-board.tsx`에서 한 번만 계산해 캘린더·오른쪽 상세조회 패널 양쪽에 **같은 값**을
 *    내려준다 — 각자 따로 계산하면 flex 스트레치에 기대는 것보다 어긋나기 쉽다(border-l이
 *    짧게 잘려 보이던 문제의 원인).
 */
export function getCalendarHeight(date: Date): string {
  const weeks = getWeeksInMonth(date);
  const rowHeightExpr = `((${BASE_HEIGHT} - ${HEADER_HEIGHT_PX}px) / ${BASE_WEEKS})`;
  return `calc(${HEADER_HEIGHT_PX}px + ${weeks} * ${rowHeightExpr})`;
}
