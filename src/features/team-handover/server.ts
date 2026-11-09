import "server-only";

import { isVisibleMemberStatus, type MemberStatus } from "@/constants/domain";
import { requireAccessToken } from "@/features/auth/session";
import { getManagedMember, listManagedMembers } from "@/features/member/manage-server";
import { listMockHandoverActions } from "@/features/member/mock/managed";
import { ApiError, serverApi } from "@/lib/api";
import { addDaysIso, todayIso } from "@/lib/date";
import { ep } from "@/lib/endpoints";
import { isMock } from "@/mocks/config";

import type { BeHandoverResponse, BeHandoverSummaryResponse } from "./mapper";
import { toHandoverDetailFromBe, toTeamHandoverListItem } from "./mapper";
import type {
  TeamHandoverAction,
  TeamHandoverDetail,
  TeamHandoverListItem,
  TeamMemberOption,
} from "./types";

/**
 * 인계 액션의 프로젝트·상위 팀 액션·시작일 — **BE 시드(`db/local/data.sql`) 그대로**(#27).
 * ⚠️ 사원 목(`member/mock/managed.ts`)에는 이 셋이 없어 여기서 붙인다. 액션 id가 같아야
 *    사원 상세·인수인계 상세가 같은 일을 가리킨다(전에는 다른 목에서 1건만 가져와 어긋났다).
 * ⚠️ **시작일이 비어 있는 액션이 있다**(102·106). 실서버 매퍼도 빈 값(`""`)으로 넘기므로
 *    목도 똑같이 빈 값을 준다 — 타임라인이 그 값을 어떻게 다루는지는 `lib.ts` 몫이다.
 */
const MOCK_HANDOVER_ACTION_CONTEXT = {
  projectTag: "ONBOARDING",
  parentTeamActionName: "온보딩 개선 개발",
} as const;
/** 오늘 기준 며칠 전에 시작했는지. `null`은 BE 시드에서도 시작일이 비어 있다는 뜻이다 */
const MOCK_START_OFFSET_DAYS: Record<string, number | null> = {
  "a-101": -3,
  "a-102": null,
  "a-106": null,
};

/** 목 액션 id(`a-101`) → BE 액션 id(101). */
function toHandoverActionId(mockId: string): number {
  return Number(mockId.replace(/^a-/, ""));
}

function buildHandoverActions(memberId: number): TeamHandoverAction[] {
  const today = todayIso();
  return listMockHandoverActions(memberId).map((action) => {
    const offset = MOCK_START_OFFSET_DAYS[action.id];
    return {
      id: toHandoverActionId(action.id),
      ...MOCK_HANDOVER_ACTION_CONTEXT,
      title: action.title,
      status: action.status,
      startDate: offset == null ? "" : addDaysIso(today, offset),
      dueDate: action.dueDate,
    };
  });
}

/** [확인] BE `TeamMemberStatusResponse` — `team/server.ts`와 같은 응답(PR #354 머지 완료). */
interface BeTeamMemberStatus {
  memberId: number;
  name: string;
  positionName: string | null;
  roleName: string | null;
  status: MemberStatus;
}

/**
 * 재배정 대상 — 신청자 제외, 같은 팀 구성원(팀장 본인 포함).
 *
 * ⚠️ `GET /api/team/members`는 **호출자 토큰의 팀**만 돌려준다(LEADER 전용) — 이 화면을
 *    여는 사람이 곧 그 인수인계서의 팀장이라 `writerMemberId` 하나만 걸러내면 된다.
 */
async function fetchTeammates(
  writerMemberId: number,
  accessToken: string,
): Promise<TeamMemberOption[]> {
  const members = await serverApi<BeTeamMemberStatus[]>(ep.teamMembers(), { accessToken });
  // ⚠️ 소프트 딜리트는 상태가 아니라 목록에서 빠지는 일이다 — 퇴사자는 남기고 그것만 거른다.
  return members
    .filter((member) => member.memberId !== writerMemberId && isVisibleMemberStatus(member.status))
    .map((member) => ({ id: member.memberId, name: member.name, roleLabel: member.roleName }));
}

