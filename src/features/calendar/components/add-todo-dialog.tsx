"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon, Plus } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FieldError } from "@/components/common/field-error";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { createPersonalTodoAction, type PersonalTodoFormState } from "../actions";
import type { PersonalCalendarEvent } from "../types";
import { PERSONAL_TODO_TITLE_MAX } from "../validate";

interface AddTodoDialogProps {
  /** 지금 오른쪽 상세조회 패널이 보고 있는 날짜 — 모달을 열 때 이 날짜로 기본값을 맞춘다. */
  defaultDate: Date;
  /** 생성 성공 시 호출 — 재조회 없이 부모 화면에 바로 얹는다(§최적화: action 리턴값 그대로 반영). */
  onCreated: (created: PersonalCalendarEvent) => void;
}

const DATE_FORMAT = "yyyy-MM-dd";

const INITIAL_STATE: PersonalTodoFormState = { errors: {} };

/**
 * 개인 Todo 추가 — `ConfirmDialog`와 같은 모양(표식 → 제목 → 설명 → 버튼)으로 간다.
 * ⚠️ 색상 선택 입력은 두지 않는다 — 색은 팀 디자인 컨벤션으로 하드코딩한다(2026-08-05 확정).
 * ⚠️ 성공하면 `revalidatePath`는 백그라운드 정합성용이고, 화면은 action이 돌려준 `created`를
 *    바로 로컬에 얹어 즉시 반영한다(§최적화).
 * ⚠️ `ConfirmDialog`엔 `<form>`이 없다 — 확인 버튼 클릭 시 `formAction`을 직접 호출해 넘긴다.
 */
