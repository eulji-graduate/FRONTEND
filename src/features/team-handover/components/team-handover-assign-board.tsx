"use client";

import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HANDOVER_TYPE } from "@/constants/domain";
import { ActionTimeline } from "@/features/member/components/action-timeline";
import { cn } from "@/lib/utils";

import { completeTeamHandoverAction, rejectTeamHandoverAction } from "../actions";
import { buildTimelineInput, isReadyToComplete, toAssignmentList } from "../lib";
import type { TeamHandoverDetail } from "../types";
import { TeamHandoverAssignRow } from "./team-handover-assign-row";

interface TeamHandoverAssignBoardProps {
  handover: TeamHandoverDetail;
  /** 서버가 렌더링한 오늘. `YYYY-MM-DD`. */
  todayIso: string;
}

const LIST_PATH = "/team/handover";
/** 반려 사유 상한 — `handover-approval-card.tsx`와 같은 값. */
const REASON_MAX = 200;

/**
 * 위(타임라인, 읽기 전용)에서 액션을 한눈에 확인하고, 아래 "배정할 액션" 목록의
 * `<Select>`로 각 액션의 담당자를 고른다. [인수인계 확정]을 눌러야 실제로 반영된다
 * (`board-view.tsx`의 "로컬에서 바꾸고 확정 시에만 서버 반영" 원칙과 같음).
 * ⚠️ **드래그 앤 드롭·별도 팀원 보드 영역은 없다**(2026-08-09 디자인 리뷰로 제거) —
 *    배정한 항목이 "배정할 액션"에도 그대로 남아 보여 어디에 배정됐는지 헷갈렸고,
 *    화면 하나에 같은 정보(담당자)가 두 군데(칩의 `<Select>` 값 + 팀원 칸 안 카드)로
 *    중복 표시되는 문제가 있었다 — `<Select>` 하나로 배정 상태를 표현하는 게 더 명확하다.
 * ⚠️ **[반려]도 여기서 한다**(WORKFLOW.md §7, 2026-08-09 팀 확정) — 오너의 최종 승인/반려와
 *    별개로, 팀장이 인계 액션 누락·오배정을 이 단계에서 먼저 걸러낸다.
 */
