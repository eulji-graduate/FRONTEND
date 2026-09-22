"use client";

import { CircleAlert, Mic, Pause, Play, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { LeaveGuard } from "@/components/common/leave-guard";
import { ProfileAvatar } from "@/components/common/profile-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CAPTURE_FAILURE_MESSAGE } from "@/constants/meeting";
import { MEMBER_STATUS_BADGE_CLASS, MEMBER_STATUS_LABEL } from "@/constants/member";
import { useNotificationCenter } from "@/features/notification/notification-provider";
import { pickPaletteColor } from "@/lib/palette";
import { cn } from "@/lib/utils";

import type { CaptureAttendee, MeetingCaptureInfo } from "../view-types";
import type { PartsUploadStatus } from "./actions";
import { canSubmit, CAPTURE_PHASE, type CapturePhase, formatRecordedTime } from "./phase";
import type { ActiveCapture, LiveCaption } from "./types";
import { describeUploadedParts } from "./upload";
import { useCapture } from "./use-capture";
import { useLiveCaptions } from "./use-live-captions";

/**
 * 캡처 화면 — **Host 전용**(WORKFLOW §3-3). 한 화면이 다섯 자리를 지난다:
 * 준비 → 준비 완료 → 녹음 중 → 일시정지 → 종료.
 *
 * ⚠️ **버튼은 2계열이다**(§3-3). [녹음 시작]이 [일시정지]/[재개] 토글로 바뀌고,
 *    [회의 종료 및 제출]은 녹음을 시작해야 열린다. 셋을 나란히 늘어놓지 않는다.
 * ⚠️ **조작은 상단바가 아니라 카드 안에 둔다**(DESIGN §1). 시안은 앱 상단바에 버튼을
 *    얹었지만 우리 셸의 상단바는 제목 줄이라, 화면마다 버튼이 붙었다 말았다 하면 그 줄이
 *    무엇을 하는 자리인지 흔들린다 — 대신 **본문 첫 카드**를 조작 줄로 쓴다.
 * ⚠️ **일시정지(보조)와 종료(위험)를 눈으로 갈라 둔다**(§3-3 종료 정책).
 * ⚠️ 알림은 셋을 갈라 쓴다(DESIGN §7): 종료는 **확인 창**(되돌릴 수 없다),
 *    제출·요약 완료는 **토스트**(알리기만 하면 된다), 마이크·자막 실패는 **화면에 남기는
 *    인라인 오류**(토스트는 사라지는데 그건 놓치면 회의가 통째로 빈다).
 * ⚠️ 타이핑 메모는 없다(§3-3 폐기). 참석자용 레이아웃도 없다.
 */
export function CaptureView({
  meeting,
  initialCaptions,
  viewerId,
}: {
  meeting: MeetingCaptureInfo;
  /** 구독 전 자막(CAP-12 백필) — 서버가 읽어 내려준다 */
  initialCaptions: LiveCaption[];
  /** 보고 있는 사람 — 되돌아온 내 자막을 걷어내는 데 쓴다 */
  viewerId: number;
}) {
  /*
    ⚠️ **서버에 이미 있는 내 자막 다음 번호에서 이어 간다.** 0부터 다시 붙이면 BE가 같은
       `(회의, 사람, seq)`를 조용히 건너뛰어(멱등) 새로고침 뒤 발화가 통째로 저장되지 않는다.
    ⚠️ 백필이 실패하면 0이다 — 그때는 겹치는 만큼 버려지지만, 자막을 아예 못 보내는 것보다 낫다.
  */
  const initialSeq = useMemo(() => {
    const mine = initialCaptions.filter(
      (caption) => caption.personId === viewerId && caption.seq !== undefined,
    );
    return mine.reduce((max, caption) => Math.max(max, (caption.seq ?? -1) + 1), 0);
  }, [initialCaptions, viewerId]);

  const capture = useCapture(meeting.id, initialSeq);
  /*
    ⚠️ **남의 자막은 따로 받는다.** 내 자막은 이 브라우저의 STT가 만들고(`capture.chunks`),
       남의 자막은 서버를 거쳐 온다 — 두 경로를 한 훅에 묶으면 마이크가 없는 참석자
       화면에서도 STT를 켜야 하는 모양이 된다.
    ⚠️ 합쳐서 **시각순으로 세운다.** 도착 순서대로 쌓으면 네트워크가 늦은 사람의 말이
       뒤에 붙어 대화가 뒤집힌다.
  */
  const remoteCaptions = useLiveCaptions(meeting.id, initialCaptions, viewerId);

  /*
    ⚠️ **내 말은 남의 자막에서 걷어낸다.** BE는 보낸 사람을 빼지 않고 구독자 **전원**에게
       뿌린다(`CaptionStreamRegistry.broadcastToLocal`) — 안 걸러내면 내가 한 말이 두 번
       뜬다(내 STT가 만든 것 + 서버가 되돌려준 것).
    ⚠️ 합친 뒤 **`atMs`로 세운다.** 도착 순서대로 쌓으면 네트워크가 늦은 사람의 말이 뒤에
       붙어 대화가 뒤집히고, `at` 문자열로 세우면 한 시간을 넘길 때 순서가 깨진다.
  */
  const captionLines = useMemo(() => {
    const speakerById = new Map(meeting.attendees.map((a) => [a.id, a.name]));
    /*
      ⚠️ **내 자막은 걸러 내지 않는다.** 백필에는 내가 지난번에 한 말도 들어 있고, 그건
         새로고침 뒤 이 화면에 남아야 하는 유일한 기록이다 — 되돌아온 실시간 줄만
         `useLiveCaptions`가 수신 지점에서 버린다.
    */
    const mine = capture.chunks.map((chunk) => ({ ...chunk, speaker: null }));
    const others = remoteCaptions.map((caption) => ({
      id: caption.id,
      at: caption.at,
      atMs: caption.atMs,
      text: caption.text,
      /*
        ⚠️ **서버가 준 이름을 먼저 쓴다.** 명단(`attendees`)에 없는 사람도 서버는 안다 —
           명단만 보면 그런 발화가 전부 `알 수 없음`이 된다.
        ⚠️ 그래도 모르면 자리를 비우지 말고 모르는 사람으로 말한다(§정직성).
      */
      speaker:
        caption.speakerName ??
        (caption.personId === null ? null : speakerById.get(caption.personId)) ??
        "알 수 없음",
    }));
    return [...mine, ...others].sort((a, b) => a.atMs - b.atMs);
  }, [capture.chunks, remoteCaptions, meeting.attendees]);
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  /*
    ⚠️ 요약 진행은 **셸이 쫓는다**(#442). 이 화면은 "이 회의를 쫓아 달라"고 넘기기만 한다 —
       여기서 들고 있으면 목록으로 옮기는 순간 사라져서 카드를 만든 뜻이 없어진다.
  */
  const { trackAnalysis } = useNotificationCenter();

  const unsupported = !capture.support.stt || !capture.support.recording;
  const isRecording = capture.phase === CAPTURE_PHASE.RECORDING;
  const isPaused = capture.phase === CAPTURE_PHASE.PAUSED;

  /*
    ⚠️ **녹음 중에 창을 닫으려 하면 붙잡는다**(공용 `LeaveGuard`). 지금 녹음은 브라우저 안에만
       있어서 탭을 닫으면 통째로 사라진다 — 온보딩이 `sessionStorage`를 지키는 것과 같은 이유다.
    ⚠️ 종료한 뒤에는 안 붙잡는다. 제출이 끝나 잃을 게 없다.
  */
  const hasUnsaved = isRecording || isPaused;

  /**
   * 종료를 서버에 알리고, **받아들여졌을 때만** 목록으로 보낸다.
   *
   * ⚠️ 확인 창과 [다시 시도]가 **같은 함수**를 쓴다. 둘이 갈리면 재시도만 다른 일을 하게 된다.
   */
  const finishMeeting = async () => {
    /*
       ⚠️ **끄는 일이 실패해도 화면은 넘어가야 한다.** 로컬 정리(`teardown`)에서
       `MediaRecorder.stop()`이 상태가 어긋나 던지는 경우가 있는데(`InvalidStateError`),
       그걸로 흐름이 멈추면 종료를 눌렀는데 아무 일도 안 난 것처럼 보인다 —
       되돌릴 수 없는 동작이라 다시 누르지도 못한다. 마이크 표시등은 화면을 떠날 때
       정리 효과가 한 번 더 끈다.
       ⚠️ **서버가 받았는지는 따로 본다**(2026-08-12). 종료 알림(MEET-08)이 붙은 뒤로는
       실패를 삼키면 안 된다 — 마지막 세그먼트가 확정되지 않았는데 "요약 중"이라고
       말하면, 서버는 회의가 끝난 줄도 모르는데 사람은 다 끝난 줄 안다(§정직성).
       이 주석이 "연동 때 갈린다"고 적어 둔 그 자리를 이제 실제로 가른다.
    */
    let ended;
    try {
      ended = await capture.end();
    } catch {
      ended = { ok: false, error: CAPTURE_FAILURE_MESSAGE.MEETING_END };
    }

    /*
       ⚠️ **실패하면 붙잡는다.** 목록으로 보내 버리면 사람이 할 수 있는 일이 사라진다 —
       화면에 남겨야 다시 누를 수 있고, 남은 자막·세그먼트도 이 화면이 쥐고 있다.
    */
    if (!ended.ok) {
      toast.error(CAPTURE_FAILURE_MESSAGE.MEETING_END_TOAST);
      return;
    }

    /*
       ⚠️ **바로 목록으로 돌려보낸다**(팀 확정). 요약 API는 응답이 오래 걸려서 서버가
       백그라운드로 돌린다 — 여기서 기다리게 두면 아무것도 못 하는 화면을 몇 분씩
       쳐다보게 된다. 창을 닫아도 안전한 일이라 붙잡을 이유가 없다(§3-3 4).
       ⚠️ **토스트를 지속형 카드로 바꿨다**(#442). 전에는 `toast.success("백그라운드에서
       요약 중입니다")` 한 줄이 몇 초 뜨고 사라졌는데, 그 뒤로 요약이 끝났는지 깨졌는지
       알 방법이 없어서 사람이 회의 상세를 새로고침하며 기다렸다 — 토스트는 놓쳐도 되는
       말만 담는 자리다(DESIGN §7). 카드는 셸이 들고 있어(`NotificationProvider`)
       목록으로 옮겨도 따라오고, **닫기 전까지 남아 자리에서 상태만 바뀐다.**
       ⚠️ 제목을 같이 넘긴다 — 목록으로 튕긴 뒤 카드만 보고도 어느 회의인지 알아야 한다.
       ⚠️ **id는 문자열 그대로 넘긴다.** `Number()`로 바꾸면 목 id(`meeting-3`)가 `NaN`이 되고,
       `NaN === NaN`이 거짓이라 프로바이더가 자기 카드를 못 알아봐 「요약 중」에서 멈춘다.
    */
    trackAnalysis(meeting.id, meeting.title);
    router.push("/app/meeting");
  };

  return (
    <>
      <LeaveGuard hasUnsaved={hasUnsaved} />

      {capture.phase === CAPTURE_PHASE.BEFORE_START ? (
        <ReadyCard
          meeting={meeting}
          support={capture.support}
          onReady={capture.enter}
          activeCapture={capture.activeCapture}
          uploadStatus={capture.uploadStatus}
        />
      ) : (
        <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col gap-7">
          {/*
            조작 줄 — **무슨 회의인지 · 얼마나 녹음했는지 · 무엇을 할 수 있는지**가 한 줄에 선다.
            ⚠️ 왼쪽은 정보, 오른쪽은 조작으로 축을 가른다(DESIGN §3: 열마다 축이 따로 선다).
               타이머는 `tabular-nums`라 숫자가 바뀌어도 옆의 버튼이 안 밀린다.
          */}
          <section className="border-border bg-card flex flex-wrap items-center gap-x-6 gap-y-4 rounded-2xl border p-7">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <ProjectTag tag={meeting.projectTag} />
                <PhaseBadge phase={capture.phase} />
              </div>
              {/* ⚠️ `h2`다 — 페이지의 `h1`은 상단바(`MeetingHeader` → `PageHeader`)가 갖고 있다.
                  둘을 두면 한 화면에 h1이 두 개가 된다(CLAUDE.md §SEO: h1 1개). */}
              <h2 className="truncate pt-2 text-[17px] leading-7 font-semibold tracking-[-0.3px]">
                {meeting.title}
              </h2>
              <p className="text-muted-foreground pt-0.5 text-[12px] leading-4">
                {meeting.schedule} · {meeting.roomName}
              </p>
            </div>

            {/* 실제 녹음 누적 — 일시정지는 빠진다(§3-3) */}
            <div className="shrink-0 text-right">
              <p className="text-[30px] leading-9 font-semibold tracking-[-0.8px] tabular-nums">
                {formatRecordedTime(capture.recordedMs)}
              </p>
              <p className="text-muted-foreground text-[11px] leading-4">일시정지 시간 제외</p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {/*
                ⚠️ **종료 뒤에는 아무 버튼도 안 둔다**(2026-08-12). 전에는 종료하자마자 화면을
                   떠나서 이 상태를 볼 일이 없었는데, 이제 종료 알림이 실패하면 이 화면에
                   머문다 — 그때 [일시정지]가 남아 있으면 이미 꺼진 녹음기를 가리키는
                   버튼이 된다. 할 수 있는 일은 아래 [다시 시도]뿐이다.
              */}
              {capture.phase === CAPTURE_PHASE.ENDED ? null : capture.phase ===
                CAPTURE_PHASE.READY ? (
                <Button
                  type="button"
                  variant="ink"
                  className="h-10 px-4 text-[13px]"
                  disabled={unsupported}
                  onClick={() => void capture.start()}
                >
                  <Mic className="size-4" aria-hidden />
                  {/*
                    아이콘 옆 한글은 1px 내린다(DESIGN §5).
                    ⚠️ **이 회의에 진행 중 캡처가 이미 있으면 [녹음 이어하기]**(2026-08-16, CAP-09).
                       새로고침·크래시로 돌아온 사용자에게 "녹음 시작"이라 말하면 이미 있는 녹음이
                       사라지는 것처럼 읽힌다 — 실제로 서버는 세션을 이어 준다. 다른 회의 정보
                       (`meetingId` 다름)는 이 라벨을 안 바꾼다(그 안내는 아래 ReadyCard가 한다).
                  */}
                  <span className="translate-y-[1px]">
                    {capture.activeCapture !== null &&
                    String(capture.activeCapture.meetingId) === meeting.id
                      ? "녹음 이어하기"
                      : "녹음 시작"}
                  </span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-4 text-[13px]"
                  onClick={isPaused ? capture.resume : capture.pause}
                >
                  {isPaused ? (
                    <Play className="size-4" aria-hidden />
                  ) : (
                    <Pause className="size-4" aria-hidden />
                  )}
                  <span className="translate-y-[1px]">{isPaused ? "재개" : "일시정지"}</span>
                </Button>
              )}

              <Button
                type="button"
                variant="destructive"
                className="border-destructive/40 h-10 border px-4 text-[13px]"
                disabled={!canSubmit(capture.phase)}
                onClick={() => setIsConfirming(true)}
              >
                <Square className="size-3.5" aria-hidden />
                <span className="translate-y-[1px]">회의 종료 및 제출</span>
              </Button>
            </div>
          </section>

          {unsupported && <UnsupportedNotice support={capture.support} />}

          {/*
            ⚠️ 마이크·자막 실패는 **화면에 남긴다.** 토스트로만 알리면 자리를 비운 사이에
               사라져서, 아무것도 안 담긴 채로 회의가 끝난다(DESIGN §7: 놓치면 안 되는 건 화면에).
          */}
          {capture.error && (
            <p
              role="alert"
              className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2 rounded-lg border px-3.5 py-3 text-[12px] leading-[18px] break-keep"
            >
              <span className="flex h-[18px] shrink-0 items-center">
                <CircleAlert className="size-3.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">{capture.error}</span>

              {/*
                ⚠️ **막다른 길을 만들지 않는다**(2026-08-12). 종료 알림이 실패하면 이 화면에
                   머무는데, 그 상태에서는 종료 버튼도 잠겨 있어 **다시 보낼 방법이 없었다** —
                   서버는 회의가 끝난 줄 모르는 채로 사람만 갇힌다.
                ⚠️ 녹음을 다시 켜는 게 아니라 **알림만 다시 보낸다.** 로컬 정리는 이미 끝났다.
              */}
              {capture.phase === CAPTURE_PHASE.ENDED && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => void finishMeeting()}
                >
                  다시 시도
                </Button>
              )}
            </p>
          )}

          {/*
            ⚠️ 곁 컬럼은 360 고정(DESIGN §1) — 반씩 나누면 자막 줄이 짧아져 눈이 헤맨다.
            ⚠️ **남는 높이를 여기가 다 먹는다**(`min-h-0 flex-1`). 그래야 자막 카드가 화면
               끝까지 자라고, 그 안에서만 스크롤이 생긴다.
          */}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
            <TranscriptCard
              chunks={captionLines}
              partial={capture.partial}
              isRecording={isRecording}
              isPaused={isPaused}
            />
            <AttendeeCard attendees={meeting.attendees} />
          </div>
        </div>
      )}

      {/*
        ⚠️ 종료는 되돌릴 수 없다 — **무엇을 잃는지** 적고 한 번 더 받는다(DESIGN §7).
           §3-3의 확인 문구를 우리 카피 규칙(~합니다체 · 제목은 물음)에 맞춰 옮겼다.
        ⚠️ `cancelLabel`은 안 넘긴다 — 기본값 `취소`를 쓴다(DESIGN §7).
      */}
      <ConfirmDialog
        isOpen={isConfirming}
        onOpenChange={() => setIsConfirming(false)}
        title="회의를 종료하고 요약을 진행할까요?"
        description={
          /*
            ⚠️ **세 줄을 비슷한 길이로 끊는다**(DESIGN §6). `요약은 백그라운드에서 진행되니
               목록으로 돌아가 다른 일을 하셔도 됩니다`(34자)는 창 폭(약 27자)을 넘겨
               `하셔도 / 됩니다`로 갈라졌다 — `<br />`은 넘치지 않을 때만 줄바꿈 자리를 정한다.
            ⚠️ "기다리지 않아도 된다"는 뜻은 **백그라운드**라는 낱말이 이미 담고 있다.
          */
          <>
            녹음이 끝나고 마지막 파일이 제출됩니다.
            <br />
            요약은 백그라운드에서 진행됩니다.
            <br />
            종료한 뒤에는 다시 녹음할 수 없습니다.
          </>
        }
        confirmLabel="종료"
        isDestructive
        mark="alert"
        onConfirm={() => {
          setIsConfirming(false);
          void finishMeeting();
        }}
      />
    </>
  );
}

