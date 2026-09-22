import type { ActionStatus, HandoverStatusBe, HandoverType } from "@/constants/domain";
import { HANDOVER_TYPE, type HandoverStatus, mapHandoverStatusFromBe } from "@/constants/domain";

import type { TeamHandoverAction, TeamHandoverListItem } from "./types";

/**
 * BE shape → UI 계약 (§Mock 격리막 — **shape을 흡수하는 곳은 여기 하나다**).
 * [확인] 인수인계 API 연동 가이드(BE 실코드 대조, 2026-08-10) §2 `GET /api/handovers/{id}`.
 *
 * ⚠️ 컴포넌트는 이 파일을 모른다. BE가 모양을 바꾸면 여기만 고친다.
 */

/** [확인] BE `HandoverItemResponse` — 인수인계서 한 건에 담긴 액션 스냅샷 한 줄(PR #382). */
export interface BeHandoverItemResponse {
  id: number;
  actionId: number;
  actionTitleSnap: string;
  actionStatusSnap: string;
  projectTagSnap: string;
  actionTypeSnap: string;
  deadlineSnap: string;
  actionCreatedAtSnap: string;
  sourceMeetingId: number | null;
  sourceMeetingTitleSnap: string | null;
  contentSnap: string | null;
  parentActionTitleSnap: string | null;
  startDateSnap: string | null;
  reassignRequired: boolean;
  reassigneeId: number | null;
  reassigneeNameSnap: string | null;
  reassigneePositionSnap: string | null;
  reassignedAt: string | null;
  committedAt: string | null;
  rollbackStatus: string | null;
}

/** [확인] BE `HandoverSummaryResponse` — `GET /api/handovers` 목록 한 줄. */
export interface BeHandoverSummaryResponse {
  id: number;
  writerMemberId: number;
  writerName: string;
  writerPosition: string;
  teamId: number;
  handoverType: string;
  status: string;
  leaveStartAt: string | null;
  leaveEndAt: string | null;
  lastWorkingDay: string | null;
  itemCount: number;
  reassignRequiredCount: number;
  reassignedCount: number;
}

/** [확인] BE `HandoverResponse` — 인수인계서 상세(전 필드 aggregate). */
export interface BeHandoverResponse {
  id: number;
  writerMemberId: number;
  teamId: number;
  teamNameSnap: string;
  handoverType: string;
  status: string;
  leaveStartAt: string | null;
  leaveEndAt: string | null;
  lastWorkingDay: string | null;
  writerNameSnap: string;
  writerPositionSnap: string;
  note: string | null;
  intermediateApproverId: number | null;
  intermediateApproverNameSnap: string | null;
  intermediateApprovedAt: string | null;
  rejectReason: string | null;
  finalizedAt: string | null;
  finalApproverId: number | null;
  finalApproverNameSnap: string | null;
  version: number;
  items: BeHandoverItemResponse[];
}

/** BE 인수인계서 detail — `TeamHandoverDetail`에서 `teammates`만 뺀 나머지(그건 별도 API로 채운다). */
export interface HandoverDetailFromBe {
  handoverId: number;
  memberId: number;
  memberName: string;
  teamId: number;
  type: HandoverType;
  status: HandoverStatus;
  period: { from: string; to: string } | null;
  actionCount: number;
  actions: TeamHandoverAction[];
}

/**
 * 응답 항목(`HandoverItemResponse`) → 화면 액션 한 줄.
 * `actionTitleSnap`→`title`, `projectTagSnap`→`projectTag`, `deadlineSnap`→`dueDate`,
 * `actionStatusSnap`→`status`, `parentActionTitleSnap`→`parentTeamActionName`,
 * `startDateSnap`→`startDate`(PR #382로 추가).
 */
export function toTeamHandoverAction(item: BeHandoverItemResponse): TeamHandoverAction {
  return {
    id: item.actionId,
    projectTag: item.projectTagSnap,
    parentTeamActionName: item.parentActionTitleSnap ?? "",
    title: item.actionTitleSnap,
    status: item.actionStatusSnap as ActionStatus,
    startDate: item.startDateSnap ?? "",
    dueDate: item.deadlineSnap,
  };
}

/** 목록 한 줄(`HandoverSummaryResponse`) → 화면 목록 항목. */
export function toTeamHandoverListItem(be: BeHandoverSummaryResponse): TeamHandoverListItem {
  const type = be.handoverType as HandoverType;
  const period =
    type === HANDOVER_TYPE.VACATION && be.leaveStartAt && be.leaveEndAt
      ? { from: be.leaveStartAt.slice(0, 10), to: be.leaveEndAt.slice(0, 10) }
      : null;

  return {
    handoverId: be.id,
    memberId: be.writerMemberId,
    memberName: be.writerName,
    teamId: be.teamId,
    type,
    period,
    actionCount: be.itemCount,
  };
}

/** `HandoverResponse` → 화면이 쓸 상세. 상태는 경계에서 `mapHandoverStatusFromBe`로 변환한다. */
export function toHandoverDetailFromBe(be: BeHandoverResponse): HandoverDetailFromBe {
  const type = be.handoverType as HandoverType;
  const period =
    type === HANDOVER_TYPE.VACATION && be.leaveStartAt && be.leaveEndAt
      ? { from: be.leaveStartAt.slice(0, 10), to: be.leaveEndAt.slice(0, 10) }
      : null;

  return {
    handoverId: be.id,
    memberId: be.writerMemberId,
    memberName: be.writerNameSnap,
    teamId: be.teamId,
    type,
    status: mapHandoverStatusFromBe(be.status as HandoverStatusBe),
    period,
    actionCount: be.items.length,
    actions: be.items.map(toTeamHandoverAction),
  };
}
