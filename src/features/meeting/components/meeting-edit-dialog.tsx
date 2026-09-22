"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { DatePickerField } from "@/components/common/date-picker-field";
import { FieldError } from "@/components/common/field-error";
import { TimePickerField } from "@/components/common/time-picker-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoomPickerList } from "@/features/rooms/components/room-picker-list";
import { RESERVATION_DURATION_MINUTES } from "@/features/rooms/constants";
import type { MeetingRoom, RoomProjectOption } from "@/features/rooms/types";

import { updateMeetingScheduleAction, type UpdateMeetingScheduleState } from "../actions";
import { MEETING_TITLE_MAX_LENGTH } from "../lib";

const INITIAL_STATE: UpdateMeetingScheduleState = { errors: {}, saved: null };

interface MeetingEditDialogProps {
  meetingId: string;
  currentTitle: string;
  /** 슬롯 피커·회의실 피커 초기값 — `canEdit`가 참이면 항상 있다(`MeetingDetail.editableSlot` 주석). */
  editableSlot: { date: string; startTime: string; meetingRoomId: string };
  currentProjectId: number;
  currentRecordingConsent: boolean;
  rooms: MeetingRoom[];
  projects: RoomProjectOption[];
}

interface EditFormValues {
  roomId: string;
  date: string;
  startTime: string;
  projectId: string;
  recordingConsent: boolean;
}

function toInitialForm(props: MeetingEditDialogProps): EditFormValues {
  return {
    roomId: props.editableSlot.meetingRoomId,
    date: props.editableSlot.date,
    startTime: props.editableSlot.startTime,
    projectId: String(props.currentProjectId),
    recordingConsent: props.currentRecordingConsent,
  };
}

/**
 * 회의 수정(MEET-05) — 상세 머리글의 [회의 수정] 버튼이 연다.
 *
 * ⚠️ 트리거·노출 조건(host·SCHEDULED)은 `MeetingDetailView`가 정한다(`canEditMeeting`) —
 *    여기는 "지금 열렸는지"만 안다. `MeetingCancelDialog`·`MeetingAttendeesEditDialog`와 같은 자리 나눔이다.
 * ⚠️ **제목·시간·회의실·프로젝트·녹음 동의까지 한 폼이다**(#436 — #419가 제목 한 칸만 냈던 걸
 *    확장했다). 시간·회의실은 예약 화면의 슬롯 피커·회의실 피커를 그대로 재사용한다(같은
 *    30분 그리드·중복 예약 검증을 타야 해서다) — 새 폼을 만들지 않는다.
 * ⚠️ **`updateMeetingAction`(제목만)과는 다른 액션(`updateMeetingScheduleAction`)을 쓴다.**
 *    회의실 캘린더의 `RoomMeetingDetailDialog`는 여전히 제목 한 칸이라 그 폼엔 이 다이얼로그의
 *    나머지 필드가 없다 — 같은 액션을 공유하면 그 다이얼로그가 필수 필드 오류부터 만난다.
 * ⚠️ 검증 오류는 **토스트가 아니라 필드 밑**이다(§토스트: 폼 검증 오류는 인라인). 성공만
 *    토스트로 알린다 — 창이 닫히므로 알릴 자리가 그것뿐이다.
 */
