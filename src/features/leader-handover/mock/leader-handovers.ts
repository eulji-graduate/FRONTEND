import { ACTION_STATUS, LEADER_HANDOVER_CUSTODY_STATUS } from "@/constants/domain";
import {
  TEAM_ACTION_DETAIL_MOCK,
  TEAM_ACTION_PERSONAL_ITEMS_MOCK,
} from "@/features/project/mock/team-action-detail";

import type { LeaderCandidate, LeaderHandoverAction, LeaderHandoverDetail } from "../types";

/**
 * ⚠️ 목 데이터 — BE 연동 전. 사원 관리(`/manage/members`)의 오프보딩 최종 승인과는
 * 아직 연동하지 않는다(별도 이슈, 사용자 확인 2026-08-08) — 이 화면만 확인할 수 있게
 * 고정 항목 하나를 둔다.
 * ⚠️ 액션은 새로 만들지 않는다 — `TEAM_ACTION_PERSONAL_ITEMS_MOCK`(project 피처)에서
 * 김서준 담당 항목을 그대로 걸러 쓴다(다른 화면과 같은 정본).
 */
function buildFormerLeaderActions(memberName: string): LeaderHandoverAction[] {
  const actions: LeaderHandoverAction[] = [];
  for (const [teamActionId, items] of Object.entries(TEAM_ACTION_PERSONAL_ITEMS_MOCK)) {
    const parent = TEAM_ACTION_DETAIL_MOCK[Number(teamActionId)];
    if (!parent) continue;
    for (const item of items) {
      if (item.assigneeName !== memberName) continue;
      if (item.status === ACTION_STATUS.DONE) continue;
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

/**
 * ⚠️ **같은 팀에 새로 지정된 팀장만** 후보다(2026-08-08 팀 정정) — 타 부서 팀장에게
 *    넘기지 않는다. 사원 관리(`/manage/members`)에서 먼저 그 팀 소속 사원을 팀장으로
 *    승급해야 여기 후보로 뜬다. 지금 데모는 개발팀이 아직 공석이라 후보가 없다 —
 *    실제로 누군가 승급되면 그 사람만 담는다(빈 배열을 채우지 않는다, §정직성).
 */
const CANDIDATES: Record<string, LeaderCandidate[]> = {
  개발팀: [],
};

interface LeaderHandoverStore {
  items: Record<string, LeaderHandoverDetail>;
}

const globalStore = globalThis as typeof globalThis & {
  __leaderHandoverStore?: LeaderHandoverStore;
};

function seedStore(): LeaderHandoverStore {
  const actions = buildFormerLeaderActions("김서준");
  return {
    items: {
      "leader-handover-1": {
        id: "leader-handover-1",
        title: "김서준 개발팀장 오프보딩 인수인계서",
        formerLeaderName: "김서준",
        teamName: "개발팀",
        offboardingApprovedAt: "2026-08-08",
        actionCount: actions.length,
        custodyStatus: LEADER_HANDOVER_CUSTODY_STATUS.PENDING,
        actions,
        candidates: CANDIDATES["개발팀"] ?? [],
      },
    },
  };
}

function getStore(): LeaderHandoverStore {
  if (!globalStore.__leaderHandoverStore) {
    globalStore.__leaderHandoverStore = seedStore();
  }
  return globalStore.__leaderHandoverStore;
}

export function listMockLeaderHandovers(): LeaderHandoverDetail[] {
  return Object.values(getStore().items);
}

export function findMockLeaderHandover(id: string): LeaderHandoverDetail | null {
  return getStore().items[id] ?? null;
}

/** [OOO에게 귀속] — mock에선 상태만 바꾼다. */
export function markMockLeaderHandoverAssigned(id: string): void {
  const item = getStore().items[id];
  if (item) item.custodyStatus = LEADER_HANDOVER_CUSTODY_STATUS.ASSIGNED;
}
