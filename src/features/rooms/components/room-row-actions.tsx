"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { MeetingRoom } from "../types";
import { RoomDeleteDialog } from "./room-delete-dialog";
import { RoomEditDialog } from "./room-edit-dialog";

interface RoomRowActionsProps {
  room: MeetingRoom;
}

/**
 * 회의실 목록 한 행의 "⋯" 메뉴 — 수정·삭제.
 * ⚠️ 두 모달(`RoomEditDialog`·`RoomDeleteDialog`)은 외부에서 열림 상태를 받는다 — 트리거가
 *    메뉴 항목이라 각 모달이 자기 버튼을 그리면 "⋯" 메뉴와 모달이 동시에 뜬다.
 */
export function RoomRowActions({ room }: RoomRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button" variant="ghost" size="icon-xs" aria-label={`${room.name} 관리`}>
              <MoreHorizontal aria-hidden />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil aria-hidden />
            수정
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 aria-hidden />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RoomEditDialog room={room} open={editOpen} onOpenChange={setEditOpen} />
      <RoomDeleteDialog room={room} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
