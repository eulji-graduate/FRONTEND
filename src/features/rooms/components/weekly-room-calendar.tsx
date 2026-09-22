"use client";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "./weekly-room-calendar.css";

import { format, getDay, parse, startOfWeek } from "date-fns";
import { ko } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { type MouseEvent as ReactMouseEvent, useCallback, useMemo } from "react";
import { Calendar, dateFnsLocalizer, type ToolbarProps } from "react-big-calendar";

import { getReservationAccentColor } from "../accent-color";
import { WEEKLY_CALENDAR_HEIGHT_PX } from "../calendar-height";
import { findSlotStart, GRID_END_HOUR, GRID_START_HOUR, SLOT_MINUTES } from "../grid-slot";
import type { MeetingRoom, RoomCalendarEvent, RoomMember } from "../types";
import { RoomReservationEvent } from "./room-reservation-event";
import { RoomsCalendarToolbar } from "./rooms-calendar-toolbar";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { ko },
});

function toWeekParam(date: Date): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

interface WeeklyRoomCalendarProps {
  events: RoomCalendarEvent[];
  members: RoomMember[];
  rooms: MeetingRoom[];
  /** 지금 그리드가 보여주는 회의실 — ROOM-02 전환(2026-08-10)으로 축이 "회의실 1개 × 5일"이라
   *  화면 표시가 아니라 **서버 재조회 파라미터**다(예전 "전체 회의실" 거르개와 다르다). */
  selectedRoomId: string;
  /** "YYYY-MM-DD" — 이 주의 월요일. 서버 컴포넌트가 이 값·`selectedRoomId` 기준으로 그리드를 내려준다. */
  week: string;
  /** 빈 슬롯을 선택하면(30분 칸 클릭) 그 시작 시각을 올려보낸다 — 예약 모달이 이 값으로 연다. */
  onSelectSlot: (start: Date) => void;
  /** 이미 있는 예약 막대를 클릭하면 그 회의 id를 올려보낸다 — 상세 조회 모달이 이 값으로 연다. */
  onSelectMeeting: (meetingId: string) => void;
}

/**
 * 회의실 주간 캘린더(react-big-calendar `work_week` 뷰 — 평일 5일만, 팀 화면 목업과 동일).
 * 주의: 개인 캘린더(`personal-calendar.tsx`)와 달리 이벤트 막대에 **글자를 그대로 보여준다** —
 *    회의실 화면엔 오른쪽 상세조회 패널이 따로 없어서, 셀 안에서 제목·시간·참석자를 바로 봐야 한다.
 * 주의: 예약은 **30분 한 타임 고정**이다(CLAUDE.md §브라우저 API, 팀 확정) — 시드 데이터도 예외
 *    없이 30분이다. `step=30, timeslots=2`로 "정시(그룹, 실선)/반시(슬롯, 점선)" 두 겹 그리드를 만든다.
 * 주의: **높이는 항상 고정이다**(2026-08-14, 24시간 확장과 함께 팀 재확정 — 이전엔 `lg`
 *    기준 반응형이었다). 그리드가 00:00~24:00 전부를 그리면서 "한 화면에 다 들어와야 한다"는
 *    전제가 깨져, `calendar-height.ts`의 고정 높이(10시간 치) + 내부 스크롤로 바꿨다. 진입
 *    시 `scrollToTime`으로 지금 시각 근처가 보이도록 미리 스크롤해 둔다.
 * 주의: 회의실 거르개(`RoomsCalendarToolbar`)는 이제 **URL(`?roomId=`)을 바꾼다** — ROOM-02가
 *    회의실 하나 기준으로만 그리드를 내려주므로, 화면 안에서 거를 목록 자체가 없다(서버 재조회).
 */
