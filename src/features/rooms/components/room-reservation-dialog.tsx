"use client";

import { Bell } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DatePickerField } from "@/components/common/date-picker-field";
import { FieldError } from "@/components/common/field-error";
import { TimePickerField } from "@/components/common/time-picker-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import type { AttendeeScopeViewer } from "../attendee-scope";
import { RESERVATION_DURATION_MINUTES } from "../constants";
import type {
  MeetingRoom,
  RoomMember,
  RoomProjectOption,
  RoomReservation,
  RoomTeamActionOption,
} from "../types";
import { RoomAttendeePicker } from "./room-attendee-picker";
import { RoomReservationFields } from "./room-reservation-fields";
import { useRoomReservationForm } from "./use-room-reservation-form";

interface RoomReservationDialogProps {
  /**
   * 캘린더 빈 칸 클릭 또는 [회의 추가] 버튼이 여는 **초기 제안** — null이면 닫힌 상태다.
   * ⚠️ 더 이상 고정값이 아니다(2026-08-14) — 열릴 때 `form.date`·`form.startTime`의 시작값으로만
   *    쓰이고, 그 뒤로는 아래 날짜·시간 피커가 독립적으로 값을 바꾼다. 종료 시각은 여전히
   *    입력받지 않는다 — 예약은 **30분 한 타임 고정**이라(CLAUDE.md §브라우저 API) 시작 시각만
   *    고르면 길이는 서버가 계산한다.
   */
  slotStart: Date | null;
  onOpenChange: (open: boolean) => void;
  rooms: MeetingRoom[];
  members: RoomMember[];
  projects: RoomProjectOption[];
  /** "상위 팀 액션" 필드를 보여줄지 — `page.tsx`(서버 컴포넌트)가 `requiresParentTeamAction`으로
   *  미리 계산해 내려준다. `lib/permission.ts`는 `server-only`라 이 클라이언트 컴포넌트에서
   *  직접 못 부른다. */
  showParentTeamAction: boolean;
  teamActions: RoomTeamActionOption[];
  /** 참석자 범위(Owner=팀장만 / Leader·Member=자기 팀만) 기준 — `RoomAttendeePicker`로
   *  그대로 흘려보낸다(`attendee-scope.ts`, 2026-08-13 확정). */
  viewer: AttendeeScopeViewer;
  /** 생성 성공 시 호출 — 재조회 없이 부모 화면에 바로 얹는다(§최적화: action 리턴값 그대로 반영). */
  onCreated: (created: RoomReservation) => void;
}

interface SlotPickerProps {
  date: string;
  startTime: string;
  onDateChange: (date: string) => void;
  onStartTimeChange: (startTime: string) => void;
  dateError?: string;
  startTimeError?: string;
}

/**
 * 날짜·시작 시각 피커 — 예전엔 캘린더에서 클릭한 슬롯을 그대로 보여주기만 했지만(고정값),
 * 이제 [회의 추가] 버튼으로 열었을 때도 직접 고를 수 있어야 한다(2026-08-14 팀 확정).
 * ⚠️ 주말도 고를 수 있다(2026-08-15 재확정) — BE가 요일로 예약을 막는 로직이 없어(BE
 *    `MeetingService.validateTime`/`validateMeetingRoomHours` 확인, 시간 범위·30분 그리드·
 *    운영시간만 본다) 막을 이유가 없다.
 */
function SlotPicker({
  date,
  startTime,
  onDateChange,
  onStartTimeChange,
  dateError,
  startTimeError,
}: SlotPickerProps) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reservation-date">날짜</Label>
        <DatePickerField
          id="reservation-date"
          name="date"
          value={date}
          onChange={onDateChange}
          aria-invalid={Boolean(dateError)}
        />
        <FieldError reserveSpace message={dateError} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reservation-start-time">시작 시간</Label>
        <TimePickerField
          id="reservation-start-time"
          name="startTime"
          value={startTime}
          onChange={onStartTimeChange}
          step={RESERVATION_DURATION_MINUTES}
          aria-invalid={Boolean(startTimeError)}
        />
        <FieldError reserveSpace message={startTimeError} />
      </div>

      <p className="text-muted-foreground self-center pt-6 text-[13px]">
        {RESERVATION_DURATION_MINUTES}분 · 즉시 확정
      </p>
    </div>
  );
}

interface DialogActionsProps {
  onCancel: () => void;
  /** "즉시 예약" 클릭 — 여기서 바로 제출하지 않고 확인 모달을 먼저 띄운다. */
  onRequestSubmit: () => void;
}

