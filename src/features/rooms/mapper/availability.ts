/**
 * 주간 예약 현황(`GET /api/meeting-rooms/availability`, ROOM-02) BE shape → UI 계약.
 * [확인] 회의실 도메인 문서(ROOM-01~05, 2026-08-12) 기준 — BE 실코드는 아직 대조 전이다
 *   (§연동 검증: Swagger·구두 추측 금지, 문서와 코드가 다르면 코드가 맞다 — 구현 시 컨트롤러로 재확인).
 */

import type {
  RoomCalendarEvent,
  RoomDayAvailability,
  RoomSlotStatus,
  RoomWeekAvailability,
} from "../types";

/**
 * 주간 예약 현황(`GET /api/meeting-rooms/availability`, ROOM-02) 안의 회의실 사본 — `location`이
 * 없다(BE가 이 엔드포인트에서는 안 내려준다).
 * ⚠️ `availableFrom`/`availableTo`도 없다(2026-08-15, BE PR #523 — 운영시간 개념 자체를 없앴다).
 */
export interface BeRoomAvailabilityMeetingRoom {
  meetingRoomId: number;
  name: string;
}

export interface BeRoomAvailabilitySlot {
  startTime: string;
  status: RoomSlotStatus;
  meetingId: number | null;
  title: string | null;
}

export interface BeRoomDayAvailability {
  date: string;
  dayOfWeek: string;
  slots: BeRoomAvailabilitySlot[];
}

export interface BeRoomWeekAvailability {
  weekStart: string;
  weekEnd: string;
  slotMinutes: number;
  meetingRoom: BeRoomAvailabilityMeetingRoom;
  days: BeRoomDayAvailability[];
}

export function toRoomWeekAvailability(be: BeRoomWeekAvailability): RoomWeekAvailability {
  return {
    weekStart: be.weekStart,
    slotMinutes: be.slotMinutes,
    meetingRoom: {
      id: String(be.meetingRoom.meetingRoomId),
      name: be.meetingRoom.name,
      location: "",
    },
    days: be.days.map((day) => ({
      date: day.date,
      slots: day.slots.map((slot) => ({
        startTime: slot.startTime,
        status: slot.status,
        meetingId: slot.meetingId !== null ? String(slot.meetingId) : null,
        title: slot.title,
      })),
    })),
  };
}

/**
 * 하루치 RESERVED 슬롯을 연속 구간으로 병합해 캘린더 막대로 만든다. 같은 `meetingId`가 슬롯
 * 간격 없이 이어질 때만 한 막대로 합친다 — 예약은 보통 30분 고정이지만, 이 API는 다른 경로로
 * 생성된 더 긴 회의도 그대로 반영해야 해서 병합이 필요하다.
 */
function toDayCalendarEvents(day: RoomDayAvailability, slotMinutes: number): RoomCalendarEvent[] {
  const events: RoomCalendarEvent[] = [];
  let current: { meetingId: string; title: string; start: Date; end: Date } | null = null;

  const flush = () => {
    if (!current) return;
    // ⚠️ `meetingId`만 쓰면 같은 회의가 주 전체에서 겹칠 일은 없어도, 여러 날짜를 flatMap하는
    //    `toRoomCalendarEvents`에서 React key로 그대로 쓰이니 날짜까지 더해 겹칠 여지를 없앤다.
    events.push({
      id: `${current.meetingId}-${day.date}`,
      meetingId: current.meetingId,
      title: current.title,
      start: current.start,
      end: current.end,
    });
    current = null;
  };

  for (const slot of day.slots) {
    const start = new Date(`${day.date}T${slot.startTime}:00`);
    const end = new Date(start.getTime() + slotMinutes * 60_000);

    if (slot.status === "RESERVED" && slot.meetingId !== null) {
      if (
        current &&
        current.meetingId === slot.meetingId &&
        current.end.getTime() === start.getTime()
      ) {
        current.end = end;
      } else {
        flush();
        current = { meetingId: slot.meetingId, title: slot.title ?? "", start, end };
      }
    } else {
      flush();
    }
  }
  flush();

  return events;
}

export function toRoomCalendarEvents(week: RoomWeekAvailability): RoomCalendarEvent[] {
  return week.days.flatMap((day) => toDayCalendarEvents(day, week.slotMinutes));
}
