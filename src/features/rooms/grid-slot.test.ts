import { findSlotStart, GRID_START_HOUR, SLOT_MINUTES } from "./grid-slot";

/** 2026-08-10은 월요일 — `work_week` 첫 열이다. */
const WEEK_START = new Date(2026, 7, 10);

const DAY_COUNT = 5;
/**
 * 격자 흉내를 위한 고정 칸 수 — 실제 그리드는 이제 24시간(48칸)이지만, 이 테스트는 클릭 좌표
 * 계산 로직만 검증하면 되므로 임의로 20칸짜리 작은 격자로 흉내 낸다(칸 수 자체는 무관하다).
 */
const SLOT_COUNT = 20;
/** 배율이 걸리기 **전**(레이아웃) 기준 칸 높이·격자 시작 y. 실제 화면 값과 무관한 임의 수다. */
const SLOT_HEIGHT = 40;
const GRID_TOP = 100;

/**
 * `react-big-calendar`가 그리는 `work_week` 격자를 최소로 흉내 낸다.
 *
 * ⚠️ **`getBoundingClientRect`를 배율만큼 줄여서 돌려준다.** jsdom은 레이아웃을 안 하므로
 *    전부 0이라, 그냥 두면 배율 회귀를 잴 수가 없다 — `body`에 `transform: scale()`이 걸린
 *    실제 화면처럼 **레이아웃 좌표 × 배율**을 내놓게 해서 그 상황을 만든다
 *    (DECISIONS §화면 배율).
 * ⚠️ 시간 눈금(`.rbc-time-gutter`)에도 `.rbc-time-slot`을 같이 넣는다 — 열 밖의 같은 클래스를
 *    같이 세면 칸 번호가 통째로 밀린다.
 */
function buildGrid(scale: number) {
  const content = document.createElement("div");
  content.className = "rbc-time-content";

  const stubRect = (element: Element, index: number) => {
    element.getBoundingClientRect = () =>
      ({
        top: (GRID_TOP + index * SLOT_HEIGHT) * scale,
        bottom: (GRID_TOP + (index + 1) * SLOT_HEIGHT) * scale,
        left: 0,
        right: 0,
        width: 0,
        height: SLOT_HEIGHT * scale,
        x: 0,
        y: (GRID_TOP + index * SLOT_HEIGHT) * scale,
        toJSON: () => ({}),
      }) as DOMRect;
  };

  const gutter = document.createElement("div");
  gutter.className = "rbc-time-gutter rbc-time-column";
  for (let index = 0; index < SLOT_COUNT; index += 1) {
    const slot = document.createElement("div");
    slot.className = "rbc-time-slot";
    stubRect(slot, index);
    gutter.append(slot);
  }
  content.append(gutter);

  const columns: HTMLElement[] = [];
  const slotsByColumn: HTMLElement[][] = [];
  for (let day = 0; day < DAY_COUNT; day += 1) {
    const column = document.createElement("div");
    column.className = "rbc-day-slot rbc-time-column";
    const slots: HTMLElement[] = [];
    for (let index = 0; index < SLOT_COUNT; index += 1) {
      const slot = document.createElement("div");
      slot.className = "rbc-time-slot";
      stubRect(slot, index);
      slots.push(slot);
      column.append(slot);
    }
    /* 예약 막대는 칸 위를 덮는 별도 상자에 담긴다 — 그 위를 눌러도 같은 칸으로 읽혀야 한다 */
    const eventsContainer = document.createElement("div");
    eventsContainer.className = "rbc-events-container";
    const eventBar = document.createElement("div");
    eventBar.className = "rbc-event";
    eventsContainer.append(eventBar);
    column.append(eventsContainer);

    columns.push(column);
    slotsByColumn.push(slots);
    content.append(column);
  }

  document.body.append(content);
  return { content, columns, slotsByColumn };
}

/** 레이아웃 좌표 y에 찍힌 점이 화면에서 갖는 `clientY` — 배율이 걸린 뒤 값이다. */
function clientYAt(layoutY: number, scale: number): number {
  return layoutY * scale;
}

