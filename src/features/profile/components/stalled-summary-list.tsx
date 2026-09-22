"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { retryMeetingSummaryAction } from "@/features/meeting/summary/actions";
import type { StalledSummaryInfo } from "@/features/meeting/summary/types";

interface StalledSummaryListProps {
  summaries: StalledSummaryInfo[];
}

/**
 * "요약이 중단된 회의" 그룹의 행들 — 실시간 진행 배너를 놓친 사람(브라우저를 닫았던
 * 경우 등)이 여기서 뒤늦게 발견하고 [다시 분석]을 요청한다(BE #177 대응).
 * ⚠️ `isStalled`로 문구만 가른다 — 재분석 흐름 자체는 서버 문제든 실제 실패든 같다.
 * ⚠️ 카드 틀·빈 상태는 `TaskGroupSection`이 맡는다 — 여기는 행만 그린다.
 */
export function StalledSummaryList({ summaries }: StalledSummaryListProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRetry(meetingId: string) {
    setPendingId(meetingId);
    startTransition(async () => {
      /*
        ⚠️ **`finally`로 잠금을 푼다**(2026-08-12). 액션이 던지면 `setPendingId(null)`을 못
           지나쳐 그 줄이 [요청 중]에 잠긴 채 남았다 — 버튼은 전부 잠겨 있어(중복 요청 방지)
           다른 회의도 같이 못 누른다.
      */
      try {
        const result = await retryMeetingSummaryAction(meetingId);

        /*
          ⚠️ **결과 네 갈래를 한 문구로 뭉치지 않는다**(ANLZ-02, 2026-08-13 연동).
             ① 재개할 계층이 없다(409 `ANLZ-008`) — 이 버튼으로는 끝난 이야기다. "다시
                시도"라고 하면 몇 번을 눌러도 같은 409를 만난다.
             ② 그 밖의 실패 — BE 문장을 그대로 띄운다(§lib/api: 문구를 새로 짓지 않는다).
             ③ 요청은 갔는데 요약이 아직 없다 — 성공으로 알리면 생기지도 않은 요약을
                보러 가게 된다(§정직성).
             ④ 진짜로 채워졌다.
        */
        if (result.needsFullRerun) {
          toast.error(result.error ?? "재개할 계층이 없습니다");
          return;
        }
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.pendingNote) {
          toast(result.pendingNote);
          return;
        }
        toast.success("재분석을 요청했습니다");
      } catch {
        /*
          ⚠️ **원인을 단정하지 않는다.** 여기까지 오는 건 액션이 값으로 못 접은 실패
             (네트워크·서버 다운 등)뿐이다 — 아는 실패는 전부 위에서 문장을 갖고 온다.
          ⚠️ 토스트는 한 줄(220px)이라 짧게 쓴다(`ui/sonner.tsx`).
        */
        toast.error("재분석을 요청하지 못했습니다");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <>
      {summaries.map((summary) => {
        const isRowPending = isPending && pendingId === summary.meetingId;
        return (
          <div
            key={summary.meetingId}
            className="border-border flex items-center justify-between gap-3 px-7 py-3.5 not-first:border-t"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="truncate text-[13px] leading-5 font-medium">{summary.meetingTitle}</p>
              <p className="text-muted-foreground text-[12px] leading-4">
                {summary.isStalled ? "AI 요약이 중단됐습니다" : "AI 요약에 실패했습니다"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              /*
                ⚠️ **행 하나가 아니라 전부 잠근다.** `pendingId`만 보고 잠그면 요청이 도는
                   동안 다른 행을 눌러 `pendingId`가 바뀌는 순간 첫 행의 버튼이 다시 풀려
                   같은 회의에 중복 요청을 보낼 수 있다(CodeRabbit 지적, 2026-08-09).
              */
              disabled={isPending}
              onClick={() => handleRetry(summary.meetingId)}
            >
              {isRowPending ? "요청 중" : "다시 분석"}
            </Button>
          </div>
        );
      })}
    </>
  );
}
