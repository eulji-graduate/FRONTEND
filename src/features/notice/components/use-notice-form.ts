"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import type { NoticeFormState } from "../actions";
import type { Notice } from "../types";

interface UseNoticeFormOptions {
  /** 작성이면 `createNoticeAction`, 수정이면 `updateNoticeAction` */
  action: (prev: NoticeFormState, formData: FormData) => Promise<NoticeFormState>;
  /** 수정일 때만 — 기존 값 채우기 */
  notice?: Notice;
  /** 성공 시 호출 — 생성/수정된 공지를 그대로 받는다 */
  onSuccess: (notice: Notice) => void;
}

/**
 * 공지 작성·수정 폼 상태 — 창(`NoticeFormDialog`)을 200줄 아래로 유지하려고 뺐다
 * (CLAUDE.md §폴더·네이밍: 로직=커스텀훅, `use-room-reservation-form.ts`와 같은 이유).
 */
export function useNoticeForm({ action, notice, onSuccess }: UseNoticeFormOptions) {
  const [state, formAction] = useActionState<NoticeFormState, FormData>(action, { errors: {} });
  const [title, setTitle] = useState(notice?.title ?? "");
  const [body, setBody] = useState(notice?.body ?? "");
  const handledNoticeId = useRef<string | null>(null);

  useEffect(() => {
    if (state.notice && state.notice.id !== handledNoticeId.current) {
      handledNoticeId.current = state.notice.id;
      onSuccess(state.notice);
    }
  }, [state.notice, onSuccess]);

  return { state, formAction, title, setTitle, body, setBody };
}
