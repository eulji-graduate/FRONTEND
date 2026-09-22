/**
 * 마이페이지 "요약이 중단된 회의" 그룹의 **UI 계약**(CLAUDE.md §Mock 격리막).
 *
 * ⚠️ 실시간 진행 배너(폴링·axios)는 이 이슈 범위가 아니다 — 여기는 브라우저를 닫아
 *    실시간 알림을 놓친 사람이 마이페이지에서 뒤늦게 발견하고 재분석을 요청하는
 *    자리다(BE #177 대응, 2026-08-08 팀 확정).
 */

/**
 * 회의 하나당 한 줄 — `AI_SUMMARY_STATUS.FAILED`인 회의만 여기 온다.
 * ⚠️ `isStalled`가 실제 표시를 가른다: true면 "서버 문제로 중단됨"(다시 분석하면 대개
 *    해결), false면 "분석 자체가 실패함"(문구만 다르고 재분석 흐름은 동일).
 */
export interface StalledSummaryInfo {
  meetingId: string;
  meetingTitle: string;
  isStalled: boolean;
}
