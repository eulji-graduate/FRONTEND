import type { StatusTone } from "@/components/common/status-dot";

/**
 * 처리할 액션 타임라인의 순수 계산 계층 — React 무관이라 그대로 테스트한다.
 * 나중에 프로젝트/팀 액션 상세의 로드맵으로 추출할 때 이 파일이 재사용 씨앗이다.
 */

/** 하루 칸의 폭(px) — 축·바 위치를 전부 이 값의 배수로 계산한다(퍼센트 아님, 2026-08-06 정정). */
export const TIMELINE_DAY_WIDTH_PX = 40;

/**
 * 축에 최소 이만큼의 날짜 칸은 채운다 — 기간이 짧은 액션만 있으면 박스 오른쪽이 빈 채로
 * 남아 보기 나쁘다(2026-08-06 정정). 실제 기간이 이보다 길면 그 값을 그대로 쓴다(줄이지 않는다).
 * 뒤쪽(마감 이후)에만 칸을 더 붙인다 — 시작·오늘·마감의 상대 위치는 그대로 둔다.
 */
export const TIMELINE_MIN_VISIBLE_DAYS = 30;

/** 타임라인 한 줄의 입력 계약 — 멤버 액션 등 특정 도메인 타입에 묶이지 않는 범용 입력이다. */
export interface TimelineActionInput {
  id: string;
  /**
   * 칩에 보이는 텍스트 — 호출부마다 의미가 다르다(사원 대시보드=프로젝트 태그,
   * 프로젝트 상세=팀명 등). 이 계층은 "칩 문구"로만 알고 뜻을 모른다.
   */
  tag: string;
  title: string;
  /** 칩 배경·글자색 — 고정 팔레트(`lib/palette` → `pickPaletteColor`)에서 뽑은 값. 자유 HEX 아님. */
  tagBgColor: string;
  tagTextColor: string;
  /** 작업 시작일 `YYYY-MM-DD` — 바의 왼쪽 끝 */
  startDate: string;
  /** 마감일 `YYYY-MM-DD` — 바의 오른쪽 끝(마감 지점) */
  dueDate: string;
  /** 상태 색(지연=파생값 포함). `StatusDot`과 같은 셋을 쓴다. */
  tone: StatusTone;
  /** 클릭 시 이동할 상세 경로. 상세 라우트가 아직 없으면 비워서 클릭 불가로 둔다. */
  href?: string;
  /**
   * 하위 액션 진척(`3/5`) — **`null`·필드 없음과 `0/0`은 뜻이 다르다**(BE #355, #421).
   * `null`(또는 아예 안 넘김) = 하위라는 개념 자체가 없는 줄(개인 액션·인수인계 등),
   * `0/0` = 하위를 가질 수 있는데 아직 비어 있음.
   * ⚠️ 이 계층은 **값을 나르기만 한다** — 그릴지 말지는 컴포넌트(`hasChildProgress`)가 정한다.
   */
  childDoneCount?: number | null;
  childTotalCount?: number | null;
}

/** 축의 하루 칸. */
export interface TimelineDay {
  iso: string;
  dayOfMonth: number;
  /** 일~토 */
  weekday: string;
  isToday: boolean;
  isSaturday: boolean;
  isSunday: boolean;
}

/** 한 액션의 기간 바 — 왼쪽 끝·폭을 px로 놓는다(하루=`TIMELINE_DAY_WIDTH_PX`). */
export interface TimelineBar extends TimelineActionInput {
  leftPx: number;
  widthPx: number;
  /** `D-day`·`D-n`·`D+n` */
  ddayLabel: string;
  /** 스크린리더용 기간 텍스트(예: `8월 1일~8월 3일`) */
  periodLabel: string;
}

export interface ActionTimelineModel {
  days: TimelineDay[];
  bars: TimelineBar[];
  /** 오늘선 위치(px) — 오늘을 축 범위에 항상 포함하므로 값이 있다. */
  todayLeftPx: number;
  /** 날짜 칸 전체 폭(px) — `days.length * TIMELINE_DAY_WIDTH_PX`. 헤더·그리드·바가 같이 쓴다. */
  totalWidthPx: number;
  /** 축 머리 라벨(예: `8월`) */
  monthLabel: string;
}

const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"] as const;
const MS_PER_DAY = 86_400_000;

