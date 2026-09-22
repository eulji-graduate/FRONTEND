/**
 * 알림 종류 — **BE `NotificationType` enum 그대로**다.
 * [확인] BE 실코드 대조(2026-08-13) — `notification/domain/model/NotificationType.java`
 *
 * ⚠️ **지금 BE에 있는 건 이 4종이 전부다.** 「분석 완료」·「분석 실패」는 이야기만 됐고 아직
 *    들어오지 않았다 — 이 목록에 미리 적어 두면 영영 안 오는 이벤트를 기다리는 화면이 생긴다
 *    (§도메인 상수: 없는 걸 금지 문장으로만 두면 나중에 누가 만든다). 요약 진행 카드가
 *    SSE가 아니라 CAP-06 폴링으로 도는 이유다(`features/notification/analysis.ts`).
 * ⚠️ 화면에 나가는 문구는 **BE가 만들어 보낸 `payload.message`**를 그대로 쓴다
 *    (`lib/api.ts` 주석과 같은 규칙 — 코드로 문장을 조립하지 않는다). 그래서 라벨맵이 없다.
 */
export const NOTIFICATION_TYPE = {
  /** 회의 예약 커밋 뒤 참석자에게 */
  MEETING_CREATED: "MEETING_CREATED",
  /** 회의 시작 10분 전 */
  MEETING_REMINDER: "MEETING_REMINDER",
  /** 회의 취소 뒤 참석자에게 */
  MEETING_CANCELED: "MEETING_CANCELED",
  /** 공지 등록 뒤 회사 활성 회원 전체에게(저장 없이 실시간만) */
  NOTICE_CREATED: "NOTICE_CREATED",
} as const;
export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

/** 스트림으로 들어온 문자열이 우리가 아는 종류인지 — 모르는 종류는 조용히 버린다. */
export function isNotificationType(value: string): value is NotificationType {
  return (Object.values(NOTIFICATION_TYPE) as string[]).includes(value);
}
