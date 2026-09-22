import { ACTION_STATUS } from "@/constants/domain";

import type { HandoverPdfData, HandoverPdfItem } from "./mapper";

interface MockHandoverPdfInput {
  writerName: string;
  writerPosition: string;
  teamName: string;
  lastWorkingDay: string;
  items: HandoverPdfItem[];
}

/**
 * mock 전용 PDF 데이터 — BE `package`·`insights`가 없는 mock 모드에서 화면 확인용으로 쓴다.
 * ⚠️ 실 데이터와 정확히 같은 모양일 필요는 없다 — PDF 문서가 각 섹션을 제대로 그리는지
 *    확인하는 목적이라, 회의 이력·인사이트는 간단한 예시 한두 건으로 충분하다.
 */
export function buildMockHandoverPdfData(input: MockHandoverPdfInput): HandoverPdfData {
  const { writerName, writerPosition, teamName, lastWorkingDay, items } = input;
  const incompleteCount = items.filter((item) => item.status !== ACTION_STATUS.DONE).length;

  return {
    teamNameSnap: teamName,
    writerName,
    writerPosition,
    lastWorkingDay,
    note: "담당 업무 전반과 진행 중인 액션을 정리했습니다. 세부 맥락은 각 액션의 메모를 참고해 주세요.",
    gapSummary: {
      totalItems: items.length,
      incompleteCount,
      dueSoonCount: Math.min(1, items.length),
    },
    items,
    contextCards: items.slice(0, 1).map((item) => ({
      title: item.title,
      content: "진행 중 특이사항은 없습니다. 이어서 진행하시면 됩니다.",
    })),
    meetings: [
      {
        date: lastWorkingDay,
        attendees: [writerName],
        decisionSummary: "인수인계 범위와 일정을 확정했습니다.",
        actionItemsSummary: "위 인계 액션 목록대로 진행합니다.",
      },
    ],
    reassigneeGroups: [],
    insights: { ownership: [], orphanAlert: [], askWhom: [] },
  };
}