export function AddTodoDialog({ defaultDate, onCreated }: AddTodoDialogProps) {
  const [open, setOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [endDatePopoverOpen, setEndDatePopoverOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createPersonalTodoAction, INITIAL_STATE);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date>(defaultDate);
  const [endDate, setEndDate] = useState<Date>(defaultDate);
  const handledCreatedId = useRef<string | null>(null);

  useEffect(() => {
    if (state.created && state.created.id !== handledCreatedId.current) {
      handledCreatedId.current = state.created.id;
      onCreated(state.created);
      setOpen(false);
      setTitle("");
      toast.success("Todo를 추가했습니다");
    }
  }, [state.created, onCreated]);

  function handleOpen() {
    // 모달을 열 때마다 지금 상세조회 중인 날짜로 다시 맞춘다 — 며칠 전에 열었던 값이 남아있지 않게.
    setDate(defaultDate);
    setEndDate(defaultDate);
    setOpen(true);
  }

  function handleConfirm() {
    const formData = new FormData();
    formData.set("title", title);
    formData.set("date", format(date, DATE_FORMAT));
    formData.set("endDate", format(endDate, DATE_FORMAT));
    /*
      ⚠️ `startTransition`으로 감싼다. `ConfirmDialog`엔 `<form>`이 없어 버튼 클릭에서
         직접 부르는데, `useActionState`의 액션을 트랜지션 밖에서 부르면 React가
         **`isPending`을 갱신하지 않는다** — 버튼이 "추가 중"으로 안 바뀌고 두 번 눌린다.
    */
    startTransition(() => formAction(formData));
  }

  return (
    <>
      {/*
        ⚠️ **일정 카드 머리**에 산다(`calendar-day-detail-panel.tsx`). 달력 툴바에 있을 때는
           "어느 날짜에 추가되는지"가 안 보였다 — 고른 날짜를 보여주는 카드 안에 있어야
           그 날짜에 붙는 일이라는 게 드러난다.
        ⚠️ 카드 머리의 곁들이라 작게 둔다 — 이 카드의 주인공은 그날의 일정 목록이다.
      */}
      <Button
        type="button"
        variant="outline"
        onClick={handleOpen}
        className="h-7 shrink-0 gap-1 px-2.5 text-[11px] leading-4"
      >
        <Plus className="size-3.5" aria-hidden />
        <span>Todo</span>
      </Button>

      <ConfirmDialog
        isOpen={open}
        onOpenChange={setOpen}
        title="Todo를 추가할까요?"
        description="추가하면 캘린더에 바로 표시됩니다."
        confirmLabel="추가"
        pendingLabel="추가 중"
        isPending={isPending}
        onConfirm={handleConfirm}
      >
        <div className="flex flex-col gap-5 text-left">
          <div className="flex flex-col gap-1.5">
            {/*
              ⚠️ 길이를 **적어 둔다.** 상세 화면이 없어 제목 줄이 전부라 20자에서 끊는데
                 (`validate.ts`), 한도를 안 보여주면 치다가 갑자기 안 써지는 것으로 보인다.
            */}
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="todo-title">제목</Label>
              <span className="text-muted-foreground text-[11px] leading-4 tabular-nums">
                {title.length}/{PERSONAL_TODO_TITLE_MAX}
              </span>
            </div>
            <Input
              id="todo-title"
              name="title"
              value={title}
              maxLength={PERSONAL_TODO_TITLE_MAX}
              /*
                ⚠️ `maxLength`만으로는 **한글에서 한 자가 더 들어간다.** IME 조합 중인 글자는
                   브라우저가 길이 제한을 안 걸어서, 조합이 끝나는 순간 한 자가 더 들어간다 —
                   받은 값을 여기서 한 번 더 자른다.
              */
              onChange={(event) => setTitle(event.target.value.slice(0, PERSONAL_TODO_TITLE_MAX))}
              placeholder="할 일을 입력해 주세요"
              aria-invalid={Boolean(state.errors.title)}
            />
            {/* 폼 검증 오류는 **필드 인라인**이다(DESIGN §7) — 토스트로 띄우지 않는다 */}
            <FieldError reserveSpace message={state.errors.title} />
          </div>

          {/* ⚠️ 시작일·마감일을 좌우로 나란히 둔다 — 위아래로 쌓으면 두 날짜가 한 범위라는 게 잘 안 읽힌다. */}
          <div className="flex gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="todo-date">시작일</Label>
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      id="todo-date"
                      type="button"
                      variant="outline"
                      className="h-10 w-full min-w-0 justify-start gap-1.5 px-2.5 font-normal"
                    />
                  }
                >
                  {/* ⚠️ 아이콘과 글자를 **같은 색**으로 — 아이콘만 흐리면 한 버튼이 두 톤으로 갈린다 */}
                  <CalendarIcon aria-hidden className="size-4 shrink-0 text-current" />
                  {/* ⚠️ 420px 모달의 좌우 절반 폭에 맞춰 연도는 뺀다 — 넣으면 줄바꿈 없이 넘친다 */}
                  <span className="truncate">{format(date, "M월 d일(EEE)", { locale: ko })}</span>
                </PopoverTrigger>
                {/*
                  ⚠️ 달력은 **넉넉하게** 편다. 기본 셀(28px)로는 날짜를 손으로 짚기 어렵고
                     눌러야 할 것이 빽빽해 보인다 — 고르는 게 이 창의 일이다.
                */}
                <PopoverContent align="start" className="w-auto p-3 [--cell-size:--spacing(9)]">
                  {/*
                    ⚠️ 고른 날짜를 **먹색**으로 칠한다. 공용 `Calendar`의 기본은 `--primary`(파랑)인데,
                       이 서비스의 주 버튼·선택 색은 먹색이고 파랑은 링크·강조용이다(DESIGN §5).
                       다크에서도 `--foreground`/`--background`가 함께 뒤집혀 대비가 유지된다.
                  */}
                  <Calendar
                    className="[&_[data-selected-single=true]]:bg-foreground [&_[data-selected-single=true]]:text-background [&_[data-selected-single=true]]:hover:bg-foreground"
                    mode="single"
                    locale={ko}
                    selected={date}
                    onSelect={(selected) => {
                      if (!selected) return;
                      setDate(selected);
                      // ⚠️ 끝 날짜가 시작보다 앞서게 되면 시작 날짜로 같이 밀어둔다 — 범위가 뒤집힌 채로 남지 않게.
                      if (endDate < selected) setEndDate(selected);
                      setDatePopoverOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
              <FieldError reserveSpace message={state.errors.date} />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="todo-end-date">마감일</Label>
              <Popover open={endDatePopoverOpen} onOpenChange={setEndDatePopoverOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      id="todo-end-date"
                      type="button"
                      variant="outline"
                      className="h-10 w-full min-w-0 justify-start gap-1.5 px-2.5 font-normal"
                    />
                  }
                >
                  <CalendarIcon aria-hidden className="size-4 shrink-0 text-current" />
                  <span className="truncate">
                    {format(endDate, "M월 d일(EEE)", { locale: ko })}
                  </span>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-3 [--cell-size:--spacing(9)]">
                  <Calendar
                    className="[&_[data-selected-single=true]]:bg-foreground [&_[data-selected-single=true]]:text-background [&_[data-selected-single=true]]:hover:bg-foreground"
                    mode="single"
                    locale={ko}
                    selected={endDate}
                    // 시작 날짜 이전은 고를 수 없다 — 범위가 뒤집히는 입력 자체를 막는다.
                    disabled={{ before: date }}
                    onSelect={(selected) => {
                      if (!selected) return;
                      setEndDate(selected);
                      setEndDatePopoverOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
              <FieldError reserveSpace message={state.errors.endDate} />
            </div>
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
}
