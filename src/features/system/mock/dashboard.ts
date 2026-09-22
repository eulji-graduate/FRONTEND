import type { DashboardOverview } from "../types";
import { MOCK_MONITORING_OVERVIEW } from "./monitoring";

/** ⚠️ 목 데이터 — BE 연동 전. SYSTEM 대시보드 진입 시 보여줄 예시 값이다. */
export const MOCK_DASHBOARD_OVERVIEW: DashboardOverview = {
  summary: {
    companyCount: 62,
    companyCountDeltaThisMonth: 8,
    activeUserCount: 841,
    activeUserDeltaPercent: 12,
    mrr: 8_400_000,
    pendingApprovalCount: 3,
  },
  monthlySignups: [
    { month: "2월", count: 3 },
    { month: "3월", count: 5 },
    { month: "4월", count: 7 },
    { month: "5월", count: 8 },
    { month: "6월", count: 10 },
    { month: "7월", count: 8 },
  ],
  recentCompanies: [
    {
      id: "1",
      name: "(주)테크스타트",
      code: "TECHSTART-2025",
      memberCount: 12,
      joinedAt: "2025-07-22",
    },
    { id: "2", name: "그린로직스", code: "GREENLOGICS-25", memberCount: 4, joinedAt: "2025-07-21" },
    {
      id: "3",
      name: "(주)레이어원",
      code: "LAYERONE-2025",
      memberCount: 27,
      joinedAt: "2025-07-19",
    },
    { id: "4", name: "모멘텀랩", code: "MOMENTUM-2025", memberCount: 8, joinedAt: "2025-07-17" },
    { id: "5", name: "엔드포인트", code: "ENDPOINT-2025", memberCount: 3, joinedAt: "2025-07-15" },
    {
      id: "6",
      name: "(주)블루스톤",
      code: "BLUESTONE-2025",
      memberCount: 14,
      joinedAt: "2025-07-13",
    },
  ],
  /*
    ⚠️ 대시보드가 처리 큐를 **따로 들고 있지 않다.** 시스템 모니터링과 같은 값을 읽는다 —
       두 벌로 두면 같은 순간에 두 화면이 다른 건수를 말한다(CLAUDE.md §도메인 상수).
  */
  pipelineQueue: MOCK_MONITORING_OVERVIEW.queue,
};
