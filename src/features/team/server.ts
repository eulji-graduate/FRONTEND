import type { MemberStatus } from "@/constants/domain";
import { requireAccessToken } from "@/features/auth/session";
import { parseDashboardMeetings, toDashboardMeetingCard } from "@/features/meeting/mapper";
import { serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { isMock } from "@/mocks/config";

import { MEETING_MAX_ITEMS } from "./lib";
import { TEAM_DASHBOARD_MOCK } from "./mock/dashboard";
import type { TeamDashboardMember, TeamDashboardOverview } from "./types";

/** [확인] BE `TeamDashboardSummaryResponse` — PR #354 머지 완료. */
interface BeTeamDashboardSummary {
  teamActionCount: number;
  teamMemberActionCount: number;
  myActionCount: number;
  completedActionCount: number;
}

/** [확인] BE `TeamMemberStatusResponse` — PR #354 머지 완료. */
interface BeTeamMemberStatus {
  memberId: number;
  name: string;
  positionName: string | null;
  roleName: string | null;
  status: MemberStatus;
  actionCount: number;
}

function toTeamDashboardMember(be: BeTeamMemberStatus): TeamDashboardMember {
  return {
    id: String(be.memberId),
    name: be.name,
    position: be.positionName ?? "",
    role: be.roleName ?? "없음",
    assignedActionCount: be.actionCount,
    status: be.status,
  };
}

/**
 * 최근 팀 회의 — **못 받아 와도 대시보드를 죽이지 않는다**(2026-08-13, 코드래빗 지적).
 *
 * ⚠️ KPI·팀원 현황과 같은 `Promise.all`에 그대로 실으면 **회의 조회 하나가 넘어질 때 화면
 *    전체가 `error.tsx`로 사라진다** — 이 카드는 대시보드의 곁 정보이고, 팀장이 보러 오는 건
 *    액션 수와 팀원 현황이다.
 * ⚠️ **`scope=team`은 토큰에 `teamId`가 있어야 통과한다**(403 Z-001, BE
 *    `DashboardMeetingQueryService.validateRoleScope`). 화면 가드(`canAccessTeamScope`)는
 *    LEADER인지만 보므로 **팀이 없는 팀장은 여기까지 온다** — 받을 수 없는 걸 물어보지 않는다.
 * ⚠️ **못 받아 온 자리는 `null`이다 — 빈 목록이 아니다**(2026-08-13 고침). 빈 목록으로
 *    뭉치면 화면이 "예정된 팀 회의가 없습니다"라고 **없는 사실을 단정**한다(§정직성):
 *    다섯 건이 잡혀 있는 팀장이 없다고 믿고 새 회의를 잡으러 간다. 화면이 실패를 실패라고
 *    말할 수 있게 계약에 "미조회"를 연다(§types `meetings`).
 * ⚠️ 팀이 없는 팀장은 `[]`다 — 그건 실패가 아니라 **정말로 없는 것**이다(팀이 없으면 팀
 *    회의도 없다). 물어보지 않았을 뿐 답을 아는 경우라 미조회와 섞지 않는다.
 */
async function listRecentTeamMeetings(
  teamId: number | undefined,
  accessToken: string,
): Promise<TeamDashboardOverview["meetings"]> {
  if (teamId === undefined) return [];

  try {
    const raw = await serverApi<unknown>(
      ep.meetingsDashboard({ scope: "team", limit: MEETING_MAX_ITEMS }),
      { accessToken },
    );
    return parseDashboardMeetings(raw).map(toDashboardMeetingCard);
  } catch {
    /*
      ⚠️ **삼키되 없던 일로 하지 않는다.** 여기서 잡는 건 통신 실패(`ApiError`)만이 아니라
         `parseDashboardMeetings`의 shape 오류도 마찬가지인데, 둘 다 화면엔 "못 불러왔다"로
         같은 얼굴이다 — 사라지는 건 대시보드가 아니라 이 카드 하나뿐이다.
    */
    return null;
  }
}

export async function getTeamDashboardOverview(viewer: {
  teamId?: number;
  teamName?: string;
}): Promise<TeamDashboardOverview> {
  if (isMock) {
    return {
      ...TEAM_DASHBOARD_MOCK,
      // 최신순(내림차순)으로 위에서부터. 박스가 이 수에 딱 맞춰 그려지므로 서버도 같은 수로 자른다.
      meetings: [...(TEAM_DASHBOARD_MOCK.meetings ?? [])]
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
        .slice(0, MEETING_MAX_ITEMS),
    };
  }

  const accessToken = await requireAccessToken();
  /*
    ⚠️ 자르는 수는 **화면이 정한다**(`MEETING_MAX_ITEMS`). 박스 높이가 이 수에서 나오므로
       서버가 더 주면 스크롤이 생기고, 덜 주면 카드 바닥이 빈다(§team/lib).
    ⚠️ 셋을 같이 부른다 — 차례로 부르면 대시보드가 세 번 기다린다.
    ⚠️ **회의만 실패를 삼킨다**(`listRecentTeamMeetings`). KPI·팀원 현황이 없으면 이 화면은
       할 말이 없지만, 곁 카드 하나 때문에 나머지까지 지울 이유는 없다.
  */
  const [summary, members, meetings] = await Promise.all([
    serverApi<BeTeamDashboardSummary>(ep.teamDashboardSummary(), { accessToken }),
    serverApi<BeTeamMemberStatus[]>(ep.teamMembers(), { accessToken }),
    listRecentTeamMeetings(viewer.teamId, accessToken),
  ]);

  return {
    teamName: viewer.teamName ?? "",
    teamActionCount: summary.teamActionCount,
    memberActionCount: summary.teamMemberActionCount,
    myActionCount: summary.myActionCount,
    doneActionCount: summary.completedActionCount,
    members: members.map(toTeamDashboardMember),
    /*
      ⚠️ **정렬은 서버 것을 그대로 쓴다**(MEET-17이 최근 순을 보장한다 — BE 저장소 계약).
         목 경로처럼 여기서 다시 정렬하면 서버가 고른 5건과 우리가 세운 차례가 어긋난다.
      ⚠️ `originLabel`은 `scope=team`에서 **항상 비어 온다**(명세에 정의가 없다고 BE가
         `null`로 둔다) — 매퍼가 키째로 빼고 화면은 그 배지를 안 그린다(§정직성).
    */
    meetings,
  };
}
