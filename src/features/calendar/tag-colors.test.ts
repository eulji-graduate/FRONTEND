import { TAG_NAMES } from "@/lib/palette";

import { CALENDAR_TODO_LEGEND_SWATCH, getTodoTitleColor } from "./tag-colors";

describe("getTodoTitleColor — 개인 Todo 제목별 색", () => {
  it("같은 제목이면 항상 같은 색이다", () => {
    expect(getTodoTitleColor("주간 보고서 작성")).toEqual(getTodoTitleColor("주간 보고서 작성"));
  });

  it("제목이 다르면 다른 색이 나올 수 있다", () => {
    expect(getTodoTitleColor("A")).not.toEqual(getTodoTitleColor("B"));
  });

  it("팔레트 CSS 변수(var(--tag-*))로만 나온다 — hex를 직접 들고 있지 않다", () => {
    const { bgColor, textColor, solidColor } = getTodoTitleColor("아무 제목");
    expect(bgColor).toMatch(/^var\(--tag-[a-z]+-bg\)$/);
    expect(textColor).toMatch(/^var\(--tag-[a-z]+-fg\)$/);
    expect(solidColor).toMatch(/^var\(--tag-[a-z]+-solid\)$/);
  });
});

describe("CALENDAR_TODO_LEGEND_SWATCH — 범례 색동 원", () => {
  it("팔레트 색 수만큼 conic-gradient 구간을 그린다", () => {
    expect(CALENDAR_TODO_LEGEND_SWATCH).toContain("conic-gradient(");
    TAG_NAMES.forEach((name) => {
      expect(CALENDAR_TODO_LEGEND_SWATCH).toContain(`var(--tag-${name}-solid)`);
    });
  });
});
