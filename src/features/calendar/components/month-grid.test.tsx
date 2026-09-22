import { render, screen } from "@testing-library/react";

import { getTodoTitleColor } from "../tag-colors";
import { CALENDAR_ITEM_TAG, type PersonalCalendarEvent } from "../types";
import { MonthGrid } from "./month-grid";

function buildEvent(overrides: Partial<PersonalCalendarEvent> = {}): PersonalCalendarEvent {
  return {
    id: "todo-1",
    title: "여러 날 Todo",
    start: new Date("2026-08-05T00:00:00"),
    end: new Date("2026-08-05T00:00:00"),
    tag: CALENDAR_ITEM_TAG.PERSONAL_TODO,
    isCompleted: false,
    ...overrides,
  };
}

describe("MonthGrid — 여러 날에 걸친 Todo", () => {
  it("시작~끝 날짜에 걸친 모든 칸에 걸린다", () => {
    const event = buildEvent({ end: new Date("2026-08-07T00:00:00") });
    render(
      <MonthGrid
        events={[event]}
        month={new Date("2026-08-01T00:00:00")}
        selectedDate={new Date("2026-08-01T00:00:00")}
        onSelectDate={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /8월 5일.*일정 1건/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /8월 6일.*일정 1건/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /8월 7일.*일정 1건/ })).toBeInTheDocument();
    // 8월 4일·8월 8일은 구간 밖이라 걸리지 않는다.
    expect(screen.getByRole("button", { name: /8월 4일(?!.*일정)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /8월 8일(?!.*일정)/ })).toBeInTheDocument();
  });

  it("이어진 막대에서는 제목·상태 콩이 시작 칸에서만 보인다 — 같은 항목이 반복되지 않는다", () => {
    const event = buildEvent({ end: new Date("2026-08-07T00:00:00") });
    render(
      <MonthGrid
        events={[event]}
        month={new Date("2026-08-01T00:00:00")}
        selectedDate={new Date("2026-08-01T00:00:00")}
        onSelectDate={jest.fn()}
      />,
    );

    expect(screen.getAllByText("여러 날 Todo")).toHaveLength(1);
  });

  it("하루짜리 Todo는 그 날 칸에만 걸린다(기존 동작)", () => {
    const event = buildEvent();
    render(
      <MonthGrid
        events={[event]}
        month={new Date("2026-08-01T00:00:00")}
        selectedDate={new Date("2026-08-01T00:00:00")}
        onSelectDate={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /8월 5일.*일정 1건/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /8월 6일(?!.*일정)/ })).toBeInTheDocument();
    expect(screen.getAllByText("여러 날 Todo")).toHaveLength(1);
  });
});

describe("MonthGrid — 같은 주 안에서 줄 순서가 안 흔들린다(밤티현상 수정)", () => {
  it("긴 항목이 항상 위 줄이다 — 입력 배열 순서와 무관하다", () => {
    const longEvent = buildEvent({
      id: "long",
      title: "긴 항목",
      start: new Date("2026-08-10T00:00:00"),
      end: new Date("2026-08-12T00:00:00"),
    });
    const shortEvent = buildEvent({
      id: "short",
      title: "짧은 항목",
      start: new Date("2026-08-10T00:00:00"),
      end: new Date("2026-08-10T00:00:00"),
    });

    // ⚠️ 짧은 항목을 배열 앞에 둔다 — 정렬이 입력 순서에 기대지 않고 기간으로 매기는지 본다.
    render(
      <MonthGrid
        events={[shortEvent, longEvent]}
        month={new Date("2026-08-01T00:00:00")}
        selectedDate={new Date("2026-08-01T00:00:00")}
        onSelectDate={jest.fn()}
      />,
    );

    const day10Group = screen.getByRole("group", { name: /8월 10일.*일정/ });
    const titles = Array.from(day10Group.children).map((child) => child.textContent);
    expect(titles[0]).toContain("긴 항목");
    expect(titles[1]).toContain("짧은 항목");
  });

  it("같은 항목이라도 옆 항목이 사라지는 날엔 빈 줄로 자리를 메워 세로 위치가 유지된다", () => {
    // A: 8/2~8/3 (row 0), B: 8/3~8/4 (row 1), C: 8/3~8/4 (row 1과 겹쳐 row 2로 밀림).
    // 8/4에는 A가 없다 — 빈 줄 없이 그리면 C가 2번째 칸으로 올라와 8/3과 세로 위치가 어긋난다.
    const eventA = buildEvent({
      id: "event-a",
      title: "A",
      start: new Date("2026-08-02T00:00:00"),
      end: new Date("2026-08-03T00:00:00"),
    });
    const eventB = buildEvent({
      id: "event-b",
      title: "B",
      start: new Date("2026-08-03T00:00:00"),
      end: new Date("2026-08-04T00:00:00"),
    });
    const eventC = buildEvent({
      id: "event-c",
      title: "C",
      start: new Date("2026-08-03T00:00:00"),
      end: new Date("2026-08-04T00:00:00"),
    });

    render(
      <MonthGrid
        events={[eventC, eventA, eventB]}
        month={new Date("2026-08-01T00:00:00")}
        selectedDate={new Date("2026-08-01T00:00:00")}
        onSelectDate={jest.fn()}
      />,
    );

    /*
      ⚠️ `textContent`로는 못 잰다 — 이어지는 칸(`spanEdge` middle/end)은 제목을 안 보여주는 게
         의도된 디자인이라(연속 막대 규칙, 2026-08-10) 8/3·8/4의 B·C 칩엔 눈에 보이는 글자가
         없다. 대신 항상 붙는 `title` 속성(툴팁)으로 어떤 항목인지 식별한다.
    */
    // 8/3 — A·B·C 다 걸린다: 3줄 다 차 있다.
    const day3Group = screen.getByRole("group", { name: /8월 3일.*일정/ });
    const day3Titles = Array.from(day3Group.children).map((child) => child.getAttribute("title"));
    expect(day3Titles).toEqual(["A", "B", "C"]);

    // 8/4 — A는 빠지지만, C는 여전히 3번째 자리(빈 줄 다음)에 있어야 8/3과 세로로 이어진다.
    const day4Group = screen.getByRole("group", { name: /8월 4일.*일정/ });
    expect(day4Group.children).toHaveLength(3);
    expect(day4Group.children[0]).toHaveAttribute("aria-hidden", "true");
    expect(day4Group.children[0]).not.toHaveAttribute("title");
    expect(day4Group.children[1]).toHaveAttribute("title", "B");
    expect(day4Group.children[2]).toHaveAttribute("title", "C");
  });
});

