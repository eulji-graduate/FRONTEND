import type { MemberStatus } from "@/constants/domain";
import { isVisibleMemberStatus } from "@/constants/member";
import { requireAccessToken } from "@/features/auth/session";
import { parseDashboardMeetings, toDashboardMeetingCard } from "@/features/meeting/mapper";
import { serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { isMock } from "@/mocks/config";

import { MEETING_MAX_ITEMS } from "./lib";
import { OWNER_DASHBOARD_MOCK } from "./mock/dashboard";
import type { OwnerDashboardLeaderRow, OwnerDashboardOverview } from "./types";

/** [확인] BE `OwnerDashboardSummaryResponse`(project 도메인) — PR #354 머지 완료. */
interface BeProjectDashboardSummary {
  totalProjectCount: number;
  dueSoonProjectCount: number;
}

/** [확인] BE `MemberDashboardSummaryResponse` — PR #385 머지 완료. */
interface BeMemberDashboardSummary {
  totalMemberCount: number;
  onLeaveMemberCount: number;
}

/** [확인] BE `TeamLeaderStatusResponse` — PR #385 머지 완료. */
interface BeTeamLeaderStatus {
  memberId: number;
  name: string;
  email: string;
  teamId: number;
  teamName: string;
  status: MemberStatus;
  leaveStartDate: string | null;
  leaveEndDate: string | null;
}

/** `2026-08-01`·`2026-08-15` → `8월 1일~15일`(같은 달이면 뒤쪽 월은 생략). */
function formatLeavePeriod(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;

  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  const sMonth = s.getMonth() + 1;
  const eMonth = e.getMonth() + 1;
  const endLabel = sMonth === eMonth ? `${e.getDate()}일` : `${eMonth}월 ${e.getDate()}일`;
  return `${sMonth}월 ${s.getDate()}일~${endLabel}`;
}

function toOwnerDashboardLeaderRow(be: BeTeamLeaderStatus): OwnerDashboardLeaderRow {
  return {
    id: String(be.memberId),
    name: be.name,
    email: be.email,
    department: be.teamName,
    status: be.status,
    leavePeriod: formatLeavePeriod(be.leaveStartDate, be.leaveEndDate),
  };
}

/**
 * 최근 프로젝트 회의 — [확인] BE `DashboardMeetingController` `GET /api/meetings/dashboard?scope=owner`
 * (MEET-17). 팀장 대시보드(`team/server.ts`)와 같은 응답·매퍼를 쓴다.
 * ⚠️ 실패해도 대시보드 전체를 죽이지 않는다 — 이 카드만 "불러오지 못했습니다"가 된다(`null`).
 */
async function listRecentProjectMeetings(
  accessToken: string,
): Promise<OwnerDashboardOverview["projectMeetings"]> {
  try {
    const raw = await serverApi<unknown>(
      ep.meetingsDashboard({ scope: "owner", limit: MEETING_MAX_ITEMS }),
      { accessToken },
    );
    return parseDashboardMeetings(raw).map(toDashboardMeetingCard);
  } catch {
    return null;
  }
}

export async function getOwnerDashboardOverview(): Promise<OwnerDashboardOverview> {
  if (isMock) {
    return {
      ...OWNER_DASHBOARD_MOCK,
      // 최신순(내림차순)으로 위에서부터 내려온다. 박스가 이 수에 딱 맞춰 그려지므로
      // (스크롤 없음) 서버도 같은 수로 자른다.
      projectMeetings: [...(OWNER_DASHBOARD_MOCK.projectMeetings ?? [])]
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
        .slice(0, MEETING_MAX_ITEMS),
    };
  }

  const accessToken = await requireAccessToken();
  const [projectSummary, memberSummary, leaders, projectMeetings] = await Promise.all([
    serverApi<BeProjectDashboardSummary>(ep.projectDashboardSummary(), { accessToken }),
    serverApi<BeMemberDashboardSummary>(ep.memberDashboardSummary(), { accessToken }),
    serverApi<BeTeamLeaderStatus[]>(ep.teamLeadersStatus(), { accessToken }),
    listRecentProjectMeetings(accessToken),
  ]);

  return {
    totalProjectCount: projectSummary.totalProjectCount,
    dueSoonProjectCount: projectSummary.dueSoonProjectCount,
    activeMemberCount: memberSummary.totalMemberCount,
    onLeaveMemberCount: memberSummary.onLeaveMemberCount,
    // ⚠️ 퇴사자는 이미 BE 응답에 안 온다(2026-08-15 정정) — `isVisibleMemberStatus`는
    //    모르는 상태값이 오면 거르는 안전망일 뿐, 퇴사자를 걸러내는 자리가 아니다.
    leaderRows: leaders
      .filter((leader) => isVisibleMemberStatus(leader.status))
      .map(toOwnerDashboardLeaderRow),
    // ⚠️ 예전엔 "API가 없다"며 빈 배열로 고정했다 — MEET-17이 생긴 뒤 연결을 빠뜨렸다(#38)
    projectMeetings,
  };
}
