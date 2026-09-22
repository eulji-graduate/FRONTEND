"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import type { NoticeFormState } from "../actions";
import type { Notice } from "../types";
import { NoticeFormFields } from "./notice-form-fields";
import { useNoticeForm } from "./use-notice-form";

interface DialogActionsProps {
  onCancel: () => void;
  /** 발행/수정 클릭 — 여기서 바로 제출하지 않고 확인 모달을 먼저 띄운다. */
  onRequestSubmit: () => void;
  submitLabel: string;
  disabled: boolean;
}

/**
 * 취소·제출 버튼 — `useFormStatus`는 `<form>`의 **자손** 컴포넌트에서만 호출할 수 있어서
 * `NoticeFormDialog`(그 `<form>`을 직접 그리는 컴포넌트) 안이 아니라 여기로 뺐다
 * (`room-reservation-dialog.tsx`의 `DialogActions`와 같은 이유).
 * ⚠️ 제출 버튼은 `type="submit"`이 아니다 — 눌러도 바로 제출하지 않고 확인 모달을 먼저
 *    띄운다. 실제 제출은 확인 모달의 [발행]/[수정]에서 `form.requestSubmit()`으로 한다.
 */
function DialogActions({ onCancel, onRequestSubmit, submitLabel, disabled }: DialogActionsProps) {
  const { pending } = useFormStatus();

  return (
    <div className="flex shrink-0 gap-2">
      <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
        취소
      </Button>
      <Button type="button" variant="ink" disabled={pending || disabled} onClick={onRequestSubmit}>
        {submitLabel}
      </Button>
    </div>
  );
}

interface PendingReporterProps {
  /** ⚠️ 참조가 고정돼야 한다 — 매 렌더 새 함수면 아래 effect가 매번 돈다. */
  onChange: (pending: boolean) => void;
}

/**
 * 제출 중인지를 **창**(`NoticeFormDialog`)에 올려 보낸다. `useFormStatus`는 `<form>`의
 * 자손에서만 읽을 수 있는데, 창을 닫아도 되는지 판단하는 `Dialog`의 `onOpenChange`는
 * `<form>` 바깥(그 `<form>`을 그리는 조상)에 있다 — 그래서 렌더 없이 값만 부모로
 * 올려 보내는 자리가 하나 더 필요하다.
 */
function PendingReporter({ onChange }: PendingReporterProps) {
  const { pending } = useFormStatus();

  useEffect(() => {
    onChange(pending);
  }, [pending, onChange]);

  return null;
}

interface NoticeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: (prev: NoticeFormState, formData: FormData) => Promise<NoticeFormState>;
  /** 수정일 때만 — 기존 값 채우기 + id 전달 */
  notice?: Notice;
  /** 창을 처음 열었을 때 머리에 얹는 제목 — "공지 발행"/"공지 수정" */
  formTitle: string;
  /** [발행]/[수정]을 누른 뒤 한 번 더 묻는 확인 창 제목 — "공지를 올릴까요?" 꼴 */
  confirmTitle: string;
  confirmDescription: string;
  submitLabel: string;
  pendingLabel: string;
  successToast: () => string;
}

/**
 * 공지 작성·수정 모달의 공통 뼈대 — `NoticeCreateDialog`·`NoticeEditDialog`가 액션·라벨만
 * 갈아 끼워 쓴다.
 *
 * ⚠️ **`ConfirmDialog`를 폼 창으로 안 쓴다**(2026-08-12 정리). 그 창은 폭이 420 하나로
 *    고정돼 있어(팀 합의) 마크다운 에디터처럼 넓게 써야 하는 화면엔 안 맞는다 — 회의실
 *    예약 모달(`room-reservation-dialog.tsx`)과 같은 이유로 순수 `Dialog`를 직접 조립하고,
 *    발행/수정 확인은 그 위에 `ConfirmDialog`를 한 겹 더 얹는 **2단계 구조**로 뗀다.
 * ⚠️ **제목~툴바는 고정, 본문만 스크롤한다**(2026-08-12). 창 전체를 스크롤시키면 스크롤
 *    한참 내려간 자리에서 서식 버튼을 눌러야 하는 경우가 생긴다 — 스크롤 경계는
 *    `MarkdownEditor` 내부(본문 칸)에만 둔다.
 */
