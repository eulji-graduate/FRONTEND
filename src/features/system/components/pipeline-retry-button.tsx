"use client";

import { Check, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { retryPipelineAction } from "../actions";

interface PipelineRetryButtonProps {
  meetingId: string;
}

/**
 * 실패 행의 "재처리" 버튼 — 상호작용 잎사귀만 클라이언트로 둔다(CLAUDE.md §서버우선).
 *
 * ⚠️ 성공하면 버튼을 **"완료" 표시로 바꿔** 같은 건을 다시 누르지 못하게 한다 —
 *    재처리는 큐에 잡을 다시 넣는 조작이라 연타로 중복 투입되면 곤란하다.
 * ⚠️ 지금은 목이라 실제 재처리가 돌지 않는다(§정직성) — 결과는 토스트로만 알린다.
 */
export function PipelineRetryButton({ meetingId }: PipelineRetryButtonProps) {
  const [isDone, setIsDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (isDone) {
    return (
      <span className="text-foreground inline-flex items-center gap-1 text-[12px] leading-4 font-medium">
        <Check className="size-3" strokeWidth={3} aria-hidden />
        완료
      </span>
    );
  }

  const handleRetry = () => {
    startTransition(async () => {
      /*
        ⚠️ **던지는 경우도 잡는다.** 돌려주는 실패 값만 보면 Server Action이 reject될 때
           아무 말도 없이 버튼만 되살아난다 — 눌렀는데 아무 일도 안 일어난 것처럼 보인다.
      */
      try {
        const response = await retryPipelineAction(meetingId);
        if (response.success) {
          setIsDone(true);
          toast.success("재처리를 요청했습니다");
          return;
        }
        toast.error("재처리하지 못했습니다");
      } catch {
        toast.error("재처리하지 못했습니다");
      }
    });
  };

  return (
    <Button type="button" variant="outline" size="xs" onClick={handleRetry} disabled={isPending}>
      <RefreshCw aria-hidden />
      재처리
    </Button>
  );
}
