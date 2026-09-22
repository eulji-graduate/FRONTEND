const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// react-big-calendar 자체는 무겁고 DOM 레이아웃(getBoundingClientRect 등)에 기대는 부분이 많다 —
// 여기서는 `Calendar`가 받는 `events`·`components.toolbar`만 확인하면 되므로 그 자리만 대역한다.
jest.mock("react-big-calendar", () => {
  const actual = jest.requireActual("react-big-calendar");
  return {
    ...actual,
    Calendar: (props: {
      date: Date;
      views: string[];
      events: { id: string }[];
      components?: { toolbar?: (toolbarProps: unknown) => React.ReactNode };
    }) => (
      <div>
        {props.components?.toolbar?.({
          date: props.date,
          onNavigate: () => {},
          label: "",
          view: "work_week",
          views: props.views,
          onView: () => {},
        })}
        <ul data-testid="visible-events">
          {props.events.map((event) => (
            <li key={event.id}>{event.id}</li>
          ))}
        </ul>
      </div>
    ),
  };
});

// 실제 툴바(회의실 select)는 base-ui 팝업 조작이 얽혀 있어 테스트 대상(URL 전환 로직)과
// 무관하다 — `onSelectedRoomChange`를 그대로 노출하는 버튼 스텁으로 바꿔 그 로직만 검증한다.
jest.mock("./rooms-calendar-toolbar", () => ({
  RoomsCalendarToolbar: ({
    rooms,
    onSelectedRoomChange,
  }: {
    rooms: { id: string; name: string }[];
    onSelectedRoomChange: (roomId: string) => void;
  }) => (
    <div>
      {rooms.map((room) => (
        <button key={room.id} type="button" onClick={() => onSelectedRoomChange(room.id)}>
          {room.name}
        </button>
      ))}
    </div>
  ),
}));

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AUTHORITY } from "@/constants/authority";

import type { MeetingRoom, RoomCalendarEvent, RoomMember } from "../types";
import { WeeklyRoomCalendar } from "./weekly-room-calendar";

const ROOMS: MeetingRoom[] = [
  { id: "room-a", name: "대회의실", location: "3층 A동" },
  { id: "room-b", name: "소회의실", location: "3층 B동" },
];
const MEMBERS: RoomMember[] = [
  { id: 1, name: "박대표", teamName: null, authority: AUTHORITY.OWNER },
];

const EVENTS: RoomCalendarEvent[] = [
  {
    id: "res-a",
    meetingId: "res-a",
    title: "A 회의",
    start: new Date("2026-08-10T10:00:00"),
    end: new Date("2026-08-10T10:30:00"),
    attendeeIds: [1],
  },
];

function renderCalendar() {
  return render(
    <WeeklyRoomCalendar
      events={EVENTS}
      members={MEMBERS}
      rooms={ROOMS}
      selectedRoomId="room-a"
      week="2026-08-10"
      onSelectSlot={jest.fn()}
      onSelectMeeting={jest.fn()}
    />,
  );
}

describe("WeeklyRoomCalendar", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("서버가 내려준 events를 그대로 Calendar에 넘긴다", () => {
    renderCalendar();

    const list = screen.getByTestId("visible-events");
    expect(within(list).getByText("res-a")).toBeInTheDocument();
  });

  it("다른 회의실을 고르면 그 회의실 id로 URL을 바꾼다(서버 재조회)", async () => {
    const user = userEvent.setup();
    renderCalendar();

    await user.click(screen.getByRole("button", { name: "소회의실" }));

    expect(pushMock).toHaveBeenCalledWith("/app/rooms?week=2026-08-10&roomId=room-b");
  });
});
