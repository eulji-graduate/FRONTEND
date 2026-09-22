import {
  formatDate,
  formatDateWithYear,
  formatElapsed,
  formatFullDate,
  formatMonthDayWeekday,
  formatYearMonthDay,
  isReadableDate,
} from "./date";

/**
 * ⚠️ `todayIso()`는 테스트하지 않는다 — 실제 시계를 읽는 함수라 시각을 고정하지 않으면
 *    검증이 그날그날 달라진다. 계산은 전부 `formatElapsed`가 하고, 그건 기준 날짜를
 *    인자로 받으므로 여기서 온전히 검증된다.
 */
describe("formatElapsed", () => {
  const TODAY = "2026-08-05";

  it("같은 날은 오늘, 하루 전은 어제다", () => {
    expect(formatElapsed("2026-08-05", TODAY)).toBe("오늘");
    expect(formatElapsed("2026-08-04", TODAY)).toBe("어제");
  });

  it("한 주 안쪽은 일 단위로 센다", () => {
    expect(formatElapsed("2026-08-03", TODAY)).toBe("2일 전");
    expect(formatElapsed("2026-07-30", TODAY)).toBe("6일 전");
  });

  it("한 달 안쪽은 주 단위로 센다 — 4주까지만 쓴다", () => {
    expect(formatElapsed("2026-07-29", TODAY)).toBe("1주 전");
    expect(formatElapsed("2026-07-08", TODAY)).toBe("4주 전");
  });

  it("한 달을 넘기면 달 단위로 센다", () => {
    expect(formatElapsed("2026-07-06", TODAY)).toBe("1개월 전");
    expect(formatElapsed("2026-03-27", TODAY)).toBe("4개월 전");
  });

  it("11개월과 1년이 겹치지 않는다 — 일수/30으로 세면 364일이 12개월이 된다", () => {
    expect(formatElapsed("2025-08-06", TODAY)).toBe("11개월 전");
    expect(formatElapsed("2025-08-05", TODAY)).toBe("1년 전");
  });

  it("해를 넘기면 연 단위로 센다", () => {
    expect(formatElapsed("2025-11-14", TODAY)).toBe("8개월 전");
    expect(formatElapsed("2024-02-06", TODAY)).toBe("2년 전");
  });

  it("미래 날짜는 지어내지 않고 null이다 — 부르는 쪽이 절대 날짜로 물러선다", () => {
    expect(formatElapsed("2026-08-06", TODAY)).toBeNull();
  });

  it("형식이 아니면 null이다", () => {
    expect(formatElapsed("", TODAY)).toBeNull();
    expect(formatElapsed("어제", TODAY)).toBeNull();
  });
});

const THIS_YEAR = 2026;

describe("formatDateWithYear", () => {
  // 기준 연도는 서버가 정해 내려준다 — 함수가 `new Date()`를 부르지 않는다(하이드레이션)
  it("ISO를 우리 날짜 표기로 바꾼다 — 2026-05-03 → 5월 3일(일)", () => {
    expect(formatDateWithYear("2026-05-03", THIS_YEAR)).toBe("5월 3일(일)");
  });

  it("요일이 시간대에 밀리지 않는다 — 자정 UTC 파싱 함정", () => {
    // 2026-01-12는 월요일이다. new Date(iso)로 읽으면 지역 시간대에서 하루 밀릴 수 있다
    expect(formatDateWithYear("2026-01-12", THIS_YEAR)).toBe("1월 12일(월)");
  });

  it("올해가 아니면 연도를 붙인다 — 얼마나 오래됐는지 알 수 있어야 한다", () => {
    expect(formatDateWithYear("2025-12-03", THIS_YEAR)).toBe("2025년 12월 3일(수)");
    expect(formatDateWithYear("2024-02-06", THIS_YEAR)).toBe("2024년 2월 6일(화)");
  });

  it("올해 날짜에는 연도를 안 붙인다 — 매 줄에 붙으면 옛 날짜가 안 튄다", () => {
    expect(formatDateWithYear("2026-02-06", THIS_YEAR)).not.toContain("년");
  });

  it("형식이 아니면 원문을 그대로 둔다 — 지어내지 않는다", () => {
    expect(formatDateWithYear("", THIS_YEAR)).toBe("");
    expect(formatDateWithYear("어제", THIS_YEAR)).toBe("어제");
  });
});

/**
 * ⚠️ **ISO를 화면에 그대로 찍지 않는다.** 구독 해지 창이 `2026-09-01`을 그대로 보여 줘서
 *    읽는 사람이 날짜를 한 번 더 해석해야 했다 — 그 회귀를 막는다.
 */