export function TeamHandoverAssignBoard({ handover, todayIso }: TeamHandoverAssignBoardProps) {
  const today = useMemo(() => new Date(`${todayIso}T00:00:00`), [todayIso]);
  const timelineItems = useMemo(() => buildTimelineInput(handover.actions), [handover.actions]);
  const [assignments, setAssignments] = useState<Record<number, number>>({});
  /** 지금 확인을 기다리는 일 — 확정도 반려도 되돌릴 수 없다(§handover-approval-card와 같은 원칙). */
  const [confirming, setConfirming] = useState<"complete" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (confirming === "reject") reasonRef.current?.focus();
  }, [confirming]);

  const assignedCount = Object.keys(assignments).length;
  const totalCount = handover.actions.length;
  const ready = isReadyToComplete(handover.actions, assignments);

  function handleComplete() {
    setError(null);
    startTransition(async () => {
      /*
        ⚠️ **거절도 받아 낸다.** 액션은 BE 실패를 값으로 돌려주지만, 브라우저에서 Next 서버까지
           가는 길이 끊기면(네트워크·서버 재시작·배포) `await` 자체가 던진다 — 안 잡으면 화면이
           통째로 `error.tsx`로 넘어가거나 잠긴 채로 남는다(2026-08-12 전 화면 정리).
      */
      let result;
      try {
        result = await completeTeamHandoverAction(
          handover.handoverId,
          toAssignmentList(assignments),
        );
      } catch {
        setError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      if (!result.isSuccess) {
        setError(result.message ?? "처리하지 못했습니다");
        return;
      }
      setConfirming(null);
      toast.success("인수인계를 확정했습니다");
      router.replace(LIST_PATH);
    });
  }

  function handleReject() {
    if (!reason.trim()) {
      setReasonError("반려 사유를 적어 주세요");
      reasonRef.current?.focus();
      return;
    }
    setReasonError(null);
    setError(null);
    startTransition(async () => {
      /* ⚠️ 확정과 같은 이유로 거절도 받아 낸다 — 위 주석 참고 */
      let result;
      try {
        result = await rejectTeamHandoverAction(handover.handoverId, reason);
      } catch {
        setError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      if (!result.isSuccess) {
        setError(result.message ?? "처리하지 못했습니다");
        return;
      }
      setConfirming(null);
      toast.success("인수인계서를 반려했습니다");
      router.replace(LIST_PATH);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-[13px] leading-5 tabular-nums">
          {assignedCount}/{totalCount}건 배정 완료
        </p>
        {/*
          ⚠️ **오프보딩만 PDF를 둔다.** 휴직은 돌아올 사람이라 이 화면의 배정 자체가 임시
             기록이지만, 오프보딩은 퇴사 뒤 남는 유일한 인수인계 문서라 보관용 PDF가 필요하다.
        */}
        {handover.type === HANDOVER_TYPE.OFFBOARDING && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              window.open(
                `/api/handovers/${handover.handoverId}/pdf`,
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            <Download />
            인수인계서 PDF 다운로드
          </Button>
        )}
      </div>

      {/* ⚠️ 높이는 그대로 둔다 — 액션이 여러 줄일 때를 위해 미리 잡아 둔 자리다 */}
      <section className="border-border bg-card flex h-[280px] flex-col rounded-2xl border p-5">
        <ActionTimeline items={timelineItems} today={today} emptyLabel="넘길 액션이 없습니다." />
      </section>

      <section className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
        <div className="flex items-baseline justify-between gap-3 px-7 pt-6 pb-3">
          <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">배정할 액션</h2>
        </div>

        {/* 표 머리 — 머리와 값이 열마다 같은 축을 쓴다(§DESIGN 3) */}
        <div className="border-border text-muted-foreground bg-secondary/50 flex items-center gap-4 border-y px-7 py-3 text-[12px] leading-4">
          <span className="w-[76px] shrink-0 text-center">프로젝트</span>
          <span className="min-w-0 flex-1">액션</span>
          <span className="w-[72px] shrink-0 text-center">상태</span>
          <span className="w-24 shrink-0 text-center">마감</span>
          <span className="w-40 shrink-0">담당자</span>
        </div>

        <ul>
          {handover.actions.map((action) => (
            <TeamHandoverAssignRow
              key={action.id}
              action={action}
              teammates={handover.teammates}
              assignedTo={assignments[action.id] ?? null}
              onAssign={(assigneeId) =>
                setAssignments((prev) => ({ ...prev, [action.id]: assigneeId }))
              }
            />
          ))}
        </ul>
      </section>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={() => {
            setError(null);
            setConfirming("reject");
          }}
        >
          반려
        </Button>
        <Button
          size="sm"
          disabled={!ready}
          onClick={() => {
            setError(null);
            setConfirming("complete");
          }}
          className="bg-foreground text-background hover:bg-foreground/90"
        >
          인수인계 확정
        </Button>
      </div>

      <ConfirmDialog
        isOpen={confirming === "complete"}
        onOpenChange={(open) => {
          setConfirming(open ? "complete" : null);
          if (!open) setError(null);
        }}
        title="인수인계를 확정할까요?"
        description={`배정한 대로 액션 ${totalCount}건의 담당자가 바뀌고, 팀장 중간 승인이 기록됩니다. 되돌릴 수 없습니다.`}
        confirmLabel="인수인계 확정"
        isPending={isPending}
        pendingLabel="처리 중"
        error={error}
        onConfirm={handleComplete}
      />

      {/*
        ⚠️ **사유를 이 창에서 받는다**(`handover-approval-card.tsx`와 같은 이유) — 카드 안에
           붉은 칸을 펼치고 그다음 확인 창을 또 띄우면 같은 일을 두 번 묻는다.
      */}
      <ConfirmDialog
        isOpen={confirming === "reject"}
        onOpenChange={(open) => {
          setConfirming(open ? "reject" : null);
          if (!open) {
            setReason("");
            setReasonError(null);
            setError(null);
          }
        }}
        error={error}
        title={`${handover.memberName} 님의 인수인계서를 반려할까요?`}
        description={
          <>
            신청이 되돌아가고 {handover.memberName} 님은 다시 재직 상태가 됩니다.
            <br />
            다시 신청하려면 인수인계부터 새로 밟아야 합니다.
          </>
        }
        confirmLabel="반려"
        isDestructive
        mark="alert"
        isPending={isPending}
        pendingLabel="반려 중…"
        onConfirm={handleReject}
      >
        <div className="border-border flex flex-col gap-2 border-t pt-5 text-left">
          <Label htmlFor="team-handover-reject-reason" className="text-[13px] leading-5">
            반려 사유
          </Label>

          <Textarea
            ref={reasonRef}
            id="team-handover-reject-reason"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value.slice(0, REASON_MAX));
              setReasonError(null);
            }}
            rows={3}
            maxLength={REASON_MAX}
            aria-invalid={reasonError !== null}
            aria-describedby={reasonError ? "team-handover-reject-reason-error" : undefined}
            placeholder="예) 인계 대상 액션이 빠졌습니다. 다시 올려 주세요."
            className={cn(
              /*
                ⚠️ **`dark:bg-card`를 같이 준다**(2026-08-19, 적대적 검증에서 발견). 공용
                   `Textarea`의 기본값 `dark:bg-input/30`과 `bg-card`는 tailwind-merge가
                   서로 다른 슬롯(변형자가 다름)으로 봐서 **둘 다 살아남고**, 다크에서는
                   `dark:` 선택자가 명시도로 이겨 카드 배경이 사라졌다. 같은 변형자
                   (`dark:`)로 맞춰 줘야 merge가 올바르게 나중 값(`dark:bg-card`)으로 덮는다.
              */
              "bg-card dark:bg-card px-3 py-2.5",
              reasonError
                ? "border-destructive focus-visible:border-destructive"
                : "border-input focus-visible:border-ring",
            )}
          />

          <div className="text-muted-foreground flex items-baseline justify-between gap-3 text-[12px] leading-4">
            {reasonError ? (
              <p id="team-handover-reject-reason-error" role="alert" className="text-destructive">
                {reasonError}
              </p>
            ) : (
              <span aria-hidden />
            )}
            <p className="shrink-0 tabular-nums">
              {reason.length} / {REASON_MAX}
            </p>
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
