import { format } from "date-fns";
import type { Metadata } from "next";

import { RoomsBoard } from "@/features/rooms/components/rooms-board";
import { toRoomCalendarEvents } from "@/features/rooms/mapper";
import {
  getMeetingRooms,
  getReservableMembers,
  getReservableProjects,
  getReservableTeamActions,
  getRoomWeekAvailability,
} from "@/features/rooms/server";
import { getViewer } from "@/features/shell/viewer";
import { requiresParentTeamAction } from "@/lib/permission";

export const metadata: Metadata = {
  title: "회의 예약",
};

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseWeekParam(raw: string | undefined): Date {
  if (raw && DATE_PARAM_PATTERN.test(raw)) {
    const parsed = new Date(`${raw}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

interface RoomsPageProps {
  searchParams: Promise<{ week?: string; roomId?: string }>;
}

/**
 * `/app/rooms` — ROOM-02 전환(2026-08-10) 이후 축이 "회의실 1개 × 5일"이라, 그리드를 그리기
 * 전에 **어느 회의실을 볼지**부터 정해야 한다. `roomId` 검색 파라미터가 유효한 활성 회의실을
 * 가리키지 않으면(없음·삭제됨) 첫 회의실로 조용히 되돌아간다 — 회의실이 하나도 없으면 그리드
 * 없이 안내만 보여준다(`RoomsBoard`).
 */
export default async function RoomsPage({ searchParams }: RoomsPageProps) {
  const { week: weekParam, roomId: roomIdParam } = await searchParams;
  const week = parseWeekParam(weekParam);

  /*
    ⚠️ 팀 액션 목록·참석자 후보 둘 다 지금 보고 있는 사람이 누구인지(권한·소속 팀)에 따라
       달라져서 먼저 받는다 — 참석자는 Owner면 팀별 리더, Leader·Member면 자기 팀뿐이다
       (`getReservableMembers`, `attendee-scope.ts`).
  */
  const viewer = await getViewer();

  const [rooms, members, projects, teamActions] = await Promise.all([
    getMeetingRooms(),
    getReservableMembers(viewer),
    getReservableProjects(),
    getReservableTeamActions(viewer),
  ]);

  const selectedRoomId =
    roomIdParam && rooms.some((room) => room.id === roomIdParam)
      ? roomIdParam
      : (rooms[0]?.id ?? null);

  const weekAvailability = selectedRoomId
    ? await getRoomWeekAvailability(selectedRoomId, week)
    : null;
  const events = weekAvailability ? toRoomCalendarEvents(weekAvailability) : [];

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 py-7 lg:overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col gap-7">
        <RoomsBoard
          key={`${format(week, "yyyy-MM-dd")}-${selectedRoomId ?? "none"}`}
          initialEvents={events}
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          members={members}
          projects={projects}
          showParentTeamAction={requiresParentTeamAction(viewer)}
          teamActions={teamActions}
          /* ⚠️ 참석자 범위는 **권한이 정한다**(2026-08-13 확정) — 팀 이름만 넘겨 "팀이 없으면
             Owner"로 읽던 간접 추론을 걷어냈다(CLAUDE.md §조직 계층: 권한은 직급에서 온다). */
          viewer={{ id: viewer.id, role: viewer.role, teamName: viewer.teamName ?? null }}
          week={format(week, "yyyy-MM-dd")}
        />
      </div>
    </main>
  );
}
