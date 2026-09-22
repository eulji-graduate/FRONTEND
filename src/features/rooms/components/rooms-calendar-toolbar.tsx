import { addDays, format, startOfWeek } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import type { ToolbarProps } from "react-big-calendar";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ROOMS_CALENDAR_TOOLBAR_LABEL } from "../constants";
import type { MeetingRoom, RoomCalendarEvent } from "../types";

interface RoomsCalendarToolbarProps extends ToolbarProps<RoomCalendarEvent> {
  rooms: MeetingRoom[];
  /** 지금 그리드가 보여주는 회의실 — ROOM-02가 회의실 하나를 필수로 요구해서 "전체"는 없다. */
  selectedRoomId: string;
  /** 회의실을 바꾸면 `WeeklyRoomCalendar`가 URL(`?roomId=`)을 바꿔 서버가 새 그리드를 내려준다. */
  onSelectedRoomChange: (roomId: string) => void;
}

/**
 * 커스텀 툴바 — 왼쪽에 `●` + 이번 주 구간(월~금) 라벨, 오른쪽에 회의실 거르개 + `<` `오늘` `>`
 * 주간 이동. "회의 추가" 버튼은 `RoomListPanel`로 옮겼다(2026-08-11, 팀 요청 — 회의실 목록
 * 옆이 예약 도입부로 더 맞다).
 * 주의: 표식 점(`●`)은 `calendar-toolbar.tsx`(개인 캘린더)와 같은 자리 — 이 카드가 뭔지
 *    말하고 시작한다(DESIGN §3).
 * 주의: RBC가 주는 `label`(로케일이 안 먹어 영문으로 나온다) 대신 `date`로 직접 만든다
 *    (`calendar-toolbar.tsx`와 같은 이유, CLAUDE.md §카피: 날짜는 한글로).
 * 주의: 구간 라벨은 좁은 화면에서 줄어들 수 있다 — 자릿수가 달라져도 `tabular-nums`로 숫자
 *    폭만 맞춘다(고정 폭 대신 `max-w`로 최소 여백만 보장).
 * 주의: 회의실 select는 이제 **서버 재조회 파라미터다**(ROOM-02 전환) — 고르면
 *    `weekly-room-calendar.tsx`가 URL(`?roomId=`)을 바꿔 그 회의실의 새 그리드를 받아온다.
 *    "전체 회의실"은 없다 — API가 회의실 하나를 필수로 요구한다.
 * 주의: 좁은 화면에서는 두 그룹(구간 라벨 / 거르개+주간 이동)을 세로로 쌓는다.
 */
export function RoomsCalendarToolbar({
  date,
  onNavigate,
  rooms,
  selectedRoomId,
  onSelectedRoomChange,
}: RoomsCalendarToolbarProps) {
  /*
    ⚠️ `useMemo`로 참조를 고정한다. 매 렌더 새 객체를 넘기면 base-ui `Select`의 내부 이펙트가
       참조 변화 → store 갱신 → 리렌더 → 새 객체를... 반복해 "Maximum update depth exceeded"로
       이어진다(CI에서 실제로 터졌다 — `search-filter-bar.tsx`와 같은 이유).
  */
  const roomItems = useMemo(
    () => Object.fromEntries(rooms.map((room) => [room.id, room.name])),
    [rooms],
  );

  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 4);
  const rangeLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${format(weekStart, "M월 d일", { locale: ko })} - ${format(weekEnd, "d일", { locale: ko })}`
      : `${format(weekStart, "M월 d일", { locale: ko })} - ${format(weekEnd, "M월 d일", { locale: ko })}`;

  return (
    /*
      ⚠️ **카드 머리다**(2026-08-11). 격자 위에 떠 있던 줄을 카드 안으로 들여 개인 캘린더와
         같은 해부로 맞춘다 — 거기도 제목·범례·이동이 카드 머리에 함께 있다.
      ⚠️ 여백은 카드 규격(`px-7 pt-6 pb-5`)이고, 나누는 일은 아래 선 하나가 한다(§DESIGN 2).
    */
    <div className="border-border flex flex-col gap-2 border-b px-7 pt-6 pb-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {/*
          ⚠️ 제목 앞 검은 점을 뺀다 — 상태점과 같은 생김새라 뜻이 있는 표식처럼 읽힌다(§DESIGN 5).
          ⚠️ 글자는 다섯 크기다(§DESIGN 4) — `text-base`(16)는 규격 밖이라 17px 카드 제목으로 맞춘다.
        */}
        <p className="max-w-28 shrink-0 truncate text-[17px] leading-7 font-semibold tracking-[-0.3px] tabular-nums sm:max-w-40">
          {rangeLabel}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Select
          // ⚠️ `items`를 넘긴다 — 안 넘기면 트리거가 닫혀 있는 동안은 라벨을 못 찾아
          //    원문 값(`room.id`)이 그대로 보인다(`search-filter-bar.tsx`와 같은 이유).
          items={roomItems}
          value={selectedRoomId}
          onValueChange={(value) => value && onSelectedRoomChange(value)}
        >
          <SelectTrigger size="sm" aria-label={ROOMS_CALENDAR_TOOLBAR_LABEL.roomFilter}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {rooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/*
          ⚠️ **테두리 하나 안에 세 칸**이다(2026-08-11, 개인 캘린더와 같은 조작). 버튼 셋을
             떼어 놓으면 테두리가 세 번 반복되고 사이 간격까지 생겨, 조작 하나가 아니라
             잡동사니로 보인다.
          ⚠️ [오늘]이 가운데다 — 달력에서 가장 자주 하는 일이 "오늘로 돌아가기"라
             화살표 사이에 두면 손이 움직이는 거리가 가장 짧다.
        */}
        {/* ⚠️ 포커스 링은 **안쪽**으로 그린다(`ring-inset`) — 테두리를 `overflow-hidden`으로
            깎아 두어서 바깥 링이 잘려 키보드로 어디에 서 있는지 안 보였다(코드래빗 지적) */}
        <div className="border-border inline-flex items-center overflow-hidden rounded-lg border">
          <button
            type="button"
            aria-label="지난 주"
            onClick={() => onNavigate("PREV")}
            className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] focus-visible:ring-ring flex size-7 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-hidden focus-visible:ring-inset"
          >
            <ChevronLeft className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onNavigate("TODAY")}
            className="border-border text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] focus-visible:ring-ring flex h-7 items-center border-x px-2.5 text-[11px] leading-4 transition-colors focus-visible:ring-2 focus-visible:outline-hidden focus-visible:ring-inset"
          >
            오늘
          </button>
          <button
            type="button"
            aria-label="다음 주"
            onClick={() => onNavigate("NEXT")}
            className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] focus-visible:ring-ring flex size-7 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-hidden focus-visible:ring-inset"
          >
            <ChevronRight className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
