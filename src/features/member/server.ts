import { MEETING_STATUS } from "@/constants/meeting";
import { type BeActionSummary, toMemberAction } from "@/features/action/mapper";
import { requireAccessToken } from "@/features/auth/session";
import { type BeUpcomingMeetingsResponse, toDashboardMeeting } from "@/features/meeting/mapper";
import type { BePageResponse } from "@/features/project/mapper";
import { serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { isMock } from "@/mocks/config";

import { getDaysUntilDue, isDueSoon, MEETING_MAX_ITEMS } from "./lib";
import { MEMBER_ACTIONS_MOCK, MEMBER_ATTENDED_MEETINGS_MOCK } from "./mock/dashboard";
import type { MemberDashboardOverview } from "./types";

export async function getMemberDashboardOverview(): Promise<MemberDashboardOverview> {
  if (isMock) {
    return {
      // 마감 7일 이내(연체 포함)·미완료만, 마감 임박순(연체가 맨 위). 개수 제한 없음 → 박스 내부 스크롤
      dueSoonActions: MEMBER_ACTIONS_MOCK.filter(isDueSoon).sort(
        (a, b) => getDaysUntilDue(a.dueDate) - getDaysUntilDue(b.dueDate),
      ),
      /*
        ⚠️ MEET-03 계약(예정 회의만·가까운 순)에 맞춘 목이다(§정직성 — 목=API 스펙 success
        예시 그대로) — 이 정적 배열엔 완료 회의(mm1·mm2)도 섞여 있었는데 그건 "최신순"
        시절 목이다. 지금은 SCHEDULED·IN_PROGRESS만, 가까운 시간부터.
      */
      attendedMeetings: [...MEMBER_ATTENDED_MEETINGS_MOCK]
        .filter(
          (meeting) =>
            meeting.status === MEETING_STATUS.SCHEDULED ||
            meeting.status === MEETING_STATUS.IN_PROGRESS,
        )
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
        .slice(0, MEETING_MAX_ITEMS),
    };
  }

  // ⚠️ "처리할 액션"은 우리 도메인(개인 액션)이라 바로 연동한다. GET /api/actions는 이미
  //    본인 소유분만 스코프돼 있어서(토큰 기준), 여기선 PERSONAL만 남기고 마감 임박 필터·
  //    정렬만 클라에서 한다(BE 목록에 이 필터 자체가 없다).
  const accessToken = await requireAccessToken();
  const [page, { meetings }] = await Promise.all([
    serverApi<BePageResponse<BeActionSummary>>(ep.actions({ size: 9999 }), { accessToken }),
    // "참석 회의" = 내 예정 회의(MEET-03) — 정렬·필터(SCHEDULED/IN_PROGRESS·가까운 순)는 서버가 한다.
    serverApi<BeUpcomingMeetingsResponse>(ep.meetingsUpcoming({ limit: MEETING_MAX_ITEMS }), {
      accessToken,
    }),
  ]);
  const dueSoonActions = page.content
    .filter((action) => action.actionType === "PERSONAL")
    .map(toMemberAction)
    .filter(isDueSoon)
    .sort((a, b) => getDaysUntilDue(a.dueDate) - getDaysUntilDue(b.dueDate));

  return { dueSoonActions, attendedMeetings: meetings.map(toDashboardMeeting) };
}
