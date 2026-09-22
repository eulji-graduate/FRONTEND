"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getMeetingSummaryAction,
  type MeetingSummary,
  updateMeetingAction,
  type UpdateMeetingState,
} from "@/features/meeting/actions";
import { MeetingCancelDialog } from "@/features/meeting/components/meeting-cancel-dialog";
import { MEETING_TITLE_MAX_LENGTH } from "@/features/meeting/lib";
import { canCancelMeeting, canEditMeeting } from "@/features/meeting/status";
import { cn } from "@/lib/utils";

const INITIAL_STATE: UpdateMeetingState = { error: null, saved: null };

type LoadState =
  | { status: "loading" }
  | { status: "ok"; summary: MeetingSummary }
  | { status: "locked"; title: string | null }
  | { status: "notFound" }
  | { status: "error" };

interface RoomMeetingDetailDialogProps {
  /** `null`이면 닫힌 상태 — 캘린더에서 예약 막대를 클릭하면 그 회의 id가 들어온다. */
  meetingId: string | null;
  onOpenChange: (open: boolean) => void;
  /** 제목 수정이 저장되면 캘린더 막대도 같이 바꾸라고 올려보낸다(재조회 없이 비관적 갱신). */
  onTitleUpdated: (meetingId: string, title: string) => void;
  /** 회의 취소가 성공하면 캘린더 막대를 지우라고 올려보낸다(§최적화: action 리턴값으로 화면 반영). */
  onCancelled: (meetingId: string) => void;
}

/**
 * 회의실 캘린더에서 **이미 있는 예약**을 클릭했을 때 뜨는 모달 — 조회가 기본이고, 개설자면
 * [수정]·[회의 취소] 버튼으로 바뀐다(2026-08-18, 예약 모달과 같은 골격으로 다시 맞춤).
 *
 * ⚠️ **`RoomReservationDialog`(회의실 예약 모달)와 같은 뼈대를 쓴다** — 창 폭(720)·머리·
 *    좌(정보) 우(참석자 260px) 2열 grid·발치 버튼 줄까지 전부 그 모달을 그대로 베낀다.
 *    같은 회의실 캘린더에서 여닫는 두 모달인데 하나는 좁은 420폭 목록형이고 하나는 넓은
 *    2열 폼형이면 같은 기능의 두 창처럼 안 읽힌다(팀 지적).
 * ⚠️ **조회 모드는 아무것도 고를 게 없다.** `RoomReservationFields`·`RoomAttendeePicker`
 *    (입력용 Select·검색·체크박스)를 그대로 재사용하지 않고, 값만 박힌 `ReadOnlyField`로
 *    새로 그린다 — 골라야 할 게 없는 자리에 고르는 UI를 두면 "여기서 뭘 바꿀 수 있나" 하고
 *    누르게 된다(§정직성: 안 되는 조작을 되는 것처럼 보이면 안 된다).
 * ⚠️ **예전엔 이 자리에 예약 생성 모달이 그대로 떴다** — 이미 있는 회의를 클릭해도 "새로
 *    예약하기" 폼이 열려 값이 비어 있었다(예외처리 누락, 별도 버그로 확인). `WeeklyRoomCalendar`가
 *    이제 `onSelectEvent`로 이 모달을 열고, 빈 칸 클릭(`onSelectSlot`)과 갈라 둔다.
 * ⚠️ **고칠 수 있는 건 제목뿐이다.** BE(MEET-05)는 시간·회의실도 받지만, 그건 예약 슬롯을
 *    다시 잡는 일이라 슬롯 피커·회의실 피커가 있어야 한다 — `MeetingEditDialog`(#436)는 그
 *    피커들을 넣을 자리가 있는 큰 폼이지만, 이 창은 캘린더 막대를 눌러 여는 조회 겸 수정
 *    창이라 그 폼을 통째로 넣을 자리가 없다. 시간·회의실을 바꾸려면 상세 페이지의
 *    [회의 수정]을 쓴다 — 조회해 온 나머지 값(일정·회의실·참석자)은 수정 모드에서도 그대로
 *    읽기전용으로 보여준다, 없는 기능을 감추지 않는다(§정직성).
 * ⚠️ `canEditMeeting`(host && SCHEDULED)이 아니면 [수정] 버튼 자체가 없다 — 화면 숨김은 UX일
 *    뿐이고, 실제 방어는 `updateMeetingAction`(서버)이 다시 한다(§권한). `canCancelMeeting`도
 *    같은 조건이라 [회의 취소] 역시 개설자에게만 뜬다.
 * ⚠️ 조회·수정 상태는 `MeetingSummaryPanel`을 `key={meetingId}`로 물려 초기화한다 — 이펙트
 *    안에서 직접 `setState`로 되돌리지 않는다(react-hooks/set-state-in-effect, §린트).
 */
