"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";

import { deleteMeetingRoomAction } from "../actions";
import { ROOM_DELETE_CONFIRM } from "../constants";
import type { MeetingRoom } from "../types";

interface RoomDeleteDialogProps {
  room: MeetingRoom;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 삭제 확인 모달 — 트리거는 표 행의 "⋯" 메뉴(`room-row-actions.tsx`)에 있다.
 * ⚠️ `notice-delete-button.tsx`와 같은 골격(`useTransition` + 서버 액션 직접 호출) — 다만
 *    삭제 뒤 같은 화면에 머무르므로 `redirect` 대신 `router.refresh()`로 목록을 다시 받아온다.
 */
export function RoomDeleteDialog({ room, open, onOpenChange }: RoomDeleteDialogProps) {
  const [isPending, startTransition] = useTransition();
  /*
    ⚠️ 실패는 **창 안에** 남긴다. 토스트는 몇 초 뒤 사라지는데 확인 창은 그대로 떠 있어서,
       뒤늦게 본 사람은 아무 일도 안 일어난 줄 알고 같은 [삭제]를 다시 누른다
       (`ConfirmDialog`의 `error`가 있는 이유다).
  */
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleConfirm() {
    setError(null);
    const formData = new FormData();
    formData.set("id", room.id);
    // ⚠️ 콜백이 Promise를 반환해야 한다 — 반환하지 않으면 React가 삭제가 끝나기 전에
    //    전환을 "완료"로 보고 `isPending`이 너무 일찍 꺼져 버튼이 풀린다.
    startTransition(async () => {
      /*
        ⚠️ **실패를 삼키지 않는다**(2026-08-12). 전에는 결과를 안 보고 곧장 창을 닫고
           "삭제했습니다"를 띄웠다 — 액션이 던지면(미연동·네트워크 단절) 지워지지도 않았는데
           지웠다고 말하거나 화면이 통째로 죽었다(§정직성).
      */
      try {
        await deleteMeetingRoomAction(formData);
      } catch {
        /*
          ⚠️ **원인을 단정하지 않는다**(적대적 리뷰 2026-08-12). 이 액션은 권한 없음·미연동도
             전부 `throw`로 알린다 — "연결하지 못했습니다"라고 적으면 서버는 멀쩡한데 사람은
             될 리 없는 재시도를 반복한다(§정직성).
        */
        setError("회의실을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      onOpenChange(false);
      router.refresh();
      toast.success("회의실을 삭제했습니다");
    });
  }

  return (
    <ConfirmDialog
      isOpen={open}
      onOpenChange={(next) => {
        if (!next && isPending) return;
        onOpenChange(next);
      }}
      title={ROOM_DELETE_CONFIRM.title(room.name)}
      description={ROOM_DELETE_CONFIRM.description}
      confirmLabel={ROOM_DELETE_CONFIRM.confirmLabel}
      pendingLabel={ROOM_DELETE_CONFIRM.pendingLabel}
      isDestructive
      isPending={isPending}
      error={error}
      onConfirm={handleConfirm}
    />
  );
}