export function NoticeFormDialog({
  open,
  onOpenChange,
  action,
  notice,
  formTitle,
  confirmTitle,
  confirmDescription,
  submitLabel,
  pendingLabel,
  successToast,
}: NoticeFormDialogProps) {
  const router = useRouter();
  const { state, formAction, title, setTitle, body, setBody } = useNoticeForm({
    action,
    notice,
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
      toast.success(successToast());
    },
  });

  const [isPending, setIsPending] = useState(false);
  // ⚠️ `PendingReporter`의 effect 의존성이라 참조를 고정한다 — 안 그러면 매 렌더 다시 돈다.
  const handlePendingChange = useCallback((next: boolean) => setIsPending(next), []);

  const formRef = useRef<HTMLFormElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  /**
   * ⚠️ [발행]/[수정]은 `type="button"`이라 클릭으로는 절대 제출이 안 걸리지만, 제목·본문
   *    둘 다 텍스트 입력이라 Enter로도 원래 잘 안 제출된다(HTML 암시적 제출 규칙 — 텍스트류
   *    입력이 둘 이상이면 브라우저가 자동 제출하지 않는다). 그 규칙은 **입력칸 개수에
   *    의존하는 우연**이라, `onSubmit`에서 한 번 더 막아 "확인 모달을 거쳤을 때만 진짜
   *    제출"을 필드 구성과 무관하게 보장한다(`room-reservation-dialog.tsx`와 같은 이유).
   */
  const confirmedSubmitRef = useRef(false);

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirmedSubmitRef.current) {
      confirmedSubmitRef.current = false;
      return;
    }
    event.preventDefault();
    setShowConfirm(true);
  }

  const canSubmit = title.trim().length > 0 && body.trim().length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // ⚠️ 제출 중엔 X 버튼·Esc·바깥 클릭 전부 막는다 — 요청은 계속 가는데 창만 사라지면
        //    결과를 못 본다.
        if (!next && isPending) return;
        onOpenChange(next);
      }}
    >
      {/*
        ⚠️ **뷰포트의 70%다**(2026-08-12 확정). 에디터가 서식 버튼·긴 글을 들고 있어 기존
           확인 창 폭(420)으로는 답답했다 — 넓은 화면일수록 창도 넓어져야 한다.
      */}
      <DialogContent className="flex max-h-[calc(100dvh-4rem)] flex-col gap-0 overflow-y-auto p-0 sm:max-w-[70vw]">
        <DialogHeader className="border-border shrink-0 border-b px-6 py-4">
          <DialogTitle>{formTitle}</DialogTitle>
        </DialogHeader>

        <form
          ref={formRef}
          action={formAction}
          onSubmit={handleFormSubmit}
          className="flex flex-col"
        >
          <PendingReporter onChange={handlePendingChange} />
          {notice && <input type="hidden" name="id" value={notice.id} />}

          {/*
            ⚠️ **여기는 스크롤 안 한다**(2026-08-12). 제목 칸·"내용" 라벨·서식 툴바는 항상
               보이는 자리에 고정하고, 글이 길어지면 `MarkdownEditor` 안쪽(본문 칸)만 스크롤
               된다 — 스크롤을 여기다 걸면 두 겹 스크롤이 생겨 툴바가 위로 밀려 사라진다.
          */}
          <div className="flex flex-col gap-4 px-6 py-4">
            <NoticeFormFields
              title={title}
              onTitleChange={setTitle}
              body={body}
              onBodyChange={setBody}
              errors={state.errors}
            />
          </div>

          <div className="border-border flex shrink-0 items-center justify-end gap-4 border-t px-6 py-4">
            <DialogActions
              onCancel={() => onOpenChange(false)}
              onRequestSubmit={() => setShowConfirm(true)}
              submitLabel={submitLabel}
              disabled={!canSubmit}
            />
          </div>
        </form>
      </DialogContent>

      <ConfirmDialog
        isOpen={showConfirm}
        onOpenChange={setShowConfirm}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={submitLabel}
        pendingLabel={pendingLabel}
        isPending={isPending}
        onConfirm={() => {
          setShowConfirm(false);
          confirmedSubmitRef.current = true;
          formRef.current?.requestSubmit();
        }}
      />
    </Dialog>
  );
}
