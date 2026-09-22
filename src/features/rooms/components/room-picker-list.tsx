"use client";

import { cn } from "@/lib/utils";

import type { MeetingRoom } from "../types";

interface RoomPickerListProps {
  rooms: MeetingRoom[];
  selectedId: string;
  onChange: (id: string) => void;
  error?: boolean;
}

/**
 * 예약 모달의 "회의실" 선택 — 드롭다운이 아니라 목록에서 바로 고르는 형태(디자인 반영).
 * 회의실 개수가 적어(4곳) 펼쳐서 보여주는 쪽이 한 번 더 눌러야 하는 드롭다운보다 빠르다.
 * ⚠️ 괄호 안은 "수용 인원"이 아니라 "위치"다 — 수용 인원 필드는 폐기됐다(WORKFLOW.md §10-A).
 */
export function RoomPickerList({ rooms, selectedId, onChange, error }: RoomPickerListProps) {
  return (
    <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="회의실">
      {rooms.map((room) => {
        const selected = room.id === selectedId;
        return (
          <button
            key={room.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(room.id)}
            className={cn(
              "flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-[13px] leading-5 transition-colors",
              selected ? "border-foreground bg-foreground/5" : "border-input hover:bg-muted",
              error && !selected && "border-destructive/40",
            )}
          >
            <span>{room.name}</span>
            <span className="text-muted-foreground text-[12px] leading-4">{room.location}</span>
          </button>
        );
      })}
    </div>
  );
}
