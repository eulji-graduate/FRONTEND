"use client";

import dynamic from "next/dynamic";

import { FieldError } from "@/components/common/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { NoticeFormErrors } from "../types";

/**
 * Tiptap(+ProseMirror)은 무겁다 — 모달을 열기 전까지는 받지 않는다(§성능: 무거운 건
 * `next/dynamic`). `ssr:false`인 이유는 SSR 필요가 없어서가 아니라, 에디터 자체가
 * 마운트 즉시 클라이언트 DOM에 붙는 컴포넌트라 서버에서 그릴 것이 없기 때문이다.
 */
const MarkdownEditor = dynamic(
  () => import("@/components/common/markdown-editor").then((mod) => mod.MarkdownEditor),
  {
    ssr: false,
    loading: () => (
      <div className="border-input min-h-[364px] w-full animate-pulse rounded-lg border bg-transparent" />
    ),
  },
);

interface NoticeFormFieldsProps {
  title: string;
  onTitleChange: (value: string) => void;
  body: string;
  onBodyChange: (value: string) => void;
  errors: NoticeFormErrors;
}

/**
 * 공지 제목·내용 입력칸 — `NoticeFormDialog`의 `<form>` 안에서 쓴다(폼 자체는 이 컴포넌트가
 * 아니라 창이 그린다, `RoomReservationFields`와 같은 분리).
 * ⚠️ **제목 칸은 이 컴포넌트 안에서 끝나고, 내용 칸(에디터)만 안에서 스크롤한다** — 창이
 *    "제목~툴바는 고정, 본문만 스크롤"을 요구해서 스크롤 경계를 `MarkdownEditor` 내부에 둔다.
 */
export function NoticeFormFields({
  title,
  onTitleChange,
  body,
  onBodyChange,
  errors,
}: NoticeFormFieldsProps) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notice-title">제목</Label>
        <Input
          id="notice-title"
          name="title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="공지 제목"
          aria-invalid={Boolean(errors.title)}
          aria-describedby="notice-title-error"
        />
        {/*
          ⚠️ 오류에 **id를 주고 칸이 가리키게** 한다. `role="alert"`은 오류가 뜨는 그 순간만
             읽어 줘서, 나중에 칸으로 돌아온 사람은 무엇이 잘못됐는지 다시 들을 방법이 없다.
        */}
        <FieldError reserveSpace id="notice-title-error" message={errors.title} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notice-body">내용</Label>
        {/*
          ⚠️ 저장·전송 값은 마크다운 평문이다 — 에디터는 보이는 문서를 그리지만
             `onChange`가 받는 값은 항상 `MarkdownEditor`가 직렬화한 마크다운 문자열이다.
             `name="body"`가 붙은 숨은 입력이 그 문자열을 그대로 `FormData`에 실어 보낸다.
        */}
        <input type="hidden" name="body" value={body} />
        <MarkdownEditor
          id="notice-body"
          value={body}
          onChange={onBodyChange}
          placeholder="공지 내용을 입력해 주세요"
          ariaInvalid={Boolean(errors.body)}
          ariaDescribedBy="notice-body-error"
        />
        <FieldError reserveSpace id="notice-body-error" message={errors.body} />
      </div>
    </>
  );
}
