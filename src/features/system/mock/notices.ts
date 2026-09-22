import { NOTICE_TARGET } from "@/constants/domain";

import type { NoticeHistoryItem } from "../types";

/** ⚠️ 목 데이터 — BE 연동 전. SYSTEM 공지 관리 "발행 이력"에 보여줄 예시 값이다. */
export const MOCK_NOTICE_HISTORY: NoticeHistoryItem[] = [
  {
    id: "notice-2025-07-15",
    title: "7월 정기 점검 안내",
    target: NOTICE_TARGET.ALL,
    sentAt: "2025-07-15",
    recipientCompanyCount: 62,
  },
  {
    id: "notice-2025-07-08",
    title: "미납 요금 납부 안내",
    target: NOTICE_TARGET.UNPAID,
    sentAt: "2025-07-08",
    recipientCompanyCount: 3,
  },
  {
    id: "notice-2025-06-28",
    title: "(주)테크스타트 전용 안내",
    target: NOTICE_TARGET.SPECIFIC,
    sentAt: "2025-06-28",
    recipientCompanyCount: 1,
  },
];