/** 격자를 세운 직후라 반드시 있어야 하는 자리 — 없으면 흉내 낸 DOM 자체가 틀린 것이다. */
function at<T>(items: T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`흉내 낸 격자에 ${index}번째가 없다`);
  return item;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("findSlotStart", () => {
  /**
   * ⚠️ 이 표가 이 파일의 요점이다 — 같은 자리를 눌렀으면 배율이 얼마든 **같은 칸**이어야 한다.
   *    라이브러리(`Selection.getBoundsForNode`) 계산은 여기서 80%·75%가 옆 칸으로 밀렸다(#141).
   */
  it.each([100, 90, 80, 75])("배율 %i%%에서도 누른 칸의 시각을 그대로 읽는다", (percent) => {
    const scale = percent / 100;
    const { slotsByColumn } = buildGrid(scale);

    /* 수요일(0-base 2번째 열) · 4번째 칸(=09:30) 한가운데 */
    const dayIndex = 2;
    const slotIndex = 3;
    const layoutY = GRID_TOP + slotIndex * SLOT_HEIGHT + SLOT_HEIGHT / 2;

    const start = findSlotStart({
      target: at(at(slotsByColumn, dayIndex), slotIndex),
      clientY: clientYAt(layoutY, scale),
      weekStart: WEEK_START,
    });

    /* 2026-08-12(수), GRID_START_HOUR + 4번째 칸(index 3) = +1시간30분 */
    expect(start).toEqual(new Date(2026, 7, 12, GRID_START_HOUR + 1, 30));
    expect(start?.getHours()).toBe(GRID_START_HOUR + Math.floor((slotIndex * SLOT_MINUTES) / 60));
  });

  it("예약 막대 위를 눌러도 그 아래 칸의 시각으로 읽는다", () => {
    const scale = 0.8;
    const { columns } = buildGrid(scale);
    const eventBar = at(columns, 0).querySelector(".rbc-event");

    const start = findSlotStart({
      target: eventBar as Element,
      /* 첫 칸(GRID_START_HOUR:00) 한가운데 */
      clientY: clientYAt(GRID_TOP + SLOT_HEIGHT / 2, scale),
      weekStart: WEEK_START,
    });

    expect(start).toEqual(new Date(2026, 7, 10, GRID_START_HOUR, 0));
  });

  it("시간 눈금 칸은 날짜 열이 아니라 아무 것도 고르지 않는다", () => {
    const scale = 0.8;
    buildGrid(scale);
    const gutterSlot = document.querySelector(".rbc-time-gutter .rbc-time-slot");

    const start = findSlotStart({
      target: gutterSlot as Element,
      clientY: clientYAt(GRID_TOP + SLOT_HEIGHT / 2, scale),
      weekStart: WEEK_START,
    });

    expect(start).toBeNull();
  });

  it("격자 밖(칸에 안 걸리는 세로 자리)이면 아무 것도 고르지 않는다", () => {
    const scale = 0.8;
    const { slotsByColumn } = buildGrid(scale);

    const start = findSlotStart({
      target: at(at(slotsByColumn, 0), 0),
      /* 마지막 칸보다 아래 */
      clientY: clientYAt(GRID_TOP + SLOT_COUNT * SLOT_HEIGHT + 20, scale),
      weekStart: WEEK_START,
    });

    expect(start).toBeNull();
  });

  it("마지막 열·마지막 칸은 금요일 GRID_START_HOUR+9:30이다", () => {
    const scale = 0.75;
    const { slotsByColumn } = buildGrid(scale);
    const lastSlot = SLOT_COUNT - 1;

    const start = findSlotStart({
      target: at(at(slotsByColumn, DAY_COUNT - 1), lastSlot),
      clientY: clientYAt(GRID_TOP + lastSlot * SLOT_HEIGHT + SLOT_HEIGHT / 2, scale),
      weekStart: WEEK_START,
    });

    expect(start).toEqual(new Date(2026, 7, 14, GRID_START_HOUR + 9, 30));
  });
});
