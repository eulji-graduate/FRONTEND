import { PIPELINE_STAGE } from "@/constants/domain";

import type { MonitoringOverview } from "../types";

/**
 * ⚠️ 목 데이터 — BE 연동 전. SYSTEM 시스템 모니터링 진입 시 보여줄 예시 값이다.
 * 큐·단계 소요·실패 목록은 실제로는 파이프라인 워커/메트릭에서 온다(격리막: `server.ts`).
 */
export const MOCK_MONITORING_OVERVIEW: MonitoringOverview = {
  queue: {
    waitingCount: 4,
    processingCount: 2,
    processingAvgSeconds: 8.2,
    failedCount: 3,
  },
  stageTimings: [
    { stage: PIPELINE_STAGE.UPLOAD, avgSeconds: 0.8 },
    { stage: PIPELINE_STAGE.TRANSCRIBE, avgSeconds: 4.2 },
    { stage: PIPELINE_STAGE.SUMMARIZE, avgSeconds: 8.7 },
    { stage: PIPELINE_STAGE.EXTRACT_ACTION, avgSeconds: 3.1 },
  ],
  failedItems: [
    {
      meetingId: "MTG-2025-0721-03",
      companyName: "모멘텀랩",
      stage: PIPELINE_STAGE.SUMMARIZE,
      failedAt: "2025-07-21 14:32",
      errorMessage: "타임아웃 (30s)",
    },
    {
      meetingId: "MTG-2025-0719-07",
      companyName: "(주)레이어원",
      stage: PIPELINE_STAGE.EXTRACT_ACTION,
      failedAt: "2025-07-19 09:18",
      errorMessage: "API 오류 (503)",
    },
    {
      meetingId: "MTG-2025-0718-01",
      companyName: "그린로직스",
      stage: PIPELINE_STAGE.TRANSCRIBE,
      failedAt: "2025-07-18 16:55",
      errorMessage: "인코딩 실패",
    },
  ],
};

/** 재처리 대상 회의가 실제로 실패 목록에 있는지 확인 — 액션에서 소유 검증 대신 존재 검증에 쓴다. */
export function findMockFailedItem(meetingId: string) {
  return MOCK_MONITORING_OVERVIEW.failedItems.find((item) => item.meetingId === meetingId) ?? null;
}
