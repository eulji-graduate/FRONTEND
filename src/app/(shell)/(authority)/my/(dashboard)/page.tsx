import { CalendarClock } from "lucide-react";
import type { Metadata } from "next";

import { AccessDenied } from "@/components/common/access-denied";
import { DashboardMeetingItem } from "@/components/common/dashboard-meeting-item";
import { EmptyState } from "@/components/common/empty-state";
import { isDelayed } from "@/constants/domain";
import type { TimelineActionInput } from "@/features/member/action-timeline";
import { ActionTimeline, ActionTimelineLegend } from "@/features/member/components/action-timeline";
import { DUE_SOON_BOX_MIN_HEIGHT } from "@/features/member/lib";
import { getMemberDashboardOverview } from "@/features/member/server";
import { roleHome } from "@/features/shell/home";
import { getViewer } from "@/features/shell/viewer";
import { pickPaletteColor } from "@/lib/palette";
import { canAccessPersonalScope } from "@/lib/permission";

export const metadata: Metadata = {
  title: "대시보드",
};

export default async function MemberDashboardPage() {
  const viewer = await getViewer();
  if (!canAccessPersonalScope(viewer)) return <AccessDenied homeHref={roleHome(viewer.role)} />;

  const { dueSoonActions, attendedMeetings } = await getMemberDashboardOverview();

  // 지연은 상태가 아니라 마감 경과 파생값이라 여기서 계산해 tone으로 넘긴다(§도메인 상수).
  const timelineItems: TimelineActionInput[] = dueSoonActions.map((action) => {
    const tagColor = pickPaletteColor(action.projectTag);
    return {
      id: action.id,
      title: action.title,
      tag: action.projectTag,
      tagBgColor: tagColor.bgColor,
      tagTextColor: tagColor.textColor,
      startDate: action.startDate,
      dueDate: action.dueDate,
      tone: isDelayed(action) ? "DELAYED" : action.status,
      href: `/app/actions/${action.id}`,
    };
  });

  return (
    <main className="scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto px-8 py-7">
      <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col gap-7">
        {/* ⚠️ 화면엔 제목을 안 그리지만 문서에는 있어야 한다 — `h1`이 없으면 층이 `h2`부터다(§a11y) */}
        <h1 className="sr-only">내 대시보드</h1>

        {/* 처리할 액션 — 시작일→마감일 기간 타임라인. 남는 세로 공간을 채우고 넘치면 내부 스크롤 */}
        <section
          className="border-border bg-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border"
          style={{ minHeight: DUE_SOON_BOX_MIN_HEIGHT }}
        >
          <div className="border-border flex shrink-0 items-baseline justify-between gap-3 border-b px-7 pt-6 pb-3">
            <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">처리할 액션</h2>
            <ActionTimelineLegend />
          </div>
          <ActionTimeline
            items={timelineItems}
            today={new Date()}
            emptyLabel="처리할 액션이 없습니다."
          />
        </section>

        {/*
          참석 회의 — 예정·진행중 5건 고정(MEET-03, 가까운 시간부터).
          ⚠️ 완료 회의는 여기 안 나온다 — "최신 5건"이 아니라 **다가올 회의**를 보여주는
             자리라서다(entry 버튼 없이도 [입장]이 필요한 회의만 남긴다).
        */}
        <section className="border-border bg-card flex shrink-0 flex-col overflow-hidden rounded-2xl border">
          <div className="border-border flex shrink-0 items-baseline justify-between gap-3 border-b px-7 pt-6 pb-3">
            <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">참석 회의</h2>
            <span className="text-muted-foreground text-[12px] leading-4">예정 5건</span>
          </div>
          {attendedMeetings.length === 0 ? (
            <EmptyState
              className="flex-1"
              icon={CalendarClock}
              title="예정된 회의가 없습니다."
              description="회의에 참석자로 담기면 이 자리에 쌓입니다."
            />
          ) : (
            <ul>
              {attendedMeetings.map((meeting, index) => (
                <DashboardMeetingItem key={meeting.id} meeting={meeting} showDivider={index > 0} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
