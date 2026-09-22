import { CircleCheck, Lock } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/common/empty-state";
import { MeetingReviewView } from "@/features/meeting/review/components/meeting-review-view";
import { getMeetingReview } from "@/features/meeting/review/server";

export const metadata: Metadata = {
  title: "AI 액션 분배 결과",
};

interface MeetingReviewPageProps {
  params: Promise<{ meetingId: string }>;
}

export default async function MeetingReviewPage({ params }: MeetingReviewPageProps) {
  const { meetingId } = await params;
  const result = await getMeetingReview(meetingId);

  if (result.kind === "notFound") notFound();

  return (
    <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto w-full max-w-[1440px]">
        {result.kind === "ok" ? (
          <MeetingReviewView review={result.review} />
        ) : result.kind === "alreadyConfirmed" ? (
          /*
           * ⚠️ 1회성 화면 정책(WORKFLOW.md §3-4)은 원래 회의 상세로 리다이렉트지만,
           *    `/app/meeting/:id` 상세 라우트가 아직 이 브랜치에 없어(#216/PR #218 미머지)
           *    임시로 안내만 보여준다. 그 라우트가 들어오면 `redirect()`로 바꾼다.
           */
          <section className="border-border bg-card rounded-2xl border">
            <EmptyState
              icon={CircleCheck}
              title="이미 액션 분배를 확정한 회의입니다."
              description="이 화면은 다시 열 수 없습니다."
            />
          </section>
        ) : (
          <section className="border-border bg-card rounded-2xl border">
            <EmptyState
              icon={Lock}
              title="Host만 열 수 있는 화면입니다."
              description="이 회의를 개설한 사람만 액션 분배를 검토할 수 있습니다."
            />
          </section>
        )}
      </div>
    </main>
  );
}
