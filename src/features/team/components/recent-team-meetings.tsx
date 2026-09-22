import { CalendarClock } from "lucide-react";

import {
  type DashboardMeeting,
  DashboardMeetingItem,
} from "@/components/common/dashboard-meeting-item";
import { EmptyState } from "@/components/common/empty-state";

/**
 * 팀장 대시보드의 «최근 팀 회의» 카드.
 *
 * ⚠️ **못 불러온 것과 없는 것을 가른다.** 조회가 넘어졌을 때 빈 목록과 같은 문구를 내면
 *    화면이 "예정된 팀 회의가 없습니다"라고 **없는 사실을 단정**한다(§정직성) — 다섯 건이
 *    잡혀 있는 팀장이 없다고 믿고 새 회의를 잡으러 간다. 서버가 `null`로 그 차이를
 *    넘겨준다(§team/types `meetings`).
 * ⚠️ 실패 자리에도 **`EmptyState`를 그대로 쓴다** — 앱 전체가 쓰는 빈 상태와 생김새가 같아야
 *    카드가 반쯤 지어진 것처럼 보이지 않는다(§components/common/empty-state).
 * ⚠️ 높이를 고정하지 않는다 — 다섯 건이 하드 캡이라 자라 봐야 다섯 줄이다(`lib.ts` 참고).
 */
export function RecentTeamMeetings({ meetings }: { meetings: DashboardMeeting[] | null }) {
  return (
    <section className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
      <div className="border-border flex shrink-0 items-baseline justify-between gap-3 border-b px-7 pt-6 pb-3">
        <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">최근 팀 회의</h2>
        <span className="text-muted-foreground text-[12px] leading-4">최신 5건</span>
      </div>
      {meetings === null ? (
        <EmptyState
          className="flex-1"
          icon={CalendarClock}
          title="최근 팀 회의를 불러오지 못했습니다."
          description="잠시 뒤 새로고침해 주세요. 회의가 없는 것이 아니라 지금 목록을 받아오지 못한 것입니다."
        />
      ) : meetings.length === 0 ? (
        <EmptyState
          className="flex-1"
          icon={CalendarClock}
          title="예정된 팀 회의가 없습니다."
          description="회의실을 예약하면 그 자리에서 회의가 열립니다."
        />
      ) : (
        <ul>
          {meetings.map((meeting, index) => (
            <DashboardMeetingItem key={meeting.id} meeting={meeting} showDivider={index > 0} />
          ))}
        </ul>
      )}
    </section>
  );
}
