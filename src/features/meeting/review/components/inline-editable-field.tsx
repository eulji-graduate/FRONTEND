"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface InlineEditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** 여러 줄 편집(세부 내용) — 평소엔 한 줄로 말줄임, 클릭하면 textarea로 펼쳐진다. */
  multiline?: boolean;
  /** 빈 값 저장을 허용한다 — 세부 내용처럼 선택 항목일 때만 켠다(액션명은 항상 꺼둔다). */
  allowEmpty?: boolean;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  /**
   * 확정 시도 후 비어 있는 필수 필드 강조 — 빨간 테두리·빨간 placeholder로 눈에 잡히게 한다.
   * ⚠️ 부모(`meeting-review-view`)가 확정 버튼 눌렀는데 값이 비어 있을 때만 true로 넘긴다 —
   *    최초 진입에서는 회색 placeholder만 두고 확정 시도 뒤에야 강조로 승격한다.
   */
  isInvalid?: boolean;
}

/**
 * 클릭하면 그 자리에서 바로 고칠 수 있는 텍스트 — 액션명(한 줄 input)·세부 내용(여러 줄
 * textarea) 둘 다 이걸로 쓴다. 연필 아이콘으로 "눌러서 고칠 수 있다"를 알린다.
 * ⚠️ **`allowEmpty`가 꺼져 있으면** 빈 값으로 저장하지 않는다 — 지우고 포커스를 옮기면
 *    원래 값으로 되돌린다(빈 제목 방지). 세부 내용처럼 선택 항목은 지울 수 있어야 한다.
 */
export function InlineEditableField({
  value,
  onChange,
  multiline,
  allowEmpty,
  ariaLabel,
  placeholder,
  className,
  isInvalid,
}: InlineEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function startEditing() {
    setDraft(value);
    setIsEditing(true);
  }

  function commit() {
    const next = draft.trim();
    onChange(next.length > 0 || allowEmpty ? next : value);
    setIsEditing(false);
  }

  function cancel() {
    setDraft(value);
    setIsEditing(false);
  }

  if (isEditing) {
    if (multiline) {
      return (
        <Textarea
          autoFocus
          aria-label={ariaLabel}
          aria-invalid={isInvalid || undefined}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => event.key === "Escape" && cancel()}
          rows={3}
          className={cn(
            "px-2.5 py-1.5 text-[12px] leading-4",
            isInvalid &&
              "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30",
            className,
          )}
        />
      );
    }
    return (
      <input
        autoFocus
        aria-label={ariaLabel}
        aria-invalid={isInvalid || undefined}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") cancel();
        }}
        className={cn(
          "focus-visible:ring-ring/50 w-full rounded-lg border bg-transparent px-2.5 py-1 text-[13px] leading-5 font-medium outline-none focus-visible:ring-3",
          isInvalid
            ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30"
            : "border-input focus-visible:border-ring",
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      aria-label={`${ariaLabel} 수정`}
      aria-invalid={isInvalid || undefined}
      // ⚠️ `inline-flex`(아니라 `flex`)라서 글자 길이만큼만 넓어진다 — 연필이 칸 오른쪽 끝이
      //    아니라 글자 바로 옆에 붙는다. 넘치면 `max-w-full`이 잘라 `truncate`가 말줄임한다.
      className={cn(
        "group inline-flex max-w-full cursor-pointer items-start gap-1 rounded-md border text-left transition-colors",
        // ⚠️ 확정 시도 전엔 테두리 자체가 없다 — placeholder를 회색 텍스트만으로 표시하다,
        //    확정 시도 후 비어 있으면 빨간 테두리·빨간 안내 텍스트로 승격한다.
        isInvalid ? "border-destructive bg-destructive/5 px-2 py-1" : "border-transparent",
        className,
      )}
    >
      <span
        className={cn(
          "min-w-0 truncate",
          /*
            ⚠️ **이름에 무게를 준다**(2026-08-11). 이름 13px medium과 설명 12px가 한 단 차이라
               훑을 때 둘이 뭉쳐 어느 것이 액션 이름인지 안 잡혔다 — 굵기를 한 단 올리고
               설명은 흐린 채로 둬서 층을 벌린다(§DESIGN 4: 크기는 다섯뿐이라 무게로 가른다).
          */
          multiline
            ? "text-muted-foreground text-[12px] leading-[18px]"
            : "text-[13px] leading-5 font-semibold",
          !value && !isInvalid && "text-muted-foreground/60",
          !value && isInvalid && "text-destructive font-semibold",
        )}
      >
        {value || placeholder}
      </span>
      {/*
        ⚠️ **평소엔 숨긴다**(2026-08-11). 연필이 글자 바로 뒤에 붙어 있어서, 줄마다 이름 길이가
           다른 만큼 아이콘도 제각각인 자리에 떠 **열이 들쭉날쭉**했다 — 자리는 그대로 잡아 두고
           (`opacity`) 커서를 얹거나 키보드로 짚었을 때만 드러낸다. 눌러 고칠 수 있다는 사실은
           `aria-label`이 늘 말한다(§a11y).
      */}
      <Pencil
        className="text-muted-foreground mt-0.5 size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        aria-hidden
      />
    </button>
  );
}