/** 날짜 전용 값을 로컬 자정으로 파싱 — `lib.getDaysUntilDue`와 같은 규칙(UTC 자정 밀림 방지). */
function parseLocalDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function diffDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toLocalIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 오늘(로컬 자정) 대비 D-day 라벨 — 전달받은 `today`로 계산해 순수하게 유지한다. */
function formatDdayFrom(due: Date, todayMid: Date): string {
  const days = diffDays(todayMid, due);
  if (days === 0) return "D-day";
  return days > 0 ? `D-${days}` : `D+${-days}`;
}

function formatPeriod(start: Date, due: Date): string {
  const s = `${start.getMonth() + 1}월 ${start.getDate()}일`;
  const e = `${due.getMonth() + 1}월 ${due.getDate()}일`;
  return s === e ? s : `${s}~${e}`;
}

/** 축 머리 라벨 — 범위가 달을 넘으면 `7~8월`, 아니면 `8월`. */
function formatMonthLabel(rangeStart: Date, rangeEnd: Date): string {
  const startMonth = rangeStart.getMonth() + 1;
  const endMonth = rangeEnd.getMonth() + 1;
  return startMonth === endMonth ? `${startMonth}월` : `${startMonth}~${endMonth}월`;
}

/**
 * 액션들을 오늘 기준 기간 타임라인 모델로 만든다. 비면 `null`.
 * 축 범위 = `min(시작일, 오늘) ~ max(마감일, 오늘)` — 오늘선이 항상 보이도록 오늘을 포함한다.
 * ⚠️ 위치는 **퍼센트가 아니라 px 고정폭**이다(하루 = `TIMELINE_DAY_WIDTH_PX`) — 기간이 길어도
 *    칸이 안 눌리고, 화면보다 넓어지면 컴포넌트가 가로 스크롤로 보여준다(2026-08-06 정정).
 */
export function buildActionTimeline(
  items: TimelineActionInput[],
  today: Date,
): ActionTimelineModel | null {
  if (items.length === 0) return null;

  const todayMid = startOfDay(today);
  const startTimes = items.map((it) => parseLocalDate(it.startDate).getTime());
  const dueTimes = items.map((it) => parseLocalDate(it.dueDate).getTime());

  const rangeStart = new Date(Math.min(todayMid.getTime(), ...startTimes));
  const rangeEndRaw = new Date(Math.max(todayMid.getTime(), ...dueTimes));
  const totalDaysRaw = diffDays(rangeStart, rangeEndRaw) + 1;
  const totalDays = Math.max(totalDaysRaw, TIMELINE_MIN_VISIBLE_DAYS);
  const rangeEnd = addDays(rangeStart, totalDays - 1);

  const days: TimelineDay[] = Array.from({ length: totalDays }, (_, i) => {
    const date = addDays(rangeStart, i);
    const weekdayIndex = date.getDay();
    return {
      iso: toLocalIso(date),
      dayOfMonth: date.getDate(),
      weekday: WEEKDAY_LABEL[weekdayIndex] ?? "",
      isToday: diffDays(date, todayMid) === 0,
      isSaturday: weekdayIndex === 6,
      isSunday: weekdayIndex === 0,
    };
  });

  const bars: TimelineBar[] = items.map((it) => {
    const start = parseLocalDate(it.startDate);
    const due = parseLocalDate(it.dueDate);
    const startIndex = diffDays(rangeStart, start);
    const endIndex = diffDays(rangeStart, due);
    return {
      ...it,
      leftPx: startIndex * TIMELINE_DAY_WIDTH_PX,
      widthPx: (endIndex - startIndex + 1) * TIMELINE_DAY_WIDTH_PX,
      ddayLabel: formatDdayFrom(due, todayMid),
      periodLabel: formatPeriod(start, due),
    };
  });

  return {
    days,
    bars,
    // 오늘 칸의 왼쪽 끝이 아니라 **칸 중앙**(+0.5)에 선을 놓는다.
    todayLeftPx: (diffDays(rangeStart, todayMid) + 0.5) * TIMELINE_DAY_WIDTH_PX,
    totalWidthPx: totalDays * TIMELINE_DAY_WIDTH_PX,
    monthLabel: formatMonthLabel(rangeStart, rangeEnd),
  };
}