/**
 * 녹음 준비 — 가운데 한 장(DESIGN §4 폭: 확인 화면 560).
 *
 * ⚠️ 시작하기 전에 **무엇이 시작되고 무엇이 아직 아닌지** 적는다. 버튼만 두면 누르는 순간
 *    마이크 권한 창이 떠서, 무슨 일인지 모른 채 거부하게 된다.
 * ⚠️ 이 화면은 **서버를 안 부른다** — 브라우저·마이크를 확인하는 자리일 뿐이다. 전에는
 *    [입장]이라 불렀는데(2026-08-11 개명), 회의에 들어가는 별도 단계가 있는 것처럼 읽혀
 *    백엔드의 "입장" API가 상태를 바꾸는 자리로 오해될 소지가 있었다. 회의가 실제로
 *    시작되는 순간은 [녹음 시작] 하나뿐이다.
 */
interface ReadyCardProps {
  meeting: MeetingCaptureInfo;
  /** 이 브라우저가 받쳐 주는가 — 하나라도 없으면 안내를 먼저 띄운다 */
  support: { stt: boolean; recording: boolean };
  onReady: () => void;
  /**
   * 새로고침·크래시로 잃은 진행 중 캡처(CAP-09).
   *
   * ⚠️ **`null`이 정상**이다(진행 중 없음). 값이 있고 이 회의라면 [이어하기] 안내를,
   *    다른 회의라면 "지금 다른 회의 녹음 중" 안내를 붙인다 — 아무 말 없이 BEFORE_START로
   *    두면 이미 녹음 중인 회의를 처음부터 다시 시작할 수 있다(§정직성).
   */
  activeCapture: ActiveCapture | null;
  /** CAP-08 — 같은 회의 복구일 때만 값이 온다(안내 전용, `use-capture` 주석) */
  uploadStatus: PartsUploadStatus | null;
}

