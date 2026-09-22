import {
  buildActionTimeline,
  TIMELINE_DAY_WIDTH_PX,
  TIMELINE_MIN_VISIBLE_DAYS,
  type TimelineActionInput,
} from "./action-timeline";

/** 2026-08-05는 수요일 — 08-01/08 토, 08-02/09 일. 축·바 계산을 이 고정 오늘로 검증한다. */
const TODAY = new Date("2026-08-05T00:00:00");

const OVERDUE: TimelineActionInput = {
  id: "a1",
  title: "지연 액션",
  tag: "GOODS",
  tagBgColor: "var(--tag-purple-bg)",
  tagTextColor: "var(--tag-purple-fg)",
  startDate: "2026-08-01",
  dueDate: "2026-08-03",
  tone: "DELAYED",
  href: "/app/actions/a1",
};

const UPCOMING: TimelineActionInput = {
  id: "a2",
  title: "할 일 액션",
  tag: "COLLAB",
  tagBgColor: "var(--tag-sky-bg)",
  tagTextColor: "var(--tag-sky-fg)",
  startDate: "2026-08-09",
  dueDate: "2026-08-11",
  tone: "TODO",
  href: "/app/actions/a2",
};

describe("buildActionTimeline", () => {
  it("빈 입력이면 null을 준다", () => {
    expect(buildActionTimeline([], TODAY)).toBeNull();
  });

  it("축 범위가 최소 노출일보다 짧으면 뒤쪽에 칸을 채운다", () => {
    const model = buildActionTimeline([OVERDUE, UPCOMING], TODAY);

    // 실제 08-01~08-11(11일)은 최소 30일보다 짧아 뒤로 채워진다
    expect(model?.days).toHaveLength(TIMELINE_MIN_VISIBLE_DAYS);
    expect(model?.days[0]?.iso).toBe("2026-08-01");
    expect(model?.days.at(-1)?.iso).toBe("2026-08-30");
    expect(model?.monthLabel).toBe("8월");
    expect(model?.totalWidthPx).toBe(TIMELINE_MIN_VISIBLE_DAYS * TIMELINE_DAY_WIDTH_PX);
  });

  it("실제 기간이 최소 노출일보다 길면 그대로 쓴다(줄이지 않는다)", () => {
    const longRun: TimelineActionInput = {
      ...OVERDUE,
      id: "a5",
      startDate: "2026-08-01",
      dueDate: "2026-09-15", // 08-01~09-15 = 46일 > 30일
      tone: "IN_PROGRESS",
    };
    const model = buildActionTimeline([longRun], TODAY);

    expect(model?.days).toHaveLength(46);
    expect(model?.days.at(-1)?.iso).toBe("2026-09-15");
  });

  it("오늘선은 오늘 칸(08-05, index 4)의 중앙에 놓인다", () => {
    const model = buildActionTimeline([OVERDUE, UPCOMING], TODAY);

    expect(model?.todayLeftPx).toBeCloseTo(4.5 * TIMELINE_DAY_WIDTH_PX);
    expect(model?.days[4]?.isToday).toBe(true);
  });

  it("주말 플래그 — 토=08-01/08, 일=08-02/09", () => {
    const model = buildActionTimeline([OVERDUE, UPCOMING], TODAY);

    expect(model?.days[0]?.isSaturday).toBe(true); // 08-01
    expect(model?.days[1]?.isSunday).toBe(true); // 08-02
    expect(model?.days[7]?.isSaturday).toBe(true); // 08-08
    expect(model?.days[8]?.isSunday).toBe(true); // 08-09
  });

  it("바는 시작→마감을 칸 단위로 채우고 D-day는 오늘 기준으로 붙는다", () => {
    const model = buildActionTimeline([OVERDUE, UPCOMING], TODAY);
    const [overdue, upcoming] = model?.bars ?? [];

    // 지연: 08-01(0) ~ 08-03(2) → 3칸
    expect(overdue?.leftPx).toBeCloseTo(0);
    expect(overdue?.widthPx).toBeCloseTo(3 * TIMELINE_DAY_WIDTH_PX);
    expect(overdue?.ddayLabel).toBe("D+2");
    expect(overdue?.periodLabel).toBe("8월 1일~8월 3일");

    // 할 일: 08-09(8) ~ 08-11(10) → 3칸, 오늘선 오른쪽
    expect(upcoming?.leftPx).toBeCloseTo(8 * TIMELINE_DAY_WIDTH_PX);
    expect(upcoming?.widthPx).toBeCloseTo(3 * TIMELINE_DAY_WIDTH_PX);
    expect(upcoming?.ddayLabel).toBe("D-6");
  });

  it("당일 마감(시작=마감)은 한 칸짜리 바 + D-day", () => {
    const sameDay: TimelineActionInput = {
      ...UPCOMING,
      id: "a3",
      startDate: "2026-08-05",
      dueDate: "2026-08-05",
      tone: "IN_PROGRESS",
    };
    const model = buildActionTimeline([sameDay], TODAY);

    // 당일 하루뿐이지만 축은 최소 노출일만큼 뒤로 채워진다 · 바 폭은 하루뿐 · 오늘선은 그 칸 중앙
    expect(model?.days).toHaveLength(TIMELINE_MIN_VISIBLE_DAYS);
    expect(model?.bars[0]?.widthPx).toBeCloseTo(TIMELINE_DAY_WIDTH_PX);
    expect(model?.bars[0]?.ddayLabel).toBe("D-day");
    expect(model?.todayLeftPx).toBeCloseTo(TIMELINE_DAY_WIDTH_PX / 2);
  });

  it("범위가 달을 넘으면 monthLabel에 두 달을 적는다", () => {
    const crossMonth: TimelineActionInput = {
      ...OVERDUE,
      id: "a4",
      startDate: "2026-07-31",
      dueDate: "2026-08-05",
      tone: "IN_PROGRESS",
    };
    const model = buildActionTimeline([crossMonth], TODAY);

    // 07-31~08-05(6일)은 최소 노출일보다 짧아 뒤로 채워지지만, 시작월(7월)은 그대로다
    expect(model?.days).toHaveLength(TIMELINE_MIN_VISIBLE_DAYS);
    expect(model?.monthLabel).toBe("7~8월");
  });
});
