import { ChevronRight } from "lucide-react";
import Link from "next/link";

import type { PendingReviewSummary } from "@/features/meeting/review/types";

interface UnconfirmedActionListProps {
  reviews: PendingReviewSummary[];
}

/**
 * "미확정 액션" 그룹의 행들 — **회의 제목으로 줄을 나눈다**(사용자 확정, 2026-08-07).
 * 부제는 "분배를 확정해야 할 액션 N건". 줄을 누르면 그 회의의 리뷰 화면으로 이동해
 * 그대로 이어서 처리한다(`/app/meeting/:id/review`, 새 화면을 안 만들고 재사용).
 * ⚠️ 카드 틀·빈 상태는 `TaskGroupSection`이 맡는다 — 여기는 행만 그린다.
 */
export function UnconfirmedActionList({ reviews }: UnconfirmedActionListProps) {
  return (
    <>
      {reviews.map((review) => (
        <Link
          key={review.meetingId}
          href={`/app/meeting/${review.meetingId}/review`}
          className="border-border hover:bg-muted/50 flex items-center justify-between gap-3 px-7 py-3.5 transition-colors not-first:border-t"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="truncate text-[13px] leading-5 font-medium">{review.meetingTitle}</p>
            <p className="text-muted-foreground text-[12px] leading-4 tabular-nums">
              분배를 확정해야 할 액션 {review.actionCount}건
            </p>
          </div>
          <ChevronRight className="text-muted-foreground/50 size-4 shrink-0" aria-hidden />
        </Link>
      ))}
    </>
  );
}