export function WeeklyRoomCalendar({
  events,
  members,
  rooms,
  selectedRoomId,
  week,
  onSelectSlot,
  onSelectMeeting,
}: WeeklyRoomCalendarProps) {
  const router = useRouter();

  const currentDate = useMemo(() => parse(week, "yyyy-MM-dd", new Date()), [week]);

  const handleNavigate = useCallback(
    (nextDate: Date) => {
      router.push(`/app/rooms?week=${toWeekParam(nextDate)}&roomId=${selectedRoomId}`);
    },
    [router, selectedRoomId],
  );

  const handleSelectedRoomChange = useCallback(
    (roomId: string) => {
      router.push(`/app/rooms?week=${week}&roomId=${roomId}`);
    },
    [router, week],
  );

  /**
   * 빈 칸을 누르면 그 30분 칸의 시작 시각을 올려보낸다 — **RBC의 `selectable`을 안 쓴다.**
   *
   * ⚠️ 그쪽 좌표 계산이 화면 배율(`transform: scale()`)에서 옆 날짜·옆 시간대를 골랐다
   *    (#141). 이유와 대안은 `grid-slot.ts`에 적었다.
   * ⚠️ 리스너는 RBC 뿌리 `div`에 그대로 얹는다(`elementProps`) — 감싸는 `div`를 하나 더 두면
   *    `lg:h-full`이 기대는 flex 사슬이 한 겹 끊겨 캘린더 높이가 무너진다.
   * ⚠️ 키보드로는 `RoomListPanel`의 [회의 추가]가 같은 모달을 연다 — 격자 클릭이 유일한
   *    길이 아니다(CLAUDE.md §a11y).
   * ⚠️ 기준일은 `week`가 아니라 **그 주의 월요일**로 한 번 더 접는다. `work_week` 뷰는 어떤
   *    날짜를 줘도 그 주 월~금을 그리므로, 첫 열이 곧 월요일이다 — URL이 주 중간 날짜를
   *    들고 와도 열 번호와 날짜가 안 갈린다.
   */
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);

  const handleGridClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      // ⚠️ 예약 막대(`.rbc-event`) 위 클릭은 RBC의 `onSelectEvent`가 따로 처리한다 — 여기서도
      //    같이 처리하면 빈 칸용 예약 생성 모달과 상세 조회 모달이 동시에 열린다.
      if (target.closest(".rbc-event")) return;

      const start = findSlotStart({ target, clientY: event.clientY, weekStart });
      if (start) onSelectSlot(start);
    },
    [weekStart, onSelectSlot],
  );

  const handleSelectEvent = useCallback(
    (event: RoomCalendarEvent) => {
      onSelectMeeting(event.meetingId);
    },
    [onSelectMeeting],
  );

  const EventComponent = useCallback(
    ({ event }: { event: RoomCalendarEvent }) => (
      <RoomReservationEvent
        title={event.title}
        start={event.start}
        end={event.end}
        attendeeIds={event.attendeeIds}
        members={members}
        accentColor={getReservationAccentColor(event.projectTag ?? event.id)}
      />
    ),
    [members],
  );

  /**
   * 진입 시 스크롤 위치 — **지금 시각이 보이는 창 중앙 근처에 오게 미리 스크롤해 둔다**
   * (2026-08-14, 24시간 확장 — 안 그러면 항상 00:00부터 보여서 지금이 몇 시인지 매번
   * 스크롤해서 찾아야 한다). 보이는 창이 10시간 치라 지금 시각에서 3시간을 뺀 지점부터
   * 보여주면 지금이 창의 위쪽 1/3 즈음에 온다(과거보다 앞으로 남은 시간이 더 잘 보이게).
   * `GRID_START_HOUR` 밑으로는 못 내려가게 막는다.
   */
  const scrollToTime = useMemo(() => {
    const now = new Date();
    const centeredHour = Math.max(GRID_START_HOUR, now.getHours() - 3);
    return new Date(0, 0, 0, centeredHour, 0, 0);
  }, []);

  const ToolbarComponent = useCallback(
    (toolbarProps: ToolbarProps<RoomCalendarEvent>) => (
      <RoomsCalendarToolbar
        {...toolbarProps}
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        onSelectedRoomChange={handleSelectedRoomChange}
      />
    ),
    [rooms, selectedRoomId, handleSelectedRoomChange],
  );

  return (
    <Calendar
      localizer={localizer}
      events={events}
      views={["work_week"]}
      defaultView="work_week"
      date={currentDate}
      onNavigate={handleNavigate}
      components={{ toolbar: ToolbarComponent, event: EventComponent }}
      step={SLOT_MINUTES}
      timeslots={2}
      min={new Date(0, 0, 0, GRID_START_HOUR, 0, 0)}
      /*
        ⚠️ **`GRID_END_HOUR`(24)를 그대로 `new Date(..., 24, 0, 0)`에 넣지 않는다.** JS
        `Date`는 시(hour) 24를 다음날 00:00으로 굴려 버려서 `getHours()`가 0이 되고, RBC의
        `localizer.merge`가 시·분만 뽑아 쓰는 탓에 `max`가 `min`과 같은 00:00으로 읽혀
        그리드 범위가 0이 된다. 하루의 "끝"은 `23:59:59`로 표현한다(RBC 24시간 예제의
        표준 관례).
      */
      max={new Date(0, 0, 0, GRID_END_HOUR - 1, 59, 59)}
      scrollToTime={scrollToTime}
      onSelectEvent={handleSelectEvent}
      elementProps={{ onClick: handleGridClick }}
      style={{ height: WEEKLY_CALENDAR_HEIGHT_PX }}
      formats={{
        dayFormat: (date: Date) => format(date, "EEE M/d", { locale: ko }),
        timeGutterFormat: (date: Date) => format(date, "H:mm"),
      }}
      messages={{
        today: "오늘",
        previous: "이전",
        next: "다음",
        noEventsInRange: "이번 주에는 예약된 회의가 없습니다.",
      }}
    />
  );
}
