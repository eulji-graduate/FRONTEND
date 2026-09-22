"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { NOTICE_ACTION, NOTICE_ACTION_LABEL } from "@/constants/notice";

import { createNoticeAction } from "../actions";
import { NoticeFormDialog } from "./notice-form-dialog";

const LABEL = NOTICE_ACTION_LABEL[NOTICE_ACTION.CREATE];

/**
 * "새 공지" 트리거 + 작성 모달 — 페이지(`/app/notice/new`) 대신 모달로 연다
 * (`add-todo-dialog.tsx`와 같은 패턴, 전용 라우트를 두지 않는다).
 * 모달 뼈대·2단계 확인 흐름은 `NoticeFormDialog`(create·edit 공용)가 맡는다.
 */
export function NoticeCreateDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="sm" variant="ink" onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        {LABEL.trigger}
      </Button>

      <NoticeFormDialog
        open={open}
        onOpenChange={setOpen}
        action={createNoticeAction}
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
