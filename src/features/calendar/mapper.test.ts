import {
  type BeCalendarItem,
  type BeTodoResponse,
  toPersonalCalendarEvent,
  toPersonalCalendarEventFromTodo,
} from "./mapper";
import { CALENDAR_ITEM_TAG } from "./types";

const base: BeCalendarItem = {
  type: "TODO",
  id: 10,
  title: "여행",
  tag: null,
  startDate: "2026-08-20",
  endDate: "2026-08-25",
  isDone: false,
};

describe("BE 캘린더 항목 매퍼", () => {
  it("TODO는 id·isDone을 그대로 옮긴다", () => {
    const event = toPersonalCalendarEvent(base, 0);

    expect(event).toEqual({
      id: "10",
      title: "여행",
      start: new Date("2026-08-20T00:00:00"),
      end: new Date("2026-08-25T00:00:00"),
      tag: CALENDAR_ITEM_TAG.PERSONAL_TODO,
      isCompleted: false,
    });
  });

  it("ACTION은 id가 없어 합성 키를 쓰고 완료 여부는 항상 false다", () => {
    const event = toPersonalCalendarEvent(
      { ...base, type: "ACTION", id: null, isDone: null, tag: null },
      3,
    );

    expect(event?.id).toBe("action-3");
    expect(event?.tag).toBe(CALENDAR_ITEM_TAG.PERSONAL_ACTION);
    expect(event?.isCompleted).toBe(false);
  });

  it("PROJECT는 id가 없어 합성 키를 쓰고 프로젝트 태그를 색상용으로 옮긴다", () => {
    const event = toPersonalCalendarEvent(
      { ...base, type: "PROJECT", id: null, isDone: null, tag: "GROUPWARE" },
      2,
    );

    expect(event.id).toBe("project-2");
    expect(event.tag).toBe(CALENDAR_ITEM_TAG.PROJECT);
    expect(event.projectTag).toBe("GROUPWARE");
    expect(event.isCompleted).toBe(false);
  });
});

describe("BE Todo 응답 매퍼", () => {
  it("생성 응답을 그대로 개인 Todo 이벤트로 옮긴다", () => {
    const be: BeTodoResponse = {
      id: 10,
      title: "여행",
      date: "2026-08-20",
      endDate: "2026-08-25",
      isDone: false,
    };

    expect(toPersonalCalendarEventFromTodo(be)).toEqual({
      id: "10",
      title: "여행",
      start: new Date("2026-08-20T00:00:00"),
      end: new Date("2026-08-25T00:00:00"),
      tag: CALENDAR_ITEM_TAG.PERSONAL_TODO,
      isCompleted: false,
    });
  });
});
