"use client";

import { format } from "date-fns";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { createRoomReservationAction, type RoomReservationFormState } from "../actions";
import type { MeetingTopicInput, RoomReservation } from "../types";

const INITIAL_STATE: RoomReservationFormState = { errors: {} };

const EMPTY_TOPIC: MeetingTopicInput = { main: "", sub: "" };

const EMPTY_FORM = {
  title: "",
  roomId: "",
  /** "YYYY-MM-DD" — `slotStart`가 여는 값을 시작값 삼아 `DatePickerField`가 고친다. */
  date: "",
  /** "HH:mm" — 위와 같다, `TimePickerField`가 고친다. */
  startTime: "",
  projectId: "",
  topics: [EMPTY_TOPIC] as MeetingTopicInput[],
  attendeeIds: [] as number[],
  /** Select 값은 문자열이라 여기서도 문자열로 든다 — 없으면 빈 문자열("Owner 개설"이거나 아직 안 골랐을 때). */
  parentTeamActionId: "",
};

export type RoomReservationFormValues = typeof EMPTY_FORM;

/** `EMPTY_FORM`에 `slotStart`(초기 제안)의 날짜·시작 시각만 얹는다 — 없으면 그대로 빈 값이다. */
function toInitialForm(slotStart: Date | null): RoomReservationFormValues {
  if (!slotStart) return EMPTY_FORM;
  return {
    ...EMPTY_FORM,
    date: format(slotStart, "yyyy-MM-dd"),
    startTime: format(slotStart, "HH:mm"),
  };
}

interface UseRoomReservationFormOptions {
  slotStart: Date | null;
  onCreated: (created: RoomReservation) => void;
  onOpenChange: (open: boolean) => void;
}

/**
 * 예약 모달의 폼 상태·제출 흐름 — `RoomReservationDialog`를 200줄 아래로 유지하려고 뺐다
 * (CLAUDE.md §폴더·네이밍: 로직=커스텀훅).
 * ⚠️ 실제 `<form action={formAction}>`으로 제출한다(`notice-form.tsx`와 같은 패턴) — shadcn
 *    `Select`·`RoomPickerList`처럼 네이티브 입력이 아닌 위젯은 `RoomReservationDialog`가 hidden
 *    input으로 값을 따로 실어 보낸다. `title`·참석자 체크박스·안건 입력은 전부 진짜 네이티브
 *    입력이라 `name`만 있으면 된다 — 여기서 `FormData`를 직접 만들지 않는다.
 */
export function useRoomReservationForm({
  slotStart,
  onCreated,
  onOpenChange,
}: UseRoomReservationFormOptions) {
  const [state, formAction] = useActionState(createRoomReservationAction, INITIAL_STATE);
  const [form, setForm] = useState<RoomReservationFormValues>(() => toInitialForm(slotStart));
  const handledCreatedId = useRef<string | null>(null);

  /*
    ⚠️ **`slotStart`는 이제 "초기 제안"일 뿐이다**(2026-08-14 — 예전엔 이 값이 곧 제출값이라
       모달에 날짜·시간을 고칠 자리가 없었다). 캘린더 빈 칸 클릭이든 [회의 추가] 버튼의
       추측값(`getNextAvailableSlot`)이든, 모달을 여는 순간의 값으로 `form.date`·`form.startTime`을
       한 번 채워 넣고(첫 마운트는 `useState`의 lazy initializer가, 이 창이 열린 채로
       `slotStart`가 다시 바뀌는 드문 경우는 아래가 맡는다), 그 뒤로는 `DatePickerField`·
       `TimePickerField`가 독립적으로 고친다.
    ⚠️ **`useEffect`가 아니라 렌더 중에 갱신한다**(React "Adjusting state when a prop changes"
       패턴) — 이펙트 안에서 곧장 `setState`를 부르면 린트가 막는다(react-hooks/set-state-in-effect,
       불필요한 리렌더 한 번을 더 만든다). `prevSlotStart`로 "그새 바뀌었는지"만 렌더 중에 비교한다.
  */
  const [prevSlotStart, setPrevSlotStart] = useState(slotStart);
  if (slotStart !== prevSlotStart) {
    setPrevSlotStart(slotStart);
    if (slotStart) {
      setForm((prev) => ({
        ...prev,
        date: format(slotStart, "yyyy-MM-dd"),
        startTime: format(slotStart, "HH:mm"),
      }));
    }
  }

  useEffect(() => {
    if (state.created && state.created.id !== handledCreatedId.current) {
      handledCreatedId.current = state.created.id;
      onCreated(state.created);
      onOpenChange(false);
      setForm(EMPTY_FORM);
      toast.success("회의실을 예약했습니다");
    }
  }, [state.created, onCreated, onOpenChange]);

  function handleOpenChange(open: boolean) {
    if (!open) setForm(EMPTY_FORM);
    onOpenChange(open);
  }

  return {
    state,
    formAction,
    form,
    setForm,
    handleOpenChange,
    slotStart,
  };
}
