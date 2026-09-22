import { requireAccessToken } from "@/features/auth/session";
import { serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { isMock } from "@/mocks/config";

import { type BeStalledSummariesResponse, toStalledSummaryInfo } from "./mapper";
import { listMockStalledSummaries } from "./mock/stalled-summaries";
import type { StalledSummaryInfo } from "./types";

/**
 * 마이페이지 "요약이 중단된 회의" 목록 — 이 사람이 Host인 것만 모아 보여준다
 * (WORKFLOW.md §3-4 "Host만 접근"과 같은 축, `review/server.ts`의
 * `listPendingReviewsForViewer`와 같은 패턴).
 *
 * ⚠️ `GET /api/meetings/stalled-summaries`(MEET-15, 구현 완료)는 **서버가 이미 host 본인
 *    회의로 스코프한다**(MEET-10과 같은 이유) — 그래서 실서버 경로엔 `viewerId` 필터가 없다.
 * ⚠️ **이 위젯엔 페이지네이션 화면이 없다**(§목록·페이지네이션 — 스크롤 트리거가 없는
 *    고정 카드). BE 응답엔 `page`가 오지만, 화면에 없는 기능을 새로 만들지 않고 최대
 *    크기(100) 한 페이지만 받는다 — host의 종료 회의 수가 상한이라 현실적인 규모다(명세 근거).
 */
export async function listStalledSummariesForViewer(
  viewerId: number,
): Promise<StalledSummaryInfo[]> {
  if (!isMock) {
    const accessToken = await requireAccessToken();
    const { meetings } = await serverApi<BeStalledSummariesResponse>(
      ep.meetingsStalledSummaries({ size: 100 }),
      { accessToken },
    );
    return meetings.map(toStalledSummaryInfo);
  }

  return listMockStalledSummaries()
    .filter((item) => item.hostId === viewerId)
    .map(({ meetingId, meetingTitle, isStalled }) => ({ meetingId, meetingTitle, isStalled }));
}