function ReadyCard({ meeting, support, onReady, activeCapture, uploadStatus }: ReadyCardProps) {
  const unsupported = !support.stt || !support.recording;
  /*
    ⚠️ **다른 회의는 안내만 다르게**(같은 회의 이어하기와 뜻이 반대다) — 카드 안에 두 경우를
       한 자리에 담고, 여기 판정은 두 경우 모두 `activeCapture !== null` 이면 켠다.
  */
  const isSameMeeting = activeCapture !== null && String(activeCapture.meetingId) === meeting.id;

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col justify-center py-16">
      <section className="border-border bg-card rounded-2xl border p-7 text-center">
        <ProjectTag tag={meeting.projectTag} className="mx-auto" />
        {/* ⚠️ `h2`다 — 페이지의 `h1`은 상단바가 갖고 있다(§SEO: h1 1개) */}
        <h2 className="pt-3 text-[17px] leading-7 font-semibold tracking-[-0.3px] break-keep">
          {meeting.title}
        </h2>
        <p className="text-muted-foreground pt-1.5 text-[13px] leading-5">
          {meeting.schedule} · {meeting.roomName}
        </p>

        {/* 참석자 — 얼굴을 겹쳐 두고 수를 적는다. 아바타 색은 사람마다 고정이다(DESIGN §5) */}
        <div className="flex items-center justify-center gap-2 pt-5">
          <span className="flex -space-x-2">
            {meeting.attendees.map((attendee) => (
              <span key={attendee.id} className="ring-card rounded-full ring-2">
                <ProfileAvatar userId={attendee.id} size={28} />
              </span>
            ))}
          </span>
          <span className="text-muted-foreground text-[12px] leading-4 tabular-nums">
            {meeting.attendees.length}명 참석
          </span>
        </div>

        {unsupported && <UnsupportedNotice support={support} className="mt-6" />}

        {activeCapture !== null && (
          /*
            ⚠️ **새로고침·크래시 복구 안내**(CAP-09). 두 경우가 문구만 다르다:
               - 같은 회의: "이 회의는 이미 녹음 중입니다" + [준비 완료] → 다음 화면에서 [녹음 이어하기]
               - 다른 회의: 이 화면에서 이어받을 수는 없다(회의별 화면 단위) — 사실만 알린다
            ⚠️ 시각을 지어내지 않는다 — `elapsedMs`만 있고 인간 표기는 화면 회복 후에도 계속
               갱신되어야 하므로 여기서는 "이미 진행 중"이라는 사실만 문구로 남긴다.
          */
          <p
            role="status"
            className="border-border bg-secondary/50 mt-6 rounded-lg border px-3.5 py-2.5 text-left text-[12px] leading-4"
          >
            {isSameMeeting
              ? /*
                  ⚠️ 업로드 상태(CAP-08)는 **있을 때만 병기한다** — 조회가 실패해도 복구 안내
                     자체는 성립한다(재개는 presign이 이어 발급). 분량은 근사치라 "약"을 뗄 수
                     없고, 유실 구간은 되살릴 수 없다는 사실까지 말한다(§정직성).
                */
                `이 회의는 이미 녹음 중입니다. [준비 완료] 후 [녹음 이어하기]를 눌러 주세요.${
                  uploadStatus !== null ? ` ${describeUploadedParts(uploadStatus)}` : ""
                }`
              : "지금 다른 회의를 녹음 중입니다. 이 회의에서 새로 시작하면 그쪽 세션은 그대로 남습니다."}
          </p>
        )}

        <Button
          type="button"
          variant="ink"
          className="mt-6 h-11 w-full text-[13px]"
          onClick={onReady}
        >
          준비 완료
        </Button>
        <p className="text-muted-foreground pt-2 text-[11px] leading-4 break-keep">
          아직 녹음은 시작되지 않습니다. 다음 화면에서 [녹음 시작]을 눌러 주세요.
        </p>
      </section>
    </div>
  );
}

