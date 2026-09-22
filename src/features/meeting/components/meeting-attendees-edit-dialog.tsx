"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type AttendeeScopeViewer, isAttendeeInScope } from "@/features/rooms/attendee-scope";
import { RoomAttendeePicker } from "@/features/rooms/components/room-attendee-picker";
import type { RoomMember } from "@/features/rooms/types";

import { updateMeetingAttendeesAction } from "../actions";

const INITIAL_STATE = { error: null, attendeeIds: null } as const;

interface MeetingAttendeesEditDialogProps {
  meetingId: string;
  currentAttendeeIds: number[];
  members: RoomMember[];
  /** 참석자 범위(Owner=팀장만 / Leader·Member=자기 팀만) 기준 — `RoomAttendeePicker`로
   *  그대로 흘려보낸다(`attendee-scope.ts`, 2026-08-13 확정). */
  viewer: AttendeeScopeViewer;
}

/**
 * 참석자 명단 교체(MEET-09) — 회의 상세에서 host가 여는 다이얼로그.
 * ⚠️ **WORKFLOW.md §3-2에 새로 추가된 화면이다**(2026-08-12 사용자 확정) — 예약 시 참석자를
 *    고르는 `RoomAttendeePicker`를 그대로 재사용한다(중복 컴포넌트를 새로 안 만든다).
 * ⚠️ 트리거·노출 조건(host·SCHEDULED/IN_PROGRESS)은 `MeetingDetailView`가 정한다 — 이 컴포넌트는
 *    "지금 열렸는지"만 안다.
 */
/**
 * 저장될 명단으로 시작한다 — **규칙 밖 참석자는 빼고 연다.**
 *
 * ⚠️ 현재 명단을 그대로 초기값으로 두면 "선택 N명"이 저장되지도 않을 사람까지 세어 화면이
 *    거짓말을 한다(§정직성). 규칙 밖인 사람은 서버가 어차피 거부하므로, 세는 수와 저장되는
 *    명단을 처음부터 일치시킨다 — 누가 빠지는지는 피커가 이름으로 알린다.
 */
function toSelectableIds(
  currentAttendeeIds: number[],
  members: RoomMember[],
  viewer: AttendeeScopeViewer,
): number[] {
  const inScope = new Set(
    members.filter((member) => isAttendeeInScope(member, viewer)).map((member) => member.id),
  );
  return currentAttendeeIds.filter((id) => inScope.has(id));
}

export function MeetingAttendeesEditDialog({
  meetingId,
  currentAttendeeIds,
  members,
  viewer,
}: MeetingAttendeesEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() =>
    toSelectableIds(currentAttendeeIds, members, viewer),
  );
  const [state, formAction, isPending] = useActionState(
    updateMeetingAttendeesAction,
    INITIAL_STATE,
  );
  const handled = useRef<number[] | null>(null);

  useEffect(() => {
    if (state.attendeeIds && handled.current !== state.attendeeIds) {
      handled.current = state.attendeeIds;
      setOpen(false);
      toast.success("참석자 명단을 바꿨습니다");
    }
  }, [state.attendeeIds]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelectedIds(toSelectableIds(currentAttendeeIds, members, viewer));
          setOpen(true);
        }}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-md text-[12px] leading-4 underline underline-offset-2 transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
      >
        참석자 수정
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && isPending) return;
          setOpen(next);
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[420px]">
          <DialogHeader className="border-border border-b px-6 py-4">
            <DialogTitle>참석자 수정</DialogTitle>
          </DialogHeader>

          <form action={formAction}>
            <input type="hidden" name="meetingId" value={meetingId} />

            <div className="flex h-[360px] flex-col px-6 py-4">
              <RoomAttendeePicker
                members={members}
                selectedIds={selectedIds}
                onChange={setSelectedIds}
                viewer={viewer}
                currentAttendeeIds={currentAttendeeIds}
              />
              {state.error && <p className="text-destructive pt-2 text-[12px]">{state.error}</p>}
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