/**
 * 취소·제출 버튼 — `useFormStatus`는 `<form>`의 **자손** 컴포넌트에서만 호출할 수 있어서
 * `RoomReservationDialog`(그 `<form>`을 직접 그리는 컴포넌트) 안이 아니라 여기로 뺐다.
 * ⚠️ "즉시 예약"은 `type="submit"`이 아니다 — 눌러도 바로 제출하지 않고 확인 모달을 먼저
 *    띄운다. 실제 제출은 확인 모달의 [예약]에서 `form.requestSubmit()`으로 한다
 *    (`RoomReservationDialog` 참고).
 */
function DialogActions({ onCancel, onRequestSubmit }: DialogActionsProps) {
  const { pending } = useFormStatus();

  return (
    <div className="flex shrink-0 gap-2">
      <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
        취소
      </Button>
      <Button type="button" variant="ink" disabled={pending} onClick={onRequestSubmit}>
        {pending ? "예약 중" : "즉시 예약"}
      </Button>
    </div>
  );
}

interface PendingReporterProps {
  /** ⚠️ 참조가 고정돼야 한다 — 매 렌더 새 함수면 아래 effect가 매번 돈다. */
  onChange: (pending: boolean) => void;
}

/**
 * 제출 중인지를 **창**(`RoomReservationDialog`)에 올려 보낸다.
 * ⚠️ `useFormStatus`는 `<form>`의 자손에서만 읽을 수 있는데, 창을 닫아도 되는지 판단하는
 *    `Dialog`의 `onOpenChange`는 `<form>` 바깥(그 `<form>`을 그리는 조상)에 있다 — 그래서
 *    렌더 없이 값만 부모로 올려 보내는 자리가 하나 더 필요하다.
 */
function PendingReporter({ onChange }: PendingReporterProps) {
  const { pending } = useFormStatus();

  useEffect(() => {
    onChange(pending);
  }, [pending, onChange]);

  return null;
}

/**
 * 회의실 예약 모달 — `/app/rooms` 예약이 유일한 회의 개설 진입점이다(CLAUDE.md §라우트 그룹).
 * ⚠️ **`ConfirmDialog`를 안 쓴다**(2026-08-09 정리). 그 창은 폭이 420 하나로 고정돼 있어(팀
 *    합의) 이 폼처럼 필드가 많고 참석자 패널까지 곁들이는 화면엔 안 맞는다 — 시안 이미지대로
 *    왼쪽(제목·회의실·프로젝트·회의 주제)·오른쪽(참석자) 2열로 짜려면 순수 `Dialog`가 필요하다.
 *    좁은 화면(모바일)에서는 1열로 쌓이고 `sm` 이상에서만 2열이 된다.
 * 폼 상태는 `useRoomReservationForm`, 왼쪽 열 필드는 `RoomReservationFields`로 뺐다
 * (CLAUDE.md §폴더·네이밍: 200줄↑ 분리·로직=커스텀훅) — 여기는 모달 뼈대만 조립한다.
 * ⚠️ **실제 `<form action={formAction}>`으로 제출한다.** `title`·회의 주제·참석자는 전부
 *    네이티브 입력(`name` 속성)이라 그대로 실리고, `roomId`·`projectId`·`parentTeamActionId`는
 *    네이티브 입력이 아닌 값(위젯 상태)이라 여기서 직접 hidden input으로 실어 보낸다.
 *    `date`·`startTime`은 `SlotPicker`(`DatePickerField`·`TimePickerField`)가 각자 자기
 *    hidden input을 낸다 — 2026-08-14부터 고정 슬롯이 아니라 직접 고르는 값이라서다.
 */