export function RoomMeetingDetailDialog({
  meetingId,
  onOpenChange,
  onTitleUpdated,
  onCancelled,
}: RoomMeetingDetailDialogProps) {
  return (
    <Dialog open={meetingId !== null} onOpenChange={(next) => !next && onOpenChange(false)}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[720px]">
        <DialogHeader className="border-border border-b px-6 py-4">
          <DialogTitle>회의 상세</DialogTitle>
        </DialogHeader>

        {meetingId && (
          <MeetingSummaryPanel
            key={meetingId}
            meetingId={meetingId}
            onClose={() => onOpenChange(false)}
            onTitleUpdated={onTitleUpdated}
            onCancelled={onCancelled}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface MeetingSummaryPanelProps {
  meetingId: string;
  onClose: () => void;
  onTitleUpdated: (meetingId: string, title: string) => void;
  onCancelled: (meetingId: string) => void;
}

/**
 * 값만 박힌 칸 — `Input`과 같은 테두리·높이·글자 크기를 쓰되 `<input>`이 아니라 `<div>`다.
 * ⚠️ 포커스도 안 받고 값도 못 바꾼다 — 예약 모달의 실제 입력칸과 **생김새만** 맞춘다.
 */
function ReadOnlyField({
  label,
  value,
  htmlFor,
}: {
  label: string;
  value: string;
  htmlFor?: string;
}) {
  return (
    // ⚠️ **`min-w-0`을 여기서도 준다** — flex/grid 자식은 기본 `min-width: auto`라 내용 폭만큼
    //    안 줄어든다. 안쪽 값 칸에 `truncate`를 걸어도, 이 바깥 칸이 안 줄어들면 줄임표가
    //    안 먹히고 긴 글자가 옆 칸(참석자)을 밀어낸다(회의 제목·안건이 길 때 재현됨).
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      <div
        id={htmlFor}
        title={value}
        className={cn(
          "border-input bg-muted/40 flex h-8 w-full min-w-0 items-center rounded-lg border px-2.5",
          "text-foreground truncate text-[13px]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function MeetingSummaryPanel({
  meetingId,
  onClose,
  onTitleUpdated,
  onCancelled,
}: MeetingSummaryPanelProps) {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [editing, setEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(updateMeetingAction, INITIAL_STATE);
  const handledSave = useRef<UpdateMeetingState["saved"]>(null);

  /*
    ⚠️ **`.catch()`가 반드시 있어야 한다**(CodeRabbit 지적, PR #547) — 없으면 요청이 거부됐을
       때(네트워크 오류 등) `.then()` 콜백이 아예 안 돌아 `load`가 영원히 `"loading"`에 멈춘다.
       스켈레톤이 계속 떠 있어서 사용자는 뭐가 잘못됐는지도 모른다(§정직성 위반).
  */
  useEffect(() => {
    let canceled = false;
    getMeetingSummaryAction(meetingId)
      .then((result) => {
        if (canceled) return;
        if (result.kind === "ok") setLoad({ status: "ok", summary: result.summary });
        else if (result.kind === "locked") setLoad({ status: "locked", title: result.title });
        else setLoad({ status: "notFound" });
      })
      .catch(() => {
        if (!canceled) setLoad({ status: "error" });
      });
    return () => {
      canceled = true;
    };
  }, [meetingId]);

  useEffect(() => {
    if (state.saved && handledSave.current !== state.saved && load.status === "ok") {
      handledSave.current = state.saved;
      const title = state.saved.title;
      setLoad({ status: "ok", summary: { ...load.summary, title } });
      setEditing(false);
      onTitleUpdated(meetingId, title);
      toast.success("회의 정보를 수정했습니다");
    }
  }, [state.saved, load, meetingId, onTitleUpdated]);

  if (load.status === "loading") {
    return (
      <div className="flex flex-col gap-3 px-6 py-5">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    );
  }

  if (load.status === "notFound") {
    return (
      <p className="text-muted-foreground px-6 py-5 text-[13px] leading-5">
        회의를 찾을 수 없습니다.
      </p>
    );
  }

  if (load.status === "error") {
    return (
      <p className="text-muted-foreground px-6 py-5 text-[13px] leading-5">
        회의 정보를 불러오지 못했습니다 — 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  if (load.status === "locked") {
    return (
      <p className="text-muted-foreground px-6 py-5 text-[13px] leading-5">
        참석자만 열람 가능합니다.
      </p>
    );
  }

  const { summary } = load;
  const isHost = summary.isHost;
  const canEdit = canEditMeeting({ isHost, pendingReason: summary.pendingReason });
  const canCancel = canCancelMeeting({ isHost, pendingReason: summary.pendingReason });
  /*
    ⚠️ **`agenda.main`은 `null`일 수 있다**(안건이 소주제로만 남은 회의, `view-types.ts`
       참고) — `ReadOnlyField`의 `value`는 `string`만 받으므로, 대주제·소주제 중 있는
       것만 모아 하나의 문자열로 만든다. 안건 자체가 아예 없으면(`summary.agenda`가
       `null`) 이 칸을 그리지 않는다.
  */
  const agendaText = summary.agenda
    ? [summary.agenda.main, summary.agenda.subs.length > 0 ? summary.agenda.subs.join(", ") : null]
        .filter((part): part is string => Boolean(part))
        .join(" · ") || null
    : null;

  if (editing) {
    return (
      <form action={formAction}>
        <input type="hidden" name="meetingId" value={meetingId} />

        {/* ⚠️ 예약 모달과 같은 스크롤 상자 폭(70vh) — 모드를 바꿔도 창 크기가 안 흔들린다. */}
        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-6 py-4">
          <div className="flex flex-wrap items-start gap-4">
            <ReadOnlyField label="일정" value={summary.schedule} />
            <ReadOnlyField label="회의실" value={summary.roomName} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="room-meeting-title">회의 제목</Label>
            <Input
              key={summary.title}
              id="room-meeting-title"
              name="title"
              defaultValue={summary.title}
              maxLength={MEETING_TITLE_MAX_LENGTH}
              required
              aria-describedby={state.error ? "room-meeting-title-error" : undefined}
              aria-invalid={state.error ? true : undefined}
            />
            {state.error && (
              <p id="room-meeting-title-error" className="text-destructive text-[12px] leading-4">
                {state.error}
              </p>
            )}
            <p className="text-muted-foreground text-[12px] leading-4">
              시간·회의실을 바꾸려면 회의를 취소하고 다시 예약해 주세요.
            </p>
          </div>
        </div>

        <div className="border-border flex items-center justify-end gap-2 border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setEditing(false)}
          >
            취소
          </Button>
          <Button type="submit" variant="ink" disabled={isPending}>
            {isPending ? "저장 중" : "저장"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <>
      {/*
        ⚠️ **`RoomReservationDialog`와 같은 구조다** — 위에 일정 줄, 아래 좌(정보)·우(참석자
           260px) 2열. 회의실 예약 모달을 열었다 닫고 상세 모달을 열어도 같은 창처럼 읽힌다.
      */}
      <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-6 py-4">
        <div className="flex flex-wrap items-start gap-4">
          <ReadOnlyField label="일정" value={summary.schedule} />
          <ReadOnlyField label="회의실" value={summary.roomName} />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_260px]">
          {/* ⚠️ 그리드 칸도 `min-w-0` — 안 주면 이 칸 자체가 안 줄어들어 참석자(260px) 칸을 밀어낸다. */}
          <div className="flex min-w-0 flex-col gap-4">
            <ReadOnlyField label="회의 제목" value={summary.title} />
            {agendaText && <ReadOnlyField label="안건" value={agendaText} />}
          </div>

          <div className="flex flex-col gap-2">
            <Label>참석자</Label>
            {/* ⚠️ `RoomAttendeePicker`와 같은 테두리 상자 — 체크박스·검색만 뺀다(고를 게 없다). */}
            <div className="border-border min-h-0 flex-1 overflow-y-auto rounded-lg border">
              {summary.attendees.length === 0 ? (
                <p className="text-muted-foreground px-3 py-3 text-[12px] leading-4">
                  참석자가 없습니다
                </p>
              ) : (
                summary.attendees.map((attendee) => (
                  <div
                    key={attendee.id}
                    className="flex items-center gap-2.5 px-3 py-2 text-[13px] leading-5"
                  >
                    <span className="truncate">{attendee.name}</span>
                  </div>
                ))
              )}
            </div>
            <p className="text-muted-foreground text-[11px]">참석 {summary.attendees.length}명</p>
          </div>
        </div>
      </div>

      <div className="border-border flex items-center justify-end gap-2 border-t px-6 py-4">
        {canCancel && (
          <MeetingCancelDialog
            meetingId={meetingId}
            onCancelled={() => {
              onCancelled(meetingId);
              onClose();
            }}
          />
        )}
        {canEdit && (
          <Button type="button" variant="outline" onClick={() => setEditing(true)}>
            수정
          </Button>
        )}
        <Button type="button" variant="ink" onClick={onClose}>
          닫기
        </Button>
      </div>
    </>
  );
}
