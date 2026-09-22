"use client";

import { useState } from "react";

import type { AttendeeScopeViewer } from "../attendee-scope";
import { toCalendarEventFromReservation } from "../mapper";
import { getNextAvailableSlot } from "../next-available-slot";
import type {
  MeetingRoom,
  RoomCalendarEvent,
  RoomMember,
  RoomProjectOption,
  RoomTeamActionOption,
} from "../types";
import { RoomListPanel } from "./room-list-panel";
import { RoomMeetingDetailDialog } from "./room-meeting-detail-dialog";
import { RoomReservationDialog } from "./room-reservation-dialog";
import { WeeklyRoomCalendarLoader } from "./weekly-room-calendar-loader";

interface RoomsBoardProps {
  initialEvents: RoomCalendarEvent[];
  rooms: MeetingRoom[];
  /** 지금 그리드에 보이는 회의실 — 회의실이 하나도 없으면 `null`(그리드 대신 안내). */
  selectedRoomId: string | null;
  members: RoomMember[];
  projects: RoomProjectOption[];
  /** "상위 팀 액션" 필드를 보여줄지 — 서버 컴포넌트(`page.tsx`)가 `requiresParentTeamAction`으로
   *  미리 계산해 내려준다. `lib/permission.ts`는 `server-only`라 클라이언트 컴포넌트에서 직접
   *  못 부른다(여기·`RoomReservationDialog`가 전부 client). */
  showParentTeamAction: boolean;
  teamActions: RoomTeamActionOption[];
  /** 참석자 범위(Owner=팀장만 / Leader·Member=자기 팀만) 기준 — `RoomReservationDialog`로
   *  그대로 흘려보낸다(`attendee-scope.ts`, 2026-08-13 확정). */
  viewer: AttendeeScopeViewer;
  /** "YYYY-MM-DD" — 이 주의 월요일. 서버 컴포넌트가 이 주 기준으로 `initialEvents`를 내려준다. */
  week: string;
}

/**
 * 회의실 화면 본체(client). 서버가 내려준 주간 그리드(현재 `selectedRoomId` 하나 기준)를 로컬
 * state로 들고 있다가, 예약 생성 성공 시 재조회 없이 바로 얹는다(`calendar-board.tsx`와 같은
 * 패턴, §최적화: action 리턴값으로 화면 반영).
 * ⚠️ **회의실 전환은 `WeeklyRoomCalendarLoader`가 URL(`?roomId=`)로 한다** — 서버 컴포넌트가
 *    그 회의실의 새 그리드를 내려주고, 이 컴포넌트는 `key`로 다시 마운트된다(주 이동과 같은 이유).
 * 주의: 30분 칸을 클릭하면 그 시작 시각을 `slotStart`에 담아 예약 모달을 연다 — 모달이 열려 있는지는
 *    `slotStart !== null`로만 판단한다(별도 `isOpen` state를 안 둔다).
 * 주의: "회의 추가" 진입점은 `RoomListPanel` 상단(2026-08-11, 캘린더 툴바 안에서 이동)에
 *    있다 — 여는 시각은 `getNextAvailableSlot`이 "지금"을 30분 단위로 올려 계산하는
 *    로직은 그대로다.
 */
export function RoomsBoard({
  initialEvents,
  rooms,
  selectedRoomId,
  members,
  projects,
  showParentTeamAction,
  teamActions,
  viewer,
  week,
}: RoomsBoardProps) {
  const [events, setEvents] = useState(initialEvents);
  const [slotStart, setSlotStart] = useState<Date | null>(null);
  const [viewingMeetingId, setViewingMeetingId] = useState<string | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:items-stretch">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <WeeklyRoomCalendarLoader
          events={events}
          members={members}
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          week={week}
          onSelectSlot={setSlotStart}
          onSelectMeeting={setViewingMeetingId}
        />
      </div>

      <RoomListPanel
        rooms={rooms}
        onAddClick={() => setSlotStart(getNextAvailableSlot(new Date()))}
        members={members}
        projects={projects}
        showParentTeamAction={showParentTeamAction}
        teamActions={teamActions}
        viewer={viewer}
      />

      <RoomReservationDialog
        slotStart={slotStart}
        onOpenChange={(open) => !open && setSlotStart(null)}
        rooms={rooms}
        members={members}
        projects={projects}
        showParentTeamAction={showParentTeamAction}
        teamActions={teamActions}
        viewer={viewer}
        onCreated={(created) => {
          // ⚠️ 지금 보고 있는 회의실과 다른 회의실에 예약했으면 이 그리드엔 안 얹는다 — 다른
          //    회의실의 예약을 이 화면에 섞으면 그 그리드가 거짓말을 하게 된다(§정직성).
          if (created.roomId !== selectedRoomId) return;
          setEvents((prev) => [...prev, toCalendarEventFromReservation(created)]);
        }}
      />

      <RoomMeetingDetailDialog
        meetingId={viewingMeetingId}
        onOpenChange={(open) => !open && setViewingMeetingId(null)}
        onTitleUpdated={(meetingId, title) => {
          setEvents((prev) =>
            prev.map((event) => (event.meetingId === meetingId ? { ...event, title } : event)),
          );
        }}
        onCancelled={(meetingId) => {
          setEvents((prev) => prev.filter((event) => event.meetingId !== meetingId));
        }}
      />
    </div>
  );
}
