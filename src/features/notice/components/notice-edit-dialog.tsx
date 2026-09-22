"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { NOTICE_ACTION, NOTICE_ACTION_LABEL } from "@/constants/notice";

import { updateNoticeAction } from "../actions";
import type { Notice } from "../types";
import { NoticeFormDialog } from "./notice-form-dialog";

const LABEL = NOTICE_ACTION_LABEL[NOTICE_ACTION.EDIT];

interface NoticeEditDialogProps {
  /** 상세 페이지가 이미 서버에서 받아 온 값 — 모달을 위해 다시 조회하지 않는다 */
  notice: Notice;
}

/**
 * "수정" 트리거 + 수정 모달 — 페이지(`/app/notice/:id/edit`) 대신 모달로 연다.
 * 모달 뼈대·2단계 확인 흐름은 `NoticeFormDialog`(create·edit 공용)가 맡는다.
 * ⚠️ 상세 화면(`notice-detail.tsx`)은 서버 컴포넌트라 자동으로 다시 그려지지 않는다 — 성공하면
 *    `router.refresh()`로 최신 값을 다시 받아온다(`revalidatePath`가 이미 캐시를 무효화해 뒀다).
 */
export function NoticeEditDialog({ notice }: NoticeEditDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="xs" onClick={() => setOpen(true)}>
        <Pencil aria-hidden />
        {LABEL.trigger}
      </Button>

      <NoticeFormDialog
        open={open}
        onOpenChange={setOpen}
        action={updateNoticeAction}
        notice={notice}
        formTitle={LABEL.formTitle}
        confirmTitle={LABEL.dialogTitle}
        confirmDescription={LABEL.dialogDescription}
        submitLabel={LABEL.submitLabel}
        pendingLabel={LABEL.pendingLabel}
        successToast={LABEL.successToast}
      />
    </>
  );
}
