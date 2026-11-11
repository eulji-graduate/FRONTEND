import { addDaysIso, daysBetween, todayIso } from "@/lib/date";

/**
 * 목 데이터의 고정 날짜를 **"원래 기준일을 오늘로 옮기는"** 방식으로 오늘에 맞춘다.
 *
 * ⚠️ 목 파일마다 작성자가 정한 기준일(`2026-08-05` 등)이 있고, 상태 규칙("진행중은 시작이 오늘 이전",
 *    "할 일은 시작이 오늘 이후", 연체 D+2)이 그 기준일에 맞춰 짜여 있다. 기준일과 오늘의 차이만큼
 *    **모든 날짜를 같은 일수로 옮기면** 값끼리의 간격이 그대로라 그 관계가 깨지지 않는다.
 *    하드코딩한 날짜를 `addDaysIso(today, N)`으로 하나씩 다시 계산하면 의도가 바뀔 위험이 크다.
 * ⚠️ 날짜 부분만 옮긴다 — 시각·`+09:00`·`Z`는 그대로 둔다(`2026-07-14T10:31:00.000Z` →
 *    `2026-10-19T10:31:00.000Z`). 같은 일수를 옮기므로 순간의 선후 관계도 그대로다.
 * ⚠️ **오늘은 모듈이 로드될 때 한 번** 정해진다. 서버를 며칠 켜 두면 그 시작일 기준으로 굳는다
 *    (`member/mock/managed.ts`와 같은 한계).
 * ⚠️ 읽을 수 없는 값은 **던진다**. 목 데이터의 오타를 조용히 넘기면 화면에서 `Invalid Date`로 터지는데,
 *    그때는 어느 파일의 어느 줄인지 찾을 수 없다.
 */

/** 2026-01-05는 월요일이다 — 요일을 날짜 계산만으로 구하는 기준점(`Date` 파싱의 시간대 문제를 피한다) */
const KNOWN_MONDAY = "2026-01-05";

/** 날짜(`YYYY-MM-DD`)와 그 뒤에 붙은 시각·오프셋을 가른다 */
const DATE_HEAD = /^(\d{4}-\d{2}-\d{2})([\s\S]*)$/;

export interface MockClock {
  /** 기준일에서 오늘까지의 일수 — 모든 값이 이만큼 옮겨진다 */
  offsetDays: number;
  /** 날짜(`YYYY-MM-DD`)나 일시(`YYYY-MM-DDTHH:mm...`) 문자열의 날짜 부분을 옮긴다 */
  at: (value: string) => string;
  /** `at`으로 옮긴 값을 `Date`로 돌려준다 */
  date: (value: string) => Date;
}

export interface MockClockOptions {
  /**
   * 같은 요일로 옮긴다 — 기준일이 속한 주(월~일)를 **오늘이 속한 주**로 옮긴다.
   * 회의실 주간 달력처럼 요일 구조(월~금)가 의미인 목에만 쓴다. 오늘과의 간격은 최대 6일 어긋난다.
   */
  alignWeek?: boolean;
  /** 테스트용 — 생략하면 오늘(`todayIso()`) */
  today?: string;
}

/** `iso`가 속한 주의 월요일 */
function mondayOf(iso: string): string {
  const diff = daysBetween(KNOWN_MONDAY, iso);
  if (diff === null) throw new Error(`요일을 구할 수 없는 날짜입니다: ${iso}`);
  const sinceMonday = ((diff % 7) + 7) % 7;
  return addDaysIso(iso, -sinceMonday);
}

function shift(value: string, days: number): string {
  const match = DATE_HEAD.exec(value);
  const head = match?.[1];
  // 형식은 맞아도 없는 날(2026-02-30)이면 addDaysIso가 원문을 돌려준다 — 그걸 못 알아채면 안 된다.
  if (!match || head === undefined || daysBetween(head, head) === null) {
    throw new Error(`날짜로 읽을 수 없는 목 값입니다: ${value}`);
  }
  return addDaysIso(head, days) + (match[2] ?? "");
}

/**
 * @param anchor 이 목 파일이 "오늘"로 삼고 만든 날짜(`YYYY-MM-DD`)
 */
export function createMockClock(anchor: string, options: MockClockOptions = {}): MockClock {
  const today = options.today ?? todayIso();
  const offsetDays = options.alignWeek
    ? daysBetween(mondayOf(anchor), mondayOf(today))
    : daysBetween(anchor, today);

  if (offsetDays === null) {
    throw new Error(`목 기준일을 읽을 수 없습니다: 기준일 ${anchor}, 오늘 ${today}`);
  }

  return {
    offsetDays,
    at: (value) => shift(value, offsetDays),
    date: (value) => new Date(shift(value, offsetDays)),
  };
}
