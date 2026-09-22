"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";

import { updateMeetingRoomAction } from "../actions";
import type { MeetingRoom } from "../types";
import { RoomForm } from "./room-form";

interface RoomEditDialogProps {
  /** 목록(서버 컴포넌트)이 이미 받아 온 값 — 모달을 위해 다시 조회하지 않는다 */
  room: MeetingRoom;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 수정 모달 — `room-create-dialog.tsx`와 같은 골격이다.
 * ⚠️ **외부에서 열림 상태를 받는다**(2026-08-10 정리) — 트리거가 표 행의 "⋯" 메뉴
 *    (`room-row-actions.tsx`)로 옮겨서 이 컴포넌트가 직접 버튼을 그릴 필요가 없다.
 */
export function RoomEditDialog({ room, open, onOpenChange }: RoomEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <ConfirmDialog
      isOpen={open}
      onOpenChange={(next) => {
        if (!next && isSubmitting) return;
        onOpenChange(next);
      }}
      title="회의실 정보를 수정할까요?"
      description="바뀐 정보가 예약 화면에 바로 반영됩니다."
      confirmLabel="저장"
      pendingLabel="저장 중"
      isPending={isSubmitting}
      onConfirm={() => formRef.current?.requestSubmit()}
    >
      <RoomForm
        action={updateMeetingRoomAction}
        room={room}
        formRef={formRef}
        onPendingChange={setIsSubmitting}
        onSuccess={() => {
          onOpenChange(false);
          router.refresh();
          toast.success("회의실 정보를 수정했습니다");
        }}
      />
    </ConfirmDialog>
  );
}
