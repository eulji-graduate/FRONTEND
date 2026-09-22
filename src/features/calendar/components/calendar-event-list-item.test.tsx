import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CALENDAR_ITEM_TAG, type PersonalCalendarEvent } from "../types";
import { CalendarEventListItem } from "./calendar-event-list-item";

function buildEvent(overrides: Partial<PersonalCalendarEvent> = {}): PersonalCalendarEvent {
  return {
    id: "todo-1",
    title: "주간 보고서 작성",
    start: new Date("2026-08-05T00:00:00"),
    end: new Date("2026-08-05T00:00:00"),
    tag: CALENDAR_ITEM_TAG.PERSONAL_TODO,
    isCompleted: false,
    ...overrides,
  };
}

describe("CalendarEventListItem", () => {
  it("개인 Todo는 체크박스를 보여주고 클릭하면 토글 콜백에 id를 실어 보낸다", async () => {
    const user = userEvent.setup();
    const onToggleCompletion = jest.fn();
    render(<CalendarEventListItem event={buildEvent()} onToggleCompletion={onToggleCompletion} />);

    await user.click(screen.getByRole("checkbox"));

    expect(onToggleCompletion).toHaveBeenCalledWith("todo-1");
  });

  it("완료된 Todo는 제목에 취소선이 붙는다", () => {
    render(<CalendarEventListItem event={buildEvent({ isCompleted: true })} />);

    expect(screen.getByText("주간 보고서 작성")).toHaveClass("line-through");
  });

  /*
    ⚠️ 개인 액션은 완료 처리 화면이 따로 있다 — 체크박스를 **보여주되 못 누르게** 둔다.
       두 줄이 같은 모양으로 서야 목록이 흔들리지 않고, 못 바꾼다는 사실은 `disabled`가 말한다.
       예전엔 아예 안 그렸는데, 그러면 같은 자리가 줄마다 다른 뜻이 됐다.
  */
  it("개인 액션의 체크박스는 못 누른다", () => {
    render(
      <CalendarEventListItem
        event={buildEvent({
          id: "action-1",
          tag: CALENDAR_ITEM_TAG.PERSONAL_ACTION,
          title: "회의실 예약 정책 공유",
        })}
      />,
    );

    // ⚠️ 공용 Checkbox는 네이티브 input이 아니라 `role="checkbox"` span이라 `aria-disabled`로 본다
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("개인 액션")).toBeInTheDocument();
  });
});
