import type { StalledSummaryInfo } from "../types";

/**
 * ⚠️ 목 데이터 — BE 연동 전(CLAUDE.md §정직한 목업). BE #177이 확정되기 전이라
 *    "회의 목록에서 상태로 걸러 온다"를 흉내만 낸다 — 실제로는 필터/목록 API가
 *    확정돼야 한다(§연동 검증, BE에 요청해 둠).
 * ⚠️ `globalThis`에 매달아 dev HMR로 사라지지 않게 한다(`review/mock`와 같은 트릭).
 */
interface StalledSummaryStore {
  items: Record<string, StalledSummaryInfo & { hostId: number }>;
}

const globalStore = globalThis as typeof globalThis & {
  __stalledSummaryStore?: StalledSummaryStore;
};

function seedStore(): StalledSummaryStore {
  return {
    items: {
      "meeting-summary-1": {
        meetingId: "meeting-summary-1",
        meetingTitle: "9월 스프린트 리뷰",
        isStalled: true,
        hostId: 1,
      },
      "meeting-summary-2": {
        meetingId: "meeting-summary-2",
        meetingTitle: "협업툴 리뉴얼 프로젝트 킥오프",
        isStalled: false,
        hostId: 1,
      },
    },
  };
}

function getStore(): StalledSummaryStore {
  if (!globalStore.__stalledSummaryStore) {
    globalStore.__stalledSummaryStore = seedStore();
  }
  return globalStore.__stalledSummaryStore;
}

export function listMockStalledSummaries(): (StalledSummaryInfo & { hostId: number })[] {
  return Object.values(getStore().items);
}

export function findMockStalledSummary(meetingId: string) {
  return getStore().items[meetingId] ?? null;
}

/** [다시 분석] — mock에선 목록에서 그냥 빼서 "재분석 큐로 넘어감"을 흉내낸다. */
export function removeMockStalledSummary(meetingId: string): void {
  delete getStore().items[meetingId];
}