/**
 * 목록 — 팀장 중간 승인을 기다리는 팀원 신청만(이미 승인된 건은 여기서 할 일이 없다).
 * ⚠️ `teamName`·`leaderId`는 호출부(`getViewer()`)에서 받는다 — 예전엔 "김서준·개발팀"으로
 *    고정해 뒀는데, 목 인물 명단이 바뀌면 조용히 어긋나는 지뢰였다(`getMyActionBoard`와
 *    같은 종류, #678). 실연동은 `GET /api/handovers`가 토큰의 팀만 돌려주므로 안 쓴다.
 */
export async function listTeamHandovers(
  teamName: string | undefined,
  leaderId: number,
): Promise<TeamHandoverListItem[]> {
  if (isMock) {
    if (!teamName) throw new Error("listTeamHandovers: mock 분기는 teamName이 필요하다");
    const members = await listManagedMembers();
    const teammates = members.filter(
      (member) => member.teamName === teamName && member.id !== leaderId,
    );

    const details = await Promise.all(teammates.map((member) => getManagedMember(member.id)));

    return details
      .filter(
        (detail) =>
          detail !== null && detail.pendingHandover && !detail.pendingHandover.midApproval,
      )
      .map((detail) => {
        const member = detail!.member;
        const handover = detail!.pendingHandover!;
        return {
          // ⚠️ 목에는 진짜 인수인계서 id가 없다 — 사원 id를 대신 쓴다(목 전용 관례).
          handoverId: member.id,
          memberId: member.id,
          memberName: member.name,
          // ⚠️ 목 로스터엔 숫자 팀 id가 없다 — `canApproveMid` 팀 스코프 검사는 실서버
          //    분기에서만 돈다(§목 단계 권한 검사 범위, 이 파일 하단 `completeTeamHandoverAction`
          //    주석 참고)라 이 값은 목에서 실제로 쓰이지 않는다.
          teamId: 0,
          type: handover.type,
          period: handover.period,
          actionCount: handover.actionCount,
        };
      });
  }

  const accessToken = await requireAccessToken();
  const summaries = await serverApi<BeHandoverSummaryResponse[]>(
    ep.handovers({ status: "SUBMITTED" }),
    { accessToken },
  );
  return summaries.map(toTeamHandoverListItem);
}

/**
 * 상세 — 이미 중간 승인됐거나 신청이 없으면 `null`(화면이 `notFound()`를 부른다).
 * ⚠️ `teamName`은 호출부(`getViewer()`)에서 받는다 — `listTeamHandovers`와 같은 이유로
 *    고정값 대신 실제 로그인 팀장의 팀을 쓴다.
 */
export async function getTeamHandoverDetail(
  handoverId: number,
  teamName: string | undefined,
): Promise<TeamHandoverDetail | null> {
  if (isMock) {
    if (!teamName) throw new Error("getTeamHandoverDetail: mock 분기는 teamName이 필요하다");
    const memberId = handoverId;
    const detail = await getManagedMember(memberId);
    if (!detail || detail.member.teamName !== teamName) return null;

    const handover = detail.pendingHandover;
    if (!handover || handover.midApproval) return null;

    const members = await listManagedMembers();
    const teammates = members
      .filter((member) => member.teamName === teamName && member.id !== memberId)
      .map((member) => ({ id: member.id, name: member.name, roleLabel: member.roleLabel }));

    return {
      handoverId: memberId,
      memberId,
      memberName: detail.member.name,
      // ⚠️ 목 전용 — 위 목록 분기와 같은 이유로 실제로 쓰이지 않는다.
      teamId: 0,
      type: handover.type,
      period: handover.period,
      actionCount: handover.actionCount,
      actions: buildHandoverActions(memberId),
      teammates,
    };
  }

  const accessToken = await requireAccessToken();
  let be: BeHandoverResponse;
  try {
    be = await serverApi<BeHandoverResponse>(ep.handover(handoverId), { accessToken });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) return null;
    throw error;
  }

  // ⚠️ 이미 팀장이 처리한(재배정·최종승인·반려) 건은 여기서 할 일이 없다 — 목록 필터(§listTeamHandovers)와 같은 기준.
  if (be.status !== "SUBMITTED") return null;

  const detail = toHandoverDetailFromBe(be);
  const teammates = await fetchTeammates(be.writerMemberId, accessToken);
  return { ...detail, teammates };
}
