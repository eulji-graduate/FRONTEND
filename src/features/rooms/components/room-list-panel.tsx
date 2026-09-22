import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OnlineMeetingDialog } from "@/features/meeting/components/online-meeting-dialog";

import type { AttendeeScopeViewer } from "../attendee-scope";
import { ROOM_LIST_PANEL_LABEL, ROOMS_CALENDAR_TOOLBAR_LABEL } from "../constants";
import type { MeetingRoom, RoomMember, RoomProjectOption, RoomTeamActionOption } from "../types";

interface RoomListPanelProps {
  rooms: MeetingRoom[];
  /** "회의 추가"(2026-08-11 이전엔 캘린더 툴바 안) — 예약 도입부가 회의실 목록 옆이 더 맞다. */
  onAddClick: () => void;
  /** 비대면 회의 다이얼로그로 그대로 흘려보낸다(2026-08-14, `/app/meeting`에서 이관). */
  members: RoomMember[];
  projects: RoomProjectOption[];
  showParentTeamAction: boolean;
  teamActions: RoomTeamActionOption[];
  viewer: AttendeeScopeViewer;
}

/**
 * 회의실 목록 — 캘린더 우측 사이드바(2026-08-10, 캘린더 하단에서 이동). 예약은 왼쪽
 * 캘린더에서 하고, 여기는 운영 시간만 빠르게 확인하는 자리.
 * ⚠️ **비대면 회의 진입점도 여기 있다**(2026-08-14, 사이드바 개편으로 `/app/meeting`에서
 *    이관). 회의실·시간이 없어 예약이 필요 없는 회의라 대면 예약([회의 추가])과 나란히 둔다.
 * 주의: `lg` 미만에서는 캘린더 아래로 쌓인다(`rooms-board.tsx`) — `CalendarDayDetailPanel`과 같은 패턴.
 */
export function RoomListPanel({
  rooms,
  onAddClick,
  members,
  projects,
  showParentTeamAction,
  teamActions,
  viewer,
}: RoomListPanelProps) {
  return (
    <aside className="border-border bg-card flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border lg:h-full lg:w-[280px] lg:max-w-[280px]">
      {/*
        ⚠️ **머리에 숨 쉴 자리를 준다**(2026-08-11). 제목·[회의 추가]·안내·개수가 4px 간격으로
           붙어 있어 네 덩이가 한 뭉치로 읽혔다 — 제목 줄과 안내 줄 사이를 벌리고
           위아래 여백도 카드 규격 쪽으로 올린다.
      */}
      {/*
        ⚠️ **머리를 세 층으로 벌린다**(2026-08-11). 제목·[회의 추가]·안내·개수가 한 덩이로
           뭉쳐 답답했다 — 카드 머리 규격(`pt-6 pb-5`)을 쓰고, 제목 줄에는 **건수만**
           올린다(다른 목록 카드와 같은 자리). 버튼은 아래 줄로 내려 안내와 짝을 짓는다.
        ⚠️ 안내와 버튼이 한 줄에 서면 "무엇을 보는 곳인지"와 "여기서 할 일"이 나란히 읽힌다.
      */}
      <div className="flex flex-col gap-3.5 px-5 pt-6 pb-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-foreground text-[17px] leading-7 font-semibold tracking-[-0.3px]">
            {ROOM_LIST_PANEL_LABEL.title}
          </h2>
          <span className="text-muted-foreground shrink-0 text-[12px] leading-4 tabular-nums">
            전체 {rooms.length}
            {ROOM_LIST_PANEL_LABEL.countSuffix}
          </span>
        </div>

        <p className="text-muted-foreground text-[12px] leading-4 break-keep">
          {ROOM_LIST_PANEL_LABEL.guidance}
        </p>

        {/*
          ⚠️ 버튼은 **한 줄을 통째로** 쓴다. 280px 칸에서 안내문과 나란히 두니 문구가 두 줄로
             접히고 둘 다 좁아졌다 — 이 칸에서 할 일은 하나뿐이라 그 하나를 크게 둔다.
        */}
        <Button type="button" size="sm" variant="ink" className="w-full" onClick={onAddClick}>
          <Plus aria-hidden />
          {ROOMS_CALENDAR_TOOLBAR_LABEL.addMeeting}
        </Button>

        {/* 비대면 회의는 회의실·시간이 없어 예약이 아니라 등록이다 — 대면 예약과 나란히, 별도 진입점 */}
        <OnlineMeetingDialog
          members={members}
          projects={projects}
          showParentTeamAction={showParentTeamAction}
          teamActions={teamActions}
          viewer={viewer}
          triggerClassName="w-full"
        />
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {rooms.map((room) => (
          <li
            key={room.id}
            className="border-border hover:bg-foreground/[0.03] flex items-center justify-between gap-3 border-t px-5 py-3.5 transition-colors"
          >
            <span className="text-foreground text-[13px] leading-5">{room.name}</span>
            <span className="text-muted-foreground text-[12px] leading-4">{room.location}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