export function RoomReservationDialog({
  slotStart,
  onOpenChange,
  rooms,
  members,
  projects,
  showParentTeamAction,
  teamActions,
  viewer,
  onCreated,
}: RoomReservationDialogProps) {
  const { state, formAction, form, setForm, handleOpenChange } = useRoomReservationForm({
    slotStart,
    onCreated,
    onOpenChange,
  });

  const [isPending, setIsPending] = useState(false);
  // ⚠️ `PendingReporter`의 effect 의존성이라 참조를 고정한다 — 안 그러면 매 렌더 다시 돈다.
  const handlePendingChange = useCallback((next: boolean) => setIsPending(next), []);

  /**
   * "즉시 예약" 확인 모달 — 실제 등록은 이 창의 [예약]에서 `formRef.requestSubmit()`으로
   * 진짜 제출을 건다(§DialogActions). 폼 자체의 값(제목·회의실 등)은 그대로 있으니 두 번
   * 입력할 필요는 없다.
   */
  const formRef = useRef<HTMLFormElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  /**
   * ⚠️ [즉시 예약]은 `type="button"`이라 클릭으로는 절대 제출이 안 걸리지만, 이 폼처럼
   *    텍스트 입력이 여러 개면(제목·안건·참석자 검색) 보통은 Enter로도 안 제출되는 게 맞다
   *    (HTML 암시적 제출 규칙 — 텍스트류 입력이 둘 이상이면 브라우저가 자동 제출하지 않는다).
   *    다만 그 규칙은 **필드 개수에 의존하는 우연**이라, 나중에 필드가 줄면(안건 UI가 단순해지는
   *    등) 조용히 깨질 수 있다 — `onSubmit`에서 한 번 더 막아 "확인 모달을 거쳤을 때만 진짜
   *    제출"을 필드 구성과 무관하게 보장한다.
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

  return (
    <Dialog
      open={slotStart !== null}
      onOpenChange={(next) => {
        // ⚠️ 제출 중엔 X 버튼·Esc·바깥 클릭 전부 막는다 — 요청은 계속 가는데 창만 사라지면
        //    결과를 못 본다(§토스트는 보조 — 놓치면 안 되는 결과를 창으로 안 남기면 안 된다).
        if (!next && isPending) return;
        handleOpenChange(next);
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[720px]">
        <DialogHeader className="border-border border-b px-6 py-4">
          <DialogTitle>회의실 예약</DialogTitle>
        </DialogHeader>

        <form ref={formRef} action={formAction} onSubmit={handleFormSubmit}>
          <PendingReporter onChange={handlePendingChange} />
          {/* ⚠️ `date`·`startTime`은 hidden input이 여기 없다 — `SlotPicker` 안의 `DatePickerField`·
              `TimePickerField`가 각자 `name`으로 자기 hidden input을 낸다. */}
          <input type="hidden" name="roomId" value={form.roomId} />
          <input type="hidden" name="projectId" value={form.projectId} />
          <input type="hidden" name="parentTeamActionId" value={form.parentTeamActionId} />

          <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-6 py-4">
            <SlotPicker
              date={form.date}
              startTime={form.startTime}
              onDateChange={(date) => setForm((prev) => ({ ...prev, date }))}
              onStartTimeChange={(startTime) => setForm((prev) => ({ ...prev, startTime }))}
              dateError={state.errors.date}
              startTimeError={state.errors.startTime}
            />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_260px]">
              <RoomReservationFields
                form={form}
                setForm={setForm}
                errors={state.errors}
                rooms={rooms}
                projects={projects}
                showParentTeamAction={showParentTeamAction}
                teamActions={teamActions}
              />

              <div className="flex flex-col gap-1.5">
                <RoomAttendeePicker
                  members={members}
                  selectedIds={form.attendeeIds}
                  onChange={(attendeeIds) => setForm((prev) => ({ ...prev, attendeeIds }))}
                  viewer={viewer}
                />
                <FieldError reserveSpace message={state.errors.attendeeIds} />
              </div>
            </div>

            {/* ⚠️ 이 문구는 그대로 둔다 — 직접 손으로 맞춘 워딩이다, 고치지 않는다. */}
            <p className="text-muted-foreground flex items-start gap-1.5 text-[11px] leading-4 break-keep">
              <span className="flex h-4 shrink-0 items-center">
                <Bell className="size-3.5" aria-hidden />
              </span>
              회의 시작 10분 전 참석자에게 알림이 전송됩니다.
            </p>
          </div>

          <div className="border-border flex items-center justify-end gap-4 border-t px-6 py-4">
            <DialogActions
              onCancel={() => handleOpenChange(false)}
              onRequestSubmit={() => setShowConfirm(true)}
            />
          </div>
        </form>
      </DialogContent>

      <ConfirmDialog
        isOpen={showConfirm}
        onOpenChange={setShowConfirm}
        title="이대로 등록하시겠습니까?"
        description="등록하면 참석자에게 알림이 전송되고, 곧바로 회의실이 예약됩니다."
        confirmLabel="예약"
        onConfirm={() => {
          setShowConfirm(false);
          confirmedSubmitRef.current = true;
          formRef.current?.requestSubmit();
        }}
      />
    </Dialog>
  );
}