export function MeetingEditDialog(props: MeetingEditDialogProps) {
  const { meetingId, currentTitle, rooms, projects } = props;
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(updateMeetingScheduleAction, INITIAL_STATE);
  const handled = useRef<UpdateMeetingScheduleState["saved"]>(null);
  const [form, setForm] = useState<EditFormValues>(() => toInitialForm(props));

  /*
    ⚠️ `useMemo`로 참조를 고정한다 — 안 그러면 base-ui `Select`가 리렌더를 반복한다
       (`room-reservation-fields.tsx`의 `projectItems`와 같은 이유).
  */
  const projectItems = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  useEffect(() => {
    if (state.saved && handled.current !== state.saved) {
      handled.current = state.saved;
      setOpen(false);
      toast.success("회의 정보를 수정했습니다");
    }
  }, [state.saved]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          // ⚠️ 창을 다시 열 때마다 **저장된 값**에서 시작한다 — 지난번에 취소한 입력이 남으면 안 된다.
          setForm(toInitialForm(props));
          setOpen(true);
        }}
      >
        회의 수정
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && isPending) return;
          setOpen(next);
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[480px]">
          <DialogHeader className="border-border border-b px-6 py-4">
            <DialogTitle>회의 수정</DialogTitle>
          </DialogHeader>

          <form action={formAction}>
            <input type="hidden" name="meetingId" value={meetingId} />
            {/* ⚠️ `roomId`·`projectId`는 네이티브 입력이 아닌 위젯 상태라 여기서 직접 실어 보낸다
                (`room-reservation-dialog.tsx`와 같은 이유). `date`·`startTime`은 각 피커가
                자기 hidden input을 낸다. */}
            <input type="hidden" name="roomId" value={form.roomId} />
            <input type="hidden" name="projectId" value={form.projectId} />
            {/* ⚠️ base-ui `Checkbox`는 네이티브 체크박스가 아니다 — 값은 이 hidden input이 싣는다. */}
            <input
              type="hidden"
              name="recordingConsent"
              value={form.recordingConsent ? "on" : ""}
            />

            <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-6 py-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="meeting-edit-title">회의 제목</Label>
                {/* ⚠️ `key`로 현재 제목을 물린다 — 창을 다시 열면 취소한 입력이 아니라 저장된
                    제목에서 시작해야 한다(`defaultValue`는 다시 안 읽힌다). */}
                <Input
                  key={currentTitle}
                  id="meeting-edit-title"
                  name="title"
                  defaultValue={currentTitle}
                  maxLength={MEETING_TITLE_MAX_LENGTH}
                  required
                  aria-invalid={Boolean(state.errors.title)}
                />
                <FieldError reserveSpace message={state.errors.title} />
              </div>

              <div className="flex flex-wrap items-start gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="meeting-edit-date">날짜</Label>
                  <DatePickerField
                    id="meeting-edit-date"
                    name="date"
                    value={form.date}
                    onChange={(date) => setForm((prev) => ({ ...prev, date }))}
                    aria-invalid={Boolean(state.errors.date)}
                  />
                  <FieldError reserveSpace message={state.errors.date} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="meeting-edit-start-time">시작 시간</Label>
                  <TimePickerField
                    id="meeting-edit-start-time"
                    name="startTime"
                    value={form.startTime}
                    onChange={(startTime) => setForm((prev) => ({ ...prev, startTime }))}
                    step={RESERVATION_DURATION_MINUTES}
                    aria-invalid={Boolean(state.errors.startTime)}
                  />
                  <FieldError reserveSpace message={state.errors.startTime} />
                </div>

                <p className="text-muted-foreground self-center pt-6 text-[13px]">
                  {RESERVATION_DURATION_MINUTES}분
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>회의실</Label>
                <RoomPickerList
                  rooms={rooms}
                  selectedId={form.roomId}
                  onChange={(roomId) => setForm((prev) => ({ ...prev, roomId }))}
                  error={Boolean(state.errors.roomId)}
                />
                <FieldError reserveSpace message={state.errors.roomId} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="meeting-edit-project">프로젝트</Label>
                <Select
                  items={projectItems}
                  value={form.projectId}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, projectId: value ?? "" }))
                  }
                >
                  <SelectTrigger
                    id="meeting-edit-project"
                    aria-invalid={Boolean(state.errors.projectId)}
                    className="w-full"
                  >
                    <SelectValue placeholder="프로젝트 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError reserveSpace message={state.errors.projectId} />
              </div>

              <label className="flex items-center gap-2 text-[13px] leading-5">
                <Checkbox
                  checked={form.recordingConsent}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, recordingConsent: checked === true }))
                  }
                />
                녹음에 동의합니다
              </label>
            </div>

            <div className="border-border flex items-center justify-end gap-2 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" variant="ink" disabled={isPending}>
                {isPending ? "저장 중" : "저장"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
