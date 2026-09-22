import { isDelayed } from "@/constants/domain";
import type { TimelineActionInput } from "@/features/member/action-timeline";
import { pickPaletteColor } from "@/lib/palette";

import type { TeamHandoverAction, TeamHandoverAssignment } from "./types";

/** 액션 → 타임라인 입력. 칩에는 프로젝트 태그를 단다(호출부 관례, §CONVENTIONS). */
export function buildTimelineInput(actions: TeamHandoverAction[]): TimelineActionInput[] {
  return actions.map((action) => {
    const color = pickPaletteColor(action.projectTag);
    return {
      id: String(action.id),
      tag: action.projectTag,
      title: action.title,
      tagBgColor: color.bgColor,
      tagTextColor: color.textColor,
      startDate: action.startDate,
      dueDate: action.dueDate,
      tone: isDelayed(action) ? "DELAYED" : action.status,
    };
  });
}

/**
 * 모든 액션이 배정됐는지 — [인수인계 확정] 버튼 활성 조건.
 * ⚠️ 액션이 하나도 없으면(전부 이미 완료 처리됨) **그 자체로 확정 가능**이다 — 서버
 *    (`completeTeamHandoverAction`)도 같은 기준(`every`는 빈 배열에서 참)이라, 여기서만
 *    `length > 0`을 더 걸면 버튼이 영영 안 눌리는데 서버는 통과하는 불일치가 생긴다
 *    (CodeRabbit 지적, 2026-08-09).
 */
export function isReadyToComplete(
  actions: TeamHandoverAction[],
  assignments: Record<number, number>,
): boolean {
  return actions.every((action) => assignments[action.id] !== undefined);
}

/** 배정 맵 → 서버로 보낼 배열. */
export function toAssignmentList(assignments: Record<number, number>): TeamHandoverAssignment[] {
  return Object.entries(assignments).map(([actionId, assigneeId]) => ({
    actionId: Number(actionId),
    assigneeId,
  }));
}
