"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { NOTICE_DELETE_CONFIRM } from "@/constants/notice";

import { deleteNoticeAction } from "../actions";

interface NoticeDeleteButtonProps {
  id: string;
  title: string;
}

/**
 * 공지 삭제 — 되돌릴 수 없는 조작이라 공용 `ConfirmDialog`로 확인을 먼저 받는다
 * (CLAUDE.md §토스트: 파괴적 작업은 토스트가 아니라 Dialog로 확인).
 * ⚠️ 확인을 누르면 **서버 액션**(`deleteNoticeAction`)이 실행되고, 성공하면 액션 안 `redirect`가
 *    목록으로 보낸다. 진행 중엔 두 버튼을 모두 잠가 중복 제출을 막는다.
 */
export function NoticeDeleteButton({ id, title }: NoticeDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    const formData = new FormData();
    formData.set("id", id);
    // ⚠️ 콜백이 Promise를 반환해야 한다 — 반환하지 않으면 React가 삭제가 끝나기 전에
    //    전환을 "완료"로 보고 `isPending`이 너무 일찍 꺼져 버튼이 풀린다.
    startTransition(() => deleteNoticeAction(formData));
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={() => setOpen(true)}
        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 aria-hidden />
        삭제
      </Button>

      <ConfirmDialog
        isOpen={open}
        onOpenChange={setOpen}
        title={NOTICE_DELETE_CONFIRM.title(title)}
        description={NOTICE_DELETE_CONFIRM.description}
        confirmLabel={NOTICE_DELETE_CONFIRM.confirmLabel}
        pendingLabel={NOTICE_DELETE_CONFIRM.pendingLabel}
        isDestructive
        isPending={isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
