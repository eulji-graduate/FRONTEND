import "server-only";

import type { LeaderHandoverCustodyStatus } from "@/constants/domain";
import { ACTION_STATUS, LEADER_HANDOVER_CUSTODY_STATUS } from "@/constants/domain";
import { requireAccessToken } from "@/features/auth/session";
import { ApiError, serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { isMock } from "@/mocks/config";

import { findMockLeaderHandover, listMockLeaderHandovers } from "./mock/leader-handovers";
import type {
  LeaderCandidate,
  LeaderHandoverAction,
  LeaderHandoverDetail,
  LeaderHandoverListItem,
} from "./types";

/** [확인] BE `HandoverSummaryResponse` — `team-handover/mapper.ts`와 같은 응답. */
interface BeHandoverSummaryResponse {
  id: number;
  writerName: string;
  teamId: number;
  handoverType: string;
  finalizedAt: string | null;
  itemCount: number;
  reassignRequiredCount: number;
  reassignedCount: number;
}

/** [확인] BE `HandoverItemResponse`. */
interface BeHandoverItem {
  actionId: number;
  actionTitleSnap: string;
  actionStatusSnap: string;
  projectTagSnap: string;
  deadlineSnap: string;
  parentActionTitleSnap: string | null;
  reassignRequired: boolean;
  reassigneeId: number | null;
}

/** [확인] BE `HandoverResponse`. */
interface BeHandoverDetail {
  id: number;
  teamId: number;
  teamNameSnap: string;
  writerMemberId: number;
  writerNameSnap: string;
  handoverType: string;
  status: string;
  finalizedAt: string | null;
  items: BeHandoverItem[];
}

function toLeaderHandoverAction(item: BeHandoverItem): LeaderHandoverAction {
  return {
    id: item.actionId,
    projectTag: item.projectTagSnap,
    parentTeamActionName: item.parentActionTitleSnap ?? "",
    title: item.actionTitleSnap,
    status: item.actionStatusSnap as LeaderHandoverAction["status"],
    dueDate: item.deadlineSnap,
  };
}

/** 전 항목이 재배정 필요 없거나 이미 재배정됐는지 — BE `Handover.isAllReassigned()`와 같은 판정. */
function isAllReassigned(items: { reassignRequired: boolean; reassigneeId: number | null }[]) {
  return items.every((item) => !item.reassignRequired || item.reassigneeId !== null);
}

/**
 * 목록 — [확인] `GET /api/handovers?status=FINALIZED`(OWNER면 회사 전체, 페이지네이션 없음)에서
 * `handoverType=OFFBOARDING`만 골라 쓴다.
 *
 * ⚠️ BE에 "귀속 대기"만 주는 전용 경로(`/pending-attribution`)가 있지만, 그건 `PENDING`
 *    한쪽뿐이다 — `ASSIGNED`(이미 귀속 끝난 건) 탭까지 한 화면에서 걸러야 해서, 대신
 *    `reassignRequiredCount`·`reassignedCount`로 두 상태를 여기서 직접 가른다
 *    (BE `isPendingAttribution()`과 같은 식 — 다 재배정됐으면 `ASSIGNED`).
 */
export async function listLeaderHandovers(
  filter: LeaderHandoverCustodyStatus | null,
): Promise<LeaderHandoverListItem[]> {
  if (isMock) {
    const items = listMockLeaderHandovers();
    const filtered = filter ? items.filter((item) => item.custodyStatus === filter) : items;
    return filtered.map((item) => ({
      id: item.id,
      title: item.title,
      formerLeaderName: item.formerLeaderName,
      teamName: item.teamName,
      offboardingApprovedAt: item.offboardingApprovedAt,
      actionCount: item.actionCount,
      custodyStatus: item.custodyStatus,
    }));
  }

  const accessToken = await requireAccessToken();
  const summaries = await serverApi<BeHandoverSummaryResponse[]>(
    ep.handovers({ status: "FINALIZED" }),
    { accessToken },
  );

  const teams = await serverApi<{ id: number; name: string }[]>(ep.teams(), { accessToken });
  const teamNameById = new Map(teams.map((team) => [team.id, team.name]));

  return summaries
    .filter((summary) => summary.handoverType === "OFFBOARDING")
    .map((summary): LeaderHandoverListItem => {
      const teamName = teamNameById.get(summary.teamId) ?? "";
      const custodyStatus =
        summary.reassignedCount >= summary.reassignRequiredCount
          ? LEADER_HANDOVER_CUSTODY_STATUS.ASSIGNED
          : LEADER_HANDOVER_CUSTODY_STATUS.PENDING;
      return {
        id: String(summary.id),
        title: `${summary.writerName} ${teamName}장 오프보딩 인수인계서`,
        formerLeaderName: summary.writerName,
        teamName,
        offboardingApprovedAt: (summary.finalizedAt ?? "").slice(0, 10),
        actionCount: summary.itemCount,
        custodyStatus,
      };
    })
    .filter((item) => !filter || item.custodyStatus === filter);
}

/**
 * 귀속 후보 — **같은 팀에 새로 지정된 팀장만**(2026-08-08 팀 정정). 팀 조회의
 * `leaderMemberId`가 곧 그 팀 현재 팀장이다 — 떠난 사람 본인이면 아직 공석이라 후보가 없다.
 */
async function findCandidatesForTeam(
  teamId: number,
  formerLeaderId: number,
  accessToken: string,
): Promise<LeaderCandidate[]> {
  const teams = await serverApi<
    { id: number; name: string; leaderMemberId: number | null; leaderName: string | null }[]
  >(ep.teams(), { accessToken });
  const team = teams.find((t) => t.id === teamId);
  if (!team || team.leaderMemberId === null || team.leaderMemberId === formerLeaderId) return [];
  return [{ id: String(team.leaderMemberId), name: team.leaderName ?? "", teamName: team.name }];
}

export async function getLeaderHandoverDetail(id: string): Promise<LeaderHandoverDetail | null> {
  if (isMock) return findMockLeaderHandover(id);

  const accessToken = await requireAccessToken();
  let be: BeHandoverDetail;
  try {
    be = await serverApi<BeHandoverDetail>(ep.handover(Number(id)), { accessToken });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) return null;
    throw error;
  }

  /*
    ⚠️ **목록과 같은 조건을 여기서도 다시 본다**(§권한: 화면 숨김은 보안이 아니다). 목록은
       OFFBOARDING·FINALIZED만 걸러 링크를 만들지만, 이 함수는 주소만 알면 다른 handover id로도
       직접 불릴 수 있다 — 휴직 건이나 아직 SUBMITTED인 건을 열면 후보·귀속 버튼이 잘못 뜬다.
  */
  if (be.handoverType !== "OFFBOARDING" || be.status !== "FINALIZED") return null;

  const custodyStatus = isAllReassigned(be.items)
    ? LEADER_HANDOVER_CUSTODY_STATUS.ASSIGNED
    : LEADER_HANDOVER_CUSTODY_STATUS.PENDING;

  const candidates = await findCandidatesForTeam(be.teamId, be.writerMemberId, accessToken);

  return {
    id: String(be.id),
    title: `${be.writerNameSnap} ${be.teamNameSnap}장 오프보딩 인수인계서`,
    formerLeaderName: be.writerNameSnap,
    teamName: be.teamNameSnap,
    offboardingApprovedAt: (be.finalizedAt ?? "").slice(0, 10),
    actionCount: be.items.length,
    custodyStatus,
    actions: be.items
      .filter((item) => item.actionStatusSnap !== ACTION_STATUS.DONE)
      .map(toLeaderHandoverAction),
    candidates,
  };
}
