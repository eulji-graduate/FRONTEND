import { daysBetween } from "@/lib/date";

import { createMockClock } from "./rebase-date";

describe("createMockClock — 기준일을 오늘로 옮긴다", () => {
  it("기준일은 오늘이 되고 나머지 날짜는 같은 간격만큼 옮겨진다", () => {
    const clock = createMockClock("2026-08-05", { today: "2026-11-10" });

    expect(clock.offsetDays).toBe(97);
    expect(clock.at("2026-08-05")).toBe("2026-11-10");
    expect(clock.at("2026-08-03")).toBe("2026-11-08"); // 기준일보다 2일 앞 = 오늘보다 2일 앞
    expect(clock.at("2026-08-11")).toBe("2026-11-16");
  });

  it("값끼리의 간격(마감 관계)이 옮긴 뒤에도 같다", () => {
    const clock = createMockClock("2026-08-11", { today: "2027-01-02" });
    const pairs: [string, string][] = [
      ["2026-07-21", "2026-08-29"],
      ["2026-08-14", "2026-09-12"],
      ["2026-06-01", "2026-07-10"],
    ];

    for (const [from, to] of pairs) {
      expect(daysBetween(clock.at(from), clock.at(to))).toBe(daysBetween(from, to));
    }
  });

  it("시각·UTC 표기·오프셋은 그대로 두고 날짜 부분만 옮긴다", () => {
    const clock = createMockClock("2026-08-05", { today: "2026-11-10" });

    expect(clock.at("2026-08-05T10:00")).toBe("2026-11-10T10:00");
    expect(clock.at("2026-07-14T10:00:00+09:00")).toBe("2026-10-19T10:00:00+09:00");
    expect(clock.at("2026-07-14T10:31:00.000Z")).toBe("2026-10-19T10:31:00.000Z");
  });

  it("date()는 옮긴 값을 Date로 돌려준다", () => {
    const clock = createMockClock("2026-08-05", { today: "2026-11-10" });
    const date = clock.date("2026-08-05T14:30:00");

    expect([date.getFullYear(), date.getMonth() + 1, date.getDate()]).toEqual([2026, 11, 10]);
    expect([date.getHours(), date.getMinutes()]).toEqual([14, 30]);
  });

  it("기준일이 오늘이면 아무것도 옮기지 않는다", () => {
    const clock = createMockClock("2026-08-05", { today: "2026-08-05" });

    expect(clock.offsetDays).toBe(0);
    expect(clock.at("2026-08-05T10:00:00")).toBe("2026-08-05T10:00:00");
  });

  it("기준일보다 이른 오늘이어도 옮긴다(음수 일수)", () => {
    const clock = createMockClock("2026-08-05", { today: "2026-08-01" });

    expect(clock.offsetDays).toBe(-4);
    expect(clock.at("2026-08-05")).toBe("2026-08-01");
  });
});

describe("createMockClock — 주 정렬(alignWeek)", () => {
  // 2026-08-06은 목요일, 그 주는 월 8/3 ~ 금 8/7이다. 2026-11-10은 화요일이다.
  it("옮긴 뒤에도 같은 요일이고, 기준 주가 오늘이 속한 주로 옮겨진다", () => {
    const clock = createMockClock("2026-08-06", { alignWeek: true, today: "2026-11-10" });

    expect(clock.offsetDays % 7).toBe(0);
    expect(clock.at("2026-08-03")).toBe("2026-11-09"); // 월 → 이번 주 월
    expect(clock.at("2026-08-07")).toBe("2026-11-13"); // 금 → 이번 주 금
  });

  it("오늘이 월요일이든 일요일이든 같은 주면 같은 결과다", () => {
    const monday = createMockClock("2026-08-06", { alignWeek: true, today: "2026-11-09" });
    const sunday = createMockClock("2026-08-06", { alignWeek: true, today: "2026-11-15" });

    expect(monday.at("2026-08-03")).toBe("2026-11-09");
    expect(sunday.at("2026-08-03")).toBe("2026-11-09");
  });

  it("다음 주가 되면 한 주 뒤로 옮겨진다", () => {
    const clock = createMockClock("2026-08-06", { alignWeek: true, today: "2026-11-16" });

    expect(clock.at("2026-08-03")).toBe("2026-11-16");
  });
});

describe("createMockClock — 읽을 수 없는 입력", () => {
  it("기준일을 읽을 수 없으면 던진다", () => {
    expect(() => createMockClock("2026-02-30", { today: "2026-11-10" })).toThrow("기준일");
  });

  it("옮길 값을 읽을 수 없으면 던진다 — 오타를 조용히 넘기지 않는다", () => {
    const clock = createMockClock("2026-08-05", { today: "2026-11-10" });

    expect(() => clock.at("8월 5일")).toThrow("읽을 수 없는");
    expect(() => clock.at("2026-02-30T10:00")).toThrow("읽을 수 없는");
  });
});
