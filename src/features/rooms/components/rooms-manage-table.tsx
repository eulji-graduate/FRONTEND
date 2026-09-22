import { CalendarRange, MapPin } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";

import type { MeetingRoom } from "../types";
import { RoomRowActions } from "./room-row-actions";

interface RoomsManageTableProps {
  rooms: MeetingRoom[];
  /** false면 "수정" 열 자체를 안 그린다 — 화면 가드는 UX일 뿐이고, 진짜 검사는 Server Action이 한다. */
  canManage: boolean;
}

/**
 * 회의실 목록(관리) — 카드 anatomy는 DESIGN.md §2, 표는 §3을 따른다.
 * ⚠️ `/app/rooms`의 읽기전용 `room-list-panel.tsx`와 다르다 — 여기는 관리자가 고치는 표라
 *    "위치"·"수정" 열이 더 있다.
 */
export function RoomsManageTable({ rooms, canManage }: RoomsManageTableProps) {
  // 파생값 — "위치 N곳"은 저장된 필드가 아니라 회의실 목록에서 그때 계산한다(CLAUDE.md §도메인 상수).
  const locationCount = new Set(rooms.map((room) => room.location)).size;

  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border">
      <div className="flex items-baseline justify-between gap-3 px-7 pt-6 pb-3">
        {/*
          ⚠️ **제목 앞 아이콘을 뺀다**(2026-08-11). 상단바가 이미 같은 달력 아이콘으로 이 화면을
             가리키고 있어서, 카드 제목에 한 번 더 달면 같은 표식이 한 화면에 둘이 된다 —
             카드 제목은 글자로 충분하다(예약 화면의 `회의실 목록` 카드와 같은 규격).
        */}
        <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">회의실 목록</h2>
        {/* ⚠️ `text-xs`가 아니라 `text-[12px] leading-4`다 — 다섯 크기를 클래스로도 같게 적는다(§DESIGN 4) */}
        <p className="text-muted-foreground text-[12px] leading-4 tabular-nums">
          전체 {rooms.length}개 · 위치 {locationCount}곳
        </p>
      </div>

      {rooms.length === 0 ? (
        /*
          ⚠️ **빈 자리도 표가 시작하는 선 아래다**(2026-08-11). 선 없이 글자만 띄워 두니
             제목과 안내문이 한 덩이로 붙어 카드가 반쯤 지어진 것처럼 보였다 — 다른 목록
             카드와 같은 자리·같은 여백을 쓴다.
        */
        <EmptyState
          bordered
          icon={CalendarRange}
          title="등록된 회의실이 없습니다."
          description="회의실을 추가하면 예약 화면의 목록에 바로 나타납니다."
        />
      ) : (
        <div className="border-border overflow-x-auto border-t">
          <table className="w-full min-w-[560px] table-fixed text-[13px]">
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[38%]" />
              <col className="w-[22%]" />
            </colgroup>
            <thead>
              <tr className="text-muted-foreground bg-secondary/50 border-border border-b text-[12px] leading-4">
                <th className="px-7 py-3 text-left font-normal">이름</th>
                <th className="px-4 py-3 text-center font-normal">위치</th>
                <th className="px-4 py-3 text-center font-normal">
                  <span className="sr-only">관리</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr
                  key={room.id}
                  className="group border-border hover:bg-foreground/[0.04] transition-colors not-first:border-t"
                >
                  {/* ⚠️ 첫 열은 `px-7` — 카드 제목과 같은 세로선에 선다(사원·프로젝트·저장소 표와 같은 값) */}
                  <td className="px-7 py-3.5 text-left font-medium">{room.name}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-muted-foreground inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5 shrink-0" aria-hidden />
                      {room.location}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {canManage && <RoomRowActions room={room} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