/** 실시간 자막 — 화자 구분 없이 청크 단위다(§3-2) */
function TranscriptCard({
  chunks,
  partial,
  isRecording,
  isPaused,
}: {
  chunks: { id: string; at: string; atMs: number; text: string; speaker: string | null }[];
  partial: string;
  isRecording: boolean;
  isPaused: boolean;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  /** 바닥에 붙어 있는가 — **새 줄이 들어오기 전** 값이라야 판정이 맞다 */
  const isPinnedRef = useRef(true);

  /*
    ⚠️ **삽입 뒤에 거리를 재면 안 된다.** 새 문장이 이미 높이를 늘린 뒤라, 긴 문장 하나가
       들어오면 "멀어졌다"고 잘못 읽고 따라가지 않는다 — 그래서 스크롤할 때마다 미리 적어 둔다.
    ⚠️ 위로 올려 지난 말을 읽는 중이면 **끌어내리지 않는다.** 읽던 자리를 빼앗는 게 놓친
       한 줄보다 성가시다.
  */
  const handleScroll = () => {
    const list = listRef.current;
    if (!list) return;
    isPinnedRef.current = list.scrollHeight - list.scrollTop - list.clientHeight <= 80;
  };

  /*
    ⚠️ 흐린 줄(`partial`)이 자라도 같이 따라간다 — 말하는 동안 그 줄이 화면 밖으로 나가면
       인식되고 있는지 볼 수가 없다.
  */
  useEffect(() => {
    const list = listRef.current;
    if (!list || !isPinnedRef.current) return;
    list.scrollTop = list.scrollHeight;
  }, [chunks.length, partial]);

  return (
    <section className="border-border bg-card flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border">
      <div className="flex items-center justify-between gap-3 px-7 pt-6 pb-3">
        <h2 className="flex min-w-0 items-center gap-2 text-[17px] leading-7 font-semibold tracking-[-0.3px]">
          {/*
            ⚠️ 도는 중일 때만 점이 산다. **색이 아니라 깜빡임**으로 알린다 —
               색으로 알리는 건 에러뿐이다(DESIGN §5).
          */}
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              isRecording ? "bg-foreground animate-pulse" : "bg-foreground/30",
            )}
            aria-hidden
          />
          실시간 자막
          <span className="text-muted-foreground truncate text-[12px] leading-4 font-normal">
            {isRecording ? "인식 중" : isPaused ? "멈춤" : "녹음 시작 후 표시됩니다"}
          </span>
        </h2>
        <span className="text-muted-foreground shrink-0 text-[12px] leading-4 tabular-nums">
          {chunks.length}건
        </span>
      </div>

      {chunks.length === 0 && !partial ? (
        /* 빈 상태 — 왜 비었는지, 무엇을 하면 되는지 말한다(DESIGN §8) */
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-7 pb-12 text-center">
          <Mic className="text-muted-foreground/50 size-6" aria-hidden />
          <p className="text-[13px] leading-5 break-keep">
            녹음을 시작하면 실시간 자막이 표시됩니다
          </p>
          <p className="text-muted-foreground text-[12px] leading-4 break-keep">
            문장 단위로 기록됩니다
          </p>
        </div>
      ) : (
        <ol
          ref={listRef}
          onScroll={handleScroll}
          className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-7 pb-6"
        >
          {/*
            ⚠️ **시간은 왼쪽 고정폭 홈통이다** — 상세 화면의 발화 기록과 같은 모양이다.
               같은 내용을 두 화면이 다르게 그리면 회의가 끝나는 순간 기록이 낯설어진다.
            ⚠️ 한때 줄마다 테두리 카드에 시각을 윗줄로 올렸는데, 한 문장이 90px를 먹어
               화면에 대여섯 줄밖에 안 들어왔다 — 실시간 자막은 **흐름이 보여야** 한다.
            ⚠️ `자동 인식` 꼬리표를 줄마다 붙이지 않는다. 모든 줄이 같은 값이라 아무것도
               구분하지 못하면서 자리만 먹었다 — 그 말은 카드 머리가 한 번 한다.
          */}
          {chunks.map((chunk) => (
            /*
              ⚠️ **한 문장이 옅은 박스 하나다.** 줄만 그어 두니 짧은 말("그대여")에서는 글자가
                 왼쪽 200px만 채우고 오른쪽 800px이 허옇게 비어, 화면 반쪽만 쓰는 것처럼
                 보였다 — 박스가 폭을 끝까지 채워 주면 그 빈 자리가 면으로 읽힌다.
              ⚠️ 시각은 박스 **안쪽 왼쪽 홈통**이다. 윗줄로 올리면 한 문장이 두 줄을 먹어
                 한 화면에 대여섯 개밖에 안 들어온다.
            */
            <li
              key={chunk.id}
              className="border-border bg-secondary/40 flex items-baseline gap-3.5 rounded-lg border px-4 py-2.5"
            >
              {/* 시각은 **참고값**이다 — 문장보다 한 단계 작고 옅게 둬서 눈이 글에 먼저 간다 */}
              <span className="text-muted-foreground/60 w-9 shrink-0 text-[11px] leading-5 tabular-nums">
                {chunk.at}
              </span>
              <p className="min-w-0 flex-1 text-[13px] leading-5 break-keep">
                {/*
                  ⚠️ **남이 한 말에만 이름을 붙인다.** 내 말에까지 달면 줄마다 같은 이름이
                     반복돼 아무것도 구분하지 못하면서 자리만 먹는다(`자동 인식` 꼬리표를
                     걷어낸 것과 같은 판단).
                  ⚠️ 이름은 **글 안에 이어 둔다.** 시각처럼 별도 홈통을 만들면 이름이 없는
                     내 줄에 빈 자리가 생겨 글이 들쭉날쭉해진다.
                */}
                {chunk.speaker && (
                  <span className="text-muted-foreground mr-1.5 font-medium">{chunk.speaker}</span>
                )}
                {chunk.text}
              </p>
            </li>
          ))}

          {/*
            아직 확정 전인 말.
            ⚠️ 확정된 줄과 **같은 홈통**에 두되 시각 자리는 비운다 — 아직 시각이 정해지지
               않았고, 확정되는 순간 그 자리에 채워지며 자연스럽게 이어진다.
            ⚠️ **기울임을 쓰지 않는다.** 한글 폰트는 이탤릭이 없어서 브라우저가 글자를 억지로
               기울이는데(가짜 기울임), 획이 뭉개져 깨진 글씨로 보인다 — 곧 뒤집힐 값이라는 건
               **옅은 색과 깜빡이는 점**이 말한다.
          */}
          {partial && (
            /*
              ⚠️ 확정된 줄과 **같은 박스**를 쓰되 테두리를 점선으로 둔다 — 자리는 같아서
                 확정되는 순간 매끄럽게 이어지고, 아직 굳지 않은 값이라는 건 선이 말한다.
            */
            <li className="border-border/70 flex items-baseline gap-3.5 rounded-lg border border-dashed px-4 py-2.5">
              {/*
                시각 자리에 **듣고 있다는 표시**를 둔다. 시각은 문장이 확정될 때 정해지므로
                아직 비어 있는데, 그냥 비워 두면 앞줄이 밀린 것처럼 보였다.
              */}
              <span className="flex w-9 shrink-0 items-center pt-2" aria-hidden>
                <span className="bg-foreground/40 size-1.5 animate-pulse rounded-full" />
              </span>
              <p className="text-muted-foreground min-w-0 flex-1 text-[13px] leading-5 break-keep">
                {partial}
              </p>
            </li>
          )}
        </ol>
      )}
    </section>
  );
}

