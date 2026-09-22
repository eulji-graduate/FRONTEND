import { format } from "date-fns";

import type { PaletteColor } from "@/lib/palette";

import { NEUTRAL_ACCENT_COLOR } from "../accent-color";
import type { RoomMember } from "../types";
import { AttendeeAvatarStack } from "./attendee-avatar-stack";

interface RoomReservationEventProps {
  title: string;
  start: Date;
  end: Date;
  /**
   * 참석자 id — 방금 만든 예약만 채워진다(주간 그리드 API는 참석자 id를 안 내려준다,
   * ROOM-02 규칙). 없으면 아바타 자리를 그리지 않는다.
   */
  attendeeIds?: number[];
  members: RoomMember[];
  /**
   * 막대 색 — 이 컴포넌트는 계산하지 않고 그대로 받아 그린다(호출부 `weekly-room-calendar.tsx`가
   * `accent-color.ts`로 정한다). 나중에 프로젝트 API가 색을 내려주게 되면 그 호출부만 바뀐다.
   */
  accentColor: PaletteColor;
}

/**
 * 예약 막대 — 옅은 tint 배경(`bgColor`) + 왼쪽 액센트 보더(`solidColor`) + 색 글자(`textColor`).
 * 회의는 항상 30분 고정이라 칸 하나에 제목·시간·참석자가 다 들어가야 한다.
 * 주의: **2줄 구조다**(2026-08-10) — 1행 제목, 2행 시간+참석자(`justify-between`). 원래 3행
 *    (제목/시간/참석자)이었으나 칸 높이를 줄이려고 시간·참석자를 한 줄로 합쳤다.
 * 주의: `accentColor`에 방어적 기본값을 둔다 — react-big-calendar의 `event` 렌더 컴포넌트는
 *    라이브러리 내부에서도 호출되는데, dev 환경(Turbopack HMR)에서 prop이 비어 오는 순간이
 *    관측돼 화면 전체가 죽는 것보다 중립색으로라도 그리는 쪽을 택한다.
 */
export function RoomReservationEvent({
  title,
  start,
  end,
  attendeeIds,
  members,
  accentColor = NEUTRAL_ACCENT_COLOR,
}: RoomReservationEventProps) {
  return (
    <div
      style={{
        backgroundColor: accentColor.bgColor,
        borderLeftColor: accentColor.solidColor,
        color: accentColor.textColor,
      }}
      className="flex h-full flex-col justify-center gap-0.5 overflow-hidden rounded-[5px] border-l-2 px-1.5 py-0.5 text-left leading-tight"
    >
      <span className="truncate text-[11px] font-medium">{title}</span>
      <span className="flex items-center justify-between gap-1">
        <span className="text-muted-foreground truncate text-[11px] tabular-nums">
          {format(start, "HH:mm")}–{format(end, "HH:mm")}
        </span>
        {attendeeIds && <AttendeeAvatarStack memberIds={attendeeIds} members={members} />}
      </span>
    </div>
  );
}
