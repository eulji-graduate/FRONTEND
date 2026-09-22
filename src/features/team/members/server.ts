import type { ActionStatus, MemberStatus } from "@/constants/domain";
import { requireAccessToken } from "@/features/auth/session";
import type { BePageResponse } from "@/features/project/mapper";
import {
  TEAM_ACTION_DETAIL_MOCK,
  TEAM_ACTION_PERSONAL_ITEMS_MOCK,
} from "@/features/project/mock/team-action-detail";
import { serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { isMock } from "@/mocks/config";

import {
  filterTeamMembers,
  sortTeamMembers,
  type TeamMemberFilter,
  type TeamMemberSort,
} from "./lib";
import { TEAM_MEMBER_ROSTER_MOCK } from "./mock/roster";
import type { TeamMemberAction, TeamMemberStatusItem } from "./types";

/** [확인] BE `TeamMemberStatusResponse` — PR #354 머지 완료. */
interface BeTeamMemberStatus {
  memberId: number;
  name: string;
  positionName: string | null;
  roleName: string | null;
  status: MemberStatus;
  actionCount: number;
}

/** [확인] BE `ActionSummaryResponse` — 이 화면이 쓰는 필드만 적는다. */
interface BeActionSummaryForMember {
  id: number;
  title: string;
  status: ActionStatus;
  dueDate: string;
  projectTag: string;
  parentActionTitle: string | null;
}

function toTeamMemberAction(be: BeActionSummaryForMember): TeamMemberAction {
  return {
    id: be.id,
    projectTag: be.projectTag,
    parentTeamActionName: be.parentActionTitle ?? "",
    title: be.title,
    status: be.status,
    dueDate: be.dueDate,
  };
}

/**
 * 팀원 한 명의 개인 액션 전체 — `GET /api/actions?assigneeMemberId=`(2026-08-11, 이홍근 요청으로
 * BE에 이미 반영됨, LEADER 전용·같은 팀 소속만). 무한스크롤 화면이 아니라 카드 펼침에 전부
 * 필요하므로 `size`를 크게 잡아 한 번에 받는다(보드·내 액션 목록과 같은 패턴).
 */
async function fetchMemberActions(
  memberId: number,
  accessToken: string,
): Promise<TeamMemberAction[]> {
  const page = await serverApi<BePageResponse<BeActionSummaryForMember>>(
    ep.actions({ assigneeMemberId: memberId, size: 9999 }),
    { accessToken },
  );
  return page.content.map(toTeamMemberAction);
}

/**
 * ⚠️ 목 데이터라도 **새 데이터를 안 만든다** — 팀 액션 상세(`project` 피처)의
 * `TEAM_ACTION_PERSONAL_ITEMS_MOCK`이 이미 담당자별 개인 액션의 정본이다(보드도 이걸
 * 그대로 쓴다, `board/server.ts`). 여기서 담당자 이름으로 걸러 모으기만 한다 —
 * 두 벌을 따로 두면 화면마다 같은 사람의 액션 개수가 달라진다.
 */
function buildMemberActions(memberName: string): TeamMemberAction[] {
  const actions: TeamMemberAction[] = [];
  for (const [teamActionId, items] of Object.entries(TEAM_ACTION_PERSONAL_ITEMS_MOCK)) {
    const parent = TEAM_ACTION_DETAIL_MOCK[Number(teamActionId)];
    if (!parent) continue;
    for (const item of items) {
      if (item.assigneeName !== memberName) continue;
      actions.push({
        id: item.id,
        projectTag: parent.projectTag,
        parentTeamActionName: parent.name,
        title: item.title,
        status: item.status,
        dueDate: item.dueDate,
      });
    }
  }
  return actions;
}

/** "팀원 관리" 목록 — 정렬·필터는 서버에서 적용한다(서버우선, `?sort=`·`?filter=`). */
export async function getTeamMemberStatuses(
  sort: TeamMemberSort,
  filter: TeamMemberFilter,
  viewer: { teamName?: string },
): Promise<TeamMemberStatusItem[]> {
  if (isMock) {
    const members: TeamMemberStatusItem[] = TEAM_MEMBER_ROSTER_MOCK.map((member) => ({
      ...member,
      actions: buildMemberActions(member.name),
    }));

    return sortTeamMembers(filterTeamMembers(members, filter), sort);
  }

  const accessToken = await requireAccessToken();
  const roster = await serverApi<BeTeamMemberStatus[]>(ep.teamMembers(), { accessToken });

  /*
   * ⚠️ 팀원 ~6명 규모 가정(WORKFLOW.md) — 카드 펼침에 전부 필요해 서버 컴포넌트가 한 번에
   *    가져온다. 인원이 크게 늘면 이 병렬호출을 카드 펼침 시점의 클라이언트 조회로 옮겨야 한다.
   */
  const members: TeamMemberStatusItem[] = await Promise.all(
    roster.map(async (member) => ({
      id: member.memberId,
      name: member.name,
      position: member.positionName ?? "",
      role: member.roleName ?? "없음",
      teamName: viewer.teamName ?? "",
      status: member.status,
      actions: await fetchMemberActions(member.memberId, accessToken),
    })),
  );

  return sortTeamMembers(filterTeamMembers(members, filter), sort);
}