/** 참가자 레일 — 이름 아래 소속, 진행자는 오른쪽에 표시 */
function AttendeeCard({ attendees }: { attendees: CaptureAttendee[] }) {
  return (
    <section className="border-border bg-card flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border">
      <div className="flex items-center justify-between gap-3 px-7 pt-6 pb-3">
        <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">참가자</h2>
        <span className="text-muted-foreground text-[12px] leading-4 tabular-nums">
          {attendees.length}명
        </span>
      </div>
      <ul className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-7 pb-6">
        {attendees.map((attendee) => (
          <li key={attendee.id} className="flex items-center gap-2.5">
            <ProfileAvatar userId={attendee.id} size={32} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] leading-5">{attendee.name}</span>
              {attendee.subtitle && (
                <span className="text-muted-foreground block truncate text-[11px] leading-4">
                  {attendee.subtitle}
                </span>
              )}
            </span>
            {/* 회의 당시 참석자 스냅샷 — 지금 명부에서 빠졌어도 "퇴사" 표시만 붙인다(FE 감사 #13) */}
            {attendee.isResigned && (
              <Badge
                variant="outline"
                className={cn("shrink-0", MEMBER_STATUS_BADGE_CLASS.RESIGNED)}
              >
                {MEMBER_STATUS_LABEL.RESIGNED}
              </Badge>
            )}
            {attendee.isHost && (
              <span className="border-border text-muted-foreground shrink-0 rounded border px-1.5 py-0.5 text-[11px] leading-4">
                진행
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * 프로젝트 태그 칩 — 색은 `pickPaletteColor`가 정한다(DESIGN §5).
 * ⚠️ 배경과 글자를 **같은 벌**에서 꺼낸다. 다른 벌을 섞으면 대비가 무너진다.
 */
function ProjectTag({ tag, className }: { tag: string; className?: string }) {
  const color = pickPaletteColor(tag);
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] leading-none font-medium",
        className,
      )}
      style={{ backgroundColor: color.bgColor, color: color.textColor }}
    >
      {tag}
    </span>
  );
}

/** 지금 무슨 상태인지 — 색이 아니라 **명도**로 가른다(DESIGN §5) */
function PhaseBadge({ phase }: { phase: CapturePhase }) {
  const LABEL: Record<CapturePhase, string> = {
    BEFORE_START: "대기",
    READY: "대기",
    RECORDING: "녹음 중",
    PAUSED: "일시정지",
    ENDED: "종료됨",
  };

  return (
    <span
      className={cn(
        "shrink-0 rounded border px-2 py-0.5 text-[11px] leading-4",
        phase === CAPTURE_PHASE.RECORDING
          ? "border-foreground/35 bg-foreground/[0.06] text-foreground font-medium"
          : "border-border text-muted-foreground",
      )}
    >
      {LABEL[phase]}
    </span>
  );
}

/**
 * 미지원 브라우저 안내 — **조용히 안 되는 척하지 않는다**(CLAUDE.md §브라우저 API).
 * ⚠️ 무엇이 안 되는지 갈라 적는다. "지원하지 않습니다" 한 줄이면 녹음이 안 되는지 자막이
 *    안 되는지 알 수 없어서, 회의를 그냥 진행했다가 기록이 통째로 빈다.
 */
function UnsupportedNotice({
  support,
  className,
}: {
  support: { stt: boolean; recording: boolean };
  className?: string;
}) {
  const missing = [!support.recording && "녹음", !support.stt && "자막"].filter(Boolean).join("·");

  return (
    <p
      className={cn(
        "border-destructive/30 bg-destructive/5 flex items-start gap-2 rounded-lg border px-3.5 py-3 text-left text-[12px] leading-[18px] break-keep",
        className,
      )}
    >
      <span className="flex h-[18px] shrink-0 items-center">
        <CircleAlert className="text-destructive size-3.5" aria-hidden />
      </span>
      <span>
        이 브라우저에서는 <b>{missing}</b>이 동작하지 않습니다. Chrome 계열 브라우저에서 다시 열어
        주세요.
      </span>
    </p>
  );
}
