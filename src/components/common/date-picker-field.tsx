"use client";

import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const VALUE_FORMAT = "yyyy-MM-dd";
/*
  ⚠️ **연도를 안 붙인다**(2026-08-11). 앱의 날짜 표기 정본은 `8월 5일(수)`이고(§카피),
     연도는 결제처럼 계약이 걸린 자리에만 붙인다(`formatFullDate`) — 캘린더 칸만 `2026년`을
     달고 있어서, 한 화면에 날짜가 여럿이면 줄마다 `2026년`이 먼저 읽혔다.
  ⚠️ 어느 해인지는 **달력을 열면** 머리(`2026년 8월`)가 말한다.
*/
const DISPLAY_FORMAT = "M월 d일(EEE)";

function parseValue(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, VALUE_FORMAT, new Date());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

interface DatePickerFieldProps {
  id?: string;
  /** `<form action={formAction}>` 네이티브 제출용 — 넘기면 숨은 `<input>`으로 같이 낸다. */
  name?: string;
  /** `YYYY-MM-DD`. 아직 안 골랐으면 빈 문자열. */
  value: string;
  onChange: (value: string) => void;
  /** `YYYY-MM-DD` — 이 날짜 이전은 고를 수 없다. */
  min?: string;
  /** `YYYY-MM-DD` — 이 날짜 이후는 고를 수 없다. */
  max?: string;
  placeholder?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  disabled?: boolean;
  /** 트리거 버튼에 붙는 클래스 — 표에 나란히 넣을 때 폭을 좁히는 용도. */
  className?: string;
}

/**
 * 날짜 하나를 고르는 팝오버 달력 — 네이티브 `<input type="date">` 대체
 * (2026-08-10 디자인 통일: 캘린더 화면의 Todo 추가 모달과 같은 모양으로 맞춘다,
 * `add-todo-dialog.tsx` 참고). 브라우저마다 다르게 생기는 기본 달력 UI 대신
 * 이 서비스 톤(먹색 선택)으로 고정된 모습을 쓴다.
 * ⚠️ `min`/`max`는 문자열 비교가 아니라 **달력에서 그 범위 밖 날짜를 고를 수 없게** 막는다
 *    — 네이티브 input의 `min`/`max`와 같은 역할이지만 팝오버 안에서 시각적으로도 드러난다.
 */
export function DatePickerField({
  id,
  name,
  value,
  onChange,
  min,
  max,
  placeholder = "날짜 선택",
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  disabled,
  className,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = parseValue(value);
  const minDate = min ? parseValue(min) : undefined;
  const maxDate = max ? parseValue(max) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* ⚠️ 네이티브 제출용 — 화면엔 안 보이지만 `FormData`엔 `name`으로 잡힌다. */}
      {name && <input type="hidden" name={name} value={value} />}
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={ariaLabel}
            aria-invalid={ariaInvalid}
            /*
              ⚠️ **높이는 32다**(2026-08-11). `h-10`(40)이라 옆에 선 입력칸(`Input` 32)·
                 셀렉트(32)보다 혼자 8px 높아, 같은 줄에 두면 키가 안 맞았다 —
                 폼 조작의 키는 앱 전체가 하나다.
            */
            className={cn("h-8 justify-start gap-2 font-normal", className)}
          />
        }
      >
        <CalendarIcon aria-hidden className="size-4 shrink-0 text-current" />
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? format(selected, DISPLAY_FORMAT, { locale: ko }) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3 [--cell-size:--spacing(9)]">
        <Calendar
          className="[&_[data-selected-single=true]]:bg-foreground [&_[data-selected-single=true]]:text-background [&_[data-selected-single=true]]:hover:bg-foreground"
          mode="single"
          locale={ko}
          selected={selected}
          disabled={[minDate && { before: minDate }, maxDate && { after: maxDate }].filter(
            (matcher) => matcher !== undefined,
          )}
          onSelect={(next) => {
            if (!next) return;
            onChange(format(next, VALUE_FORMAT));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
