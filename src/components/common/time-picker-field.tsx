"use client";

import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { ClockIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const VALUE_FORMAT = "HH:mm";
const DISPLAY_FORMAT = "a h:mm";
const MINUTES_IN_DAY = 24 * 60;

function parseValue(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, VALUE_FORMAT, new Date());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function buildOptions(step: number): string[] {
  if (!Number.isInteger(step) || step <= 0) {
    throw new Error(`TimePickerField: step은 양의 정수여야 합니다 (받은 값: ${step})`);
  }

  const options: string[] = [];
  for (let minutes = 0; minutes < MINUTES_IN_DAY; minutes += step) {
    const hour = Math.floor(minutes / 60)
      .toString()
      .padStart(2, "0");
    const minute = (minutes % 60).toString().padStart(2, "0");
    options.push(`${hour}:${minute}`);
  }
  return options;
}

interface TimePickerFieldProps {
  id?: string;
  /** `<form action={formAction}>` 네이티브 제출용 — 넘기면 숨은 `<input>`으로 같이 낸다. */
  name?: string;
  /** `HH:mm`(24시간). 아직 안 골랐으면 빈 문자열. */
  value: string;
  onChange: (value: string) => void;
  /** 목록 간격(분) — 기본 30분. */
  step?: number;
  placeholder?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  disabled?: boolean;
  /** 트리거 버튼에 붙는 클래스 — 표에 나란히 넣을 때 폭을 좁히는 용도. */
  className?: string;
}

/**
 * 시간 하나를 고르는 팝오버 목록 — 네이티브 `<input type="time">` 대체
 * (`date-picker-field.tsx`와 같은 팝오버+먹색 선택 톤을 시간에도 맞춘다).
 * 브라우저마다 다르게 생기는 기본 시간 UI 대신 이 서비스 톤으로 고정된 모습을 쓴다.
 */
export function TimePickerField({
  id,
  name,
  value,
  onChange,
  step = 30,
  placeholder = "시간 선택",
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  disabled,
  className,
}: TimePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const selected = parseValue(value);
  const options = buildOptions(step);

  useEffect(() => {
    if (open) {
      selectedRef.current?.scrollIntoView({ block: "center" });
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* ⚠️ 네이티브 제출용 — 화면엔 안 보이지만 `FormData`엔 `name`으로 잡힌다. */}
      {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={ariaLabel}
            aria-invalid={ariaInvalid}
            className={cn("h-10 justify-start gap-2 font-normal", className)}
          />
        }
      >
        <ClockIcon aria-hidden className="size-4 shrink-0 text-current" />
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? format(selected, DISPLAY_FORMAT, { locale: ko }) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-40 p-1">
        <div
          role="listbox"
          aria-label={ariaLabel ?? placeholder}
          className="max-h-60 overflow-y-auto"
        >
          {options.map((option) => {
            const isSelected = option === value;
            return (
              <button
                key={option}
                ref={isSelected ? selectedRef : undefined}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={cn(
                  "hover:bg-muted flex w-full items-center rounded-md px-2 py-1.5 text-left text-[13px] leading-5 tabular-nums",
                  isSelected && "bg-foreground text-background hover:bg-foreground",
                )}
              >
                {format(parseValue(option) ?? new Date(), DISPLAY_FORMAT, { locale: ko })}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
