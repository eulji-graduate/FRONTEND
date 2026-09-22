import { CALENDAR_ITEM_TAG } from "../types";
import { addMockTodo, findMockEvent, listMockEvents, toggleMockCompletion } from "./events";

describe("개인 캘린더 mock 스토어", () => {
  it("초기 데이터에 개인 Todo와 개인 액션이 섞여 있다", () => {
    const events = listMockEvents();
    expect(events.some((event) => event.tag === CALENDAR_ITEM_TAG.PERSONAL_TODO)).toBe(true);
    expect(events.some((event) => event.tag === CALENDAR_ITEM_TAG.PERSONAL_ACTION)).toBe(true);
  });

  it("Todo를 추가하면 앞뒤 공백을 지우고 미완료 상태로 목록에 붙는다", () => {
    const before = listMockEvents().length;

    const created = addMockTodo({
      title: "  새 할 일  ",
      date: "2026-09-10",
      endDate: "2026-09-10",
    });

    expect(created.title).toBe("새 할 일");
    expect(created.tag).toBe(CALENDAR_ITEM_TAG.PERSONAL_TODO);
    expect(created.isCompleted).toBe(false);
    // 하루 종일 항목 취급 — 시작·끝이 같은 날 자정이다.
    expect(created.start).toEqual(created.end);
    expect(listMockEvents()).toHaveLength(before + 1);
    expect(findMockEvent(created.id)).toEqual(created);
  });

  it("끝 날짜가 시작 날짜보다 나중이면 여러 날에 걸친 항목으로 만든다", () => {
    const created = addMockTodo({
      title: "여러 날 Todo",
      date: "2026-09-10",
      endDate: "2026-09-12",
    });

    expect(created.start).toEqual(new Date("2026-09-10T00:00:00"));
    expect(created.end).toEqual(new Date("2026-09-12T00:00:00"));
  });

  it("완료 토글은 isCompleted를 뒤집는다", () => {
    const created = addMockTodo({
      title: "토글 테스트",
      date: "2026-09-11",
      endDate: "2026-09-11",
    });

    const toggled = toggleMockCompletion(created.id);
    expect(toggled?.isCompleted).toBe(true);

    const toggledAgain = toggleMockCompletion(created.id);
    expect(toggledAgain?.isCompleted).toBe(false);
  });

  it("없는 id는 조회·토글 둘 다 null을 돌려준다", () => {
    expect(findMockEvent("존재하지-않음")).toBeNull();
    expect(toggleMockCompletion("존재하지-않음")).toBeNull();
  });
});