describe("MonthGrid — 개인 Todo는 제목마다 색이 다르다", () => {
  it("칩 배경이 고정 sky색이 아니라 제목에서 뽑은 팔레트 색이다", () => {
    const event = buildEvent({ title: "A" });
    render(
      <MonthGrid
        events={[event]}
        month={new Date("2026-08-01T00:00:00")}
        selectedDate={new Date("2026-08-01T00:00:00")}
        onSelectDate={jest.fn()}
      />,
    );

    const chip = screen.getByTitle("A");
    expect(chip.style.backgroundColor).toBe(getTodoTitleColor("A").bgColor);
  });

  it("제목이 다르면 칩 배경색도 달라질 수 있다", () => {
    const eventA = buildEvent({
      id: "todo-a",
      title: "A",
      start: new Date("2026-08-10T00:00:00"),
      end: new Date("2026-08-10T00:00:00"),
    });
    const eventB = buildEvent({
      id: "todo-b",
      title: "B",
      start: new Date("2026-08-11T00:00:00"),
      end: new Date("2026-08-11T00:00:00"),
    });
    render(
      <MonthGrid
        events={[eventA, eventB]}
        month={new Date("2026-08-01T00:00:00")}
        selectedDate={new Date("2026-08-01T00:00:00")}
        onSelectDate={jest.fn()}
      />,
    );

    expect(screen.getByTitle("A").style.backgroundColor).not.toBe(
      screen.getByTitle("B").style.backgroundColor,
    );
  });
});

describe("MonthGrid — 완료된 여러 날 Todo의 취소선이 칸마다 끊기지 않는다", () => {
  it("이어지는 쪽 인셋을 0으로 둬서 배경처럼 취소선도 옆 칸까지 맞붙는다", () => {
    const event = buildEvent({
      title: "완료된 Todo",
      start: new Date("2026-08-05T00:00:00"),
      end: new Date("2026-08-07T00:00:00"),
      isCompleted: true,
    });

    render(
      <MonthGrid
        events={[event]}
        month={new Date("2026-08-01T00:00:00")}
        selectedDate={new Date("2026-08-01T00:00:00")}
        onSelectDate={jest.fn()}
      />,
    );

    const chipOn = (dateLabel: RegExp) =>
      screen.getByRole("group", { name: dateLabel }).querySelector('[title="완료된 Todo"]');

    // 시작 칸 — 왼쪽은 제 여백(1.5)만큼, 오른쪽은 다음 칸과 맞붙게 0으로 튼다.
    expect(chipOn(/8월 5일.*일정/)?.className).toContain("after:left-1.5");
    expect(chipOn(/8월 5일.*일정/)?.className).toContain("after:right-0");

    // 중간 칸 — 양쪽 다 옆 칸과 맞붙어야 하니 둘 다 0.
    expect(chipOn(/8월 6일.*일정/)?.className).toContain("after:left-0");
    expect(chipOn(/8월 6일.*일정/)?.className).toContain("after:right-0");

    // 끝 칸 — 왼쪽은 앞 칸과 맞붙게 0, 오른쪽은 제 여백(1.5)으로 마무리.
    expect(chipOn(/8월 7일.*일정/)?.className).toContain("after:left-0");
    expect(chipOn(/8월 7일.*일정/)?.className).toContain("after:right-1.5");
  });
});
