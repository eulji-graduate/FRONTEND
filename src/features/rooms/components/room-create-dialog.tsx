"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";

import { createMeetingRoomAction } from "../actions";
import { RoomForm } from "./room-form";

/**
 * "회의실 추가" 트리거 + 추가 모달 — 전용 라우트 대신 모달로 연다(`notice-create-dialog.tsx`와 같은 패턴).
 *
 * ⚠️ **`ConfirmDialog`를 쓴다**(2026-08-08 정리). 창마다 폭이 갈렸고(420·480·640·720) 설명이 없어
 *    스크린리더가 제목만 읽었다 — 실행 버튼은 창이 그리고, 폼은 `requestSubmit()`으로 제출된다.
 * ⚠️ 목록(`rooms-manage-table.tsx`)은 서버 컴포넌트라 성공 뒤 `router.refresh()`로 다시 받아온다
 *    (`revalidatePath`가 이미 캐시를 무효화해 뒀다).
 */
export function RoomCreateDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <>
      <Button type="button" size="sm" variant="ink" onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        회의실 추가
      </Button>

      <ConfirmDialog
        isOpen={open}
        onOpenChange={(next) => {
          // ⚠️ 제출 중엔 Esc·바깥 클릭으로 안 닫는다 — 요청은 계속 가는데 화면만 사라지면 결과를 못 본다
          if (!next && isSubmitting) return;
          setOpen(next);
        }}
        title="회의실을 추가할까요?"
        description="추가하면 예약 화면에 바로 나타납니다."
        confirmLabel="추가"
        pendingLabel="추가 중"
        isPending={isSubmitting}
        onConfirm={() => formRef.current?.requestSubmit()}
      >
        <RoomForm
          action={createMeetingRoomAction}
          formRef={formRef}
          onPendingChange={setIsSubmitting}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
            toast.success("회의실을 추가했습니다");
          }}
        />
      </ConfirmDialog>
    </>
  );
}