describe("formatDate", () => {
  it("우리 표기로 바꾼다 — 2026-09-01 → 9월 1일(화)", () => {
    expect(formatDate("2026-09-01")).toBe("9월 1일(화)");
  });

  /* ⚠️ `new Date(iso)`로 파싱하면 UTC 자정이라 시간대에 따라 하루가 밀린다 */
  it("요일이 시간대에 안 밀린다", () => {
    expect(formatDate("2026-05-03")).toBe("5월 3일(일)");
    expect(formatDate("2026-01-12")).toBe("1월 12일(월)");
  });

  it("연도를 붙이지 않는다 — 붙이려면 `formatDateWithYear`를 쓴다", () => {
    expect(formatDate("2024-02-06")).not.toContain("년");
  });

  it("형식이 아니면 원문을 그대로 둔다 — 지어내지 않는다", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate("내일")).toBe("내일");
  });

  /* ⚠️ 없는 날짜도 원문으로 물러선다 — 판정은 `formatMonthDayWeekday` 한 곳이 한다 */
  it("형식은 맞지만 없는 날짜도 원문을 그대로 둔다", () => {
    expect(formatDate("2026-02-30")).toBe("2026-02-30");
  });
});

/**
 * ⚠️ 결제 주기·다음 결제일처럼 **해를 넘길 수 있는 값**에 쓴다. 연도가 없으면
 *    `12월 1일 ~ 1월 1일`이 어느 해인지 알 수 없어 과거로 읽힌다.
 */
describe("formatFullDate", () => {
  it("연도를 항상 붙인다 — 올해여도 붙인다", () => {
    expect(formatFullDate("2026-09-01")).toBe("2026년 9월 1일(화)");
  });

  it("해를 넘기는 주기에서 어느 해인지 드러난다", () => {
    expect(formatFullDate("2026-12-01")).toBe("2026년 12월 1일(화)");
    expect(formatFullDate("2027-01-01")).toBe("2027년 1월 1일(금)");
  });

  it("형식이 아니면 원문을 그대로 둔다", () => {
    expect(formatFullDate("")).toBe("");
    expect(formatFullDate("2026-02-30")).toBe("2026-02-30");
  });
});

/**
 * ⚠️ **없는 날짜를 두 함수가 다르게 판정하면 한 줄이 두 말을 한다.**
 *    전에는 검증이 `formatMonthDayWeekday`에만 있어서 `formatElapsed`가 그 문을 안 거쳤다 —
 *    저장소 표의 같은 셀이 본문엔 지어낸 `5개월 전`, 툴팁엔 원문 `2026-02-30`을 보여줬다.
 *    이제 `parseIsoDate` 한 곳이 막으므로 **전부 같이 물러선다.**
 */
describe("없는 날짜 — 날짜 함수 전부가 같은 판정을 쓴다", () => {
  const IMPOSSIBLE = ["2026-02-30", "2026-06-31", "2026-13-01", "2026-01-00", "2026-02-29"];

  it.each(IMPOSSIBLE)("%s은 상대 표기를 지어내지 않는다", (iso) => {
    expect(formatElapsed(iso, "2026-08-05")).toBeNull();
  });

  it.each(IMPOSSIBLE)("%s은 표기 함수도 전부 물러선다", (iso) => {
    expect(formatMonthDayWeekday(iso)).toBeNull();
    expect(formatDate(iso)).toBe(iso);
    expect(formatDateWithYear(iso, THIS_YEAR)).toBe(iso);
    expect(formatFullDate(iso)).toBe(iso);
  });

  it("읽을 수 있는 날짜와 없는 날짜를 가려 준다", () => {
    expect(isReadableDate("2026-02-28")).toBe(true);
    expect(isReadableDate("2024-02-29")).toBe(true); // 윤년은 실재한다
    expect(isReadableDate("2026-02-29")).toBe(false);
    expect(isReadableDate("내일")).toBe(false);
  });
});

describe("formatMonthDayWeekday", () => {
  it("월·일·요일을 조립한다 — 2026-09-05는 토요일", () => {
    expect(formatMonthDayWeekday("2026-09-05")).toBe("9월 5일(토)");
    expect(formatMonthDayWeekday("2026-08-05")).toBe("8월 5일(수)");
  });

  it("앞자리 0을 붙이지 않는다", () => {
    expect(formatMonthDayWeekday("2026-01-03")).toBe("1월 3일(토)");
  });

  it("형식이 아니면 null이다", () => {
    expect(formatMonthDayWeekday("2026/09/05")).toBeNull();
    expect(formatMonthDayWeekday("")).toBeNull();
  });

  it("형식은 맞지만 실재하지 않는 날짜는 null이다", () => {
    expect(formatMonthDayWeekday("2026-02-30")).toBeNull();
    expect(formatMonthDayWeekday("2026-02-29")).toBeNull(); // 2026은 평년
  });
});

describe("formatYearMonthDay", () => {
  it("요일을 빼고 연·월·일만 준다 — 표 칸에서 줄이 깨지지 않게", () => {
    expect(formatYearMonthDay("2020-01-02")).toBe("2020년 1월 2일");
    expect(formatYearMonthDay("2024-06-01")).toBe("2024년 6월 1일");
  });

  it("형식이 아니면 원문을 그대로 둔다", () => {
    expect(formatYearMonthDay("2026-02-30")).toBe("2026-02-30");
  });
});
