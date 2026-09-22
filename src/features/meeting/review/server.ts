import { requireAccessToken } from "@/features/auth/session";
import { getViewer } from "@/features/shell/viewer";
import { ApiError, serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { canOperateMeeting } from "@/lib/permission";
import { isMock } from "@/mocks/config";

import { hostIdOf, parseMeetingDetail } from "../mapper";
import {
  type BePendingActionDistributionsResponse,
  parseActionReview,
  toMeetingReviewInfo,
  toPendingReviewSummary,
} from "./mapper";
import { findMockMeetingReview, listMockPendingReviewMeetingIds } from "./mock/review";
import type { MeetingReviewInfo, MeetingReviewResult, PendingReviewSummary } from "./types";

/**
 * AI 액션 분배 리뷰 조회.
 * ⚠️ **Host만 열 수 있다**(WORKFLOW.md §3-4). `canOperateMeeting`은 AI 검토를 포함해
 *    회의 담당자 1명만 허용하는 그 판정을 이미 하고 있어 그대로 재사용한다.
 * ⚠️ **1회성 화면 정책** — 이미 확정된 회의는 `alreadyConfirmed`를 돌려주고
 *    화면(`page.tsx`)이 회의 상세로 리다이렉트한다.
 */
export async function getMeetingReview(meetingId: string): Promise<MeetingReviewResult> {
  if (isMock) {
    const review = findMockMeetingReview(meetingId);
    if (!review) return { kind: "notFound" };
    const viewer = await getViewer();
    if (!canOperateMeeting(viewer, { ownerId: review.hostId })) return { kind: "notHost" };
    if (review.actionsConfirmed) return { kind: "alreadyConfirmed", meetingId };
    return { kind: "ok", review };
  }

  return getLiveMeetingReview(meetingId);
}

/**
 * 실서버 — **두 응답을 합친다.** RVW-01에는 회의 머리 정보(제목·일정·참석자)가 없어
 * 회의 상세(MEET-04)와 병렬로 부른다. 합치는 일은 매퍼(`toMeetingReviewInfo`) 한 곳이다.
 *
 * ⚠️ **판정 순서를 목과 똑같이 맞춘다**(없음 → Host 아님 → 이미 확정 → 통과) — 캡처 진입
 *    (`getLiveMeetingCapture`)과 같은 이유다. 순서가 갈리면 같은 회의가 목과 실서버에서
 *    다르게 막혀 화면이 다른 말을 한다.
 * ⚠️ 404는 값으로 돌린다(없는 회의는 고장이 아니다). 403·500은 던진다 — BE가 막았다면
 *    우리 판정이 틀렸다는 뜻이라 조용히 다른 화면을 그리지 않는다(§정직성).
 */
async function getLiveMeetingReview(meetingId: string): Promise<MeetingReviewResult> {
  const accessToken = await requireAccessToken();
  const id = Number(meetingId);

  let rawDetail: unknown;
  let rawReview: unknown;
  try {
    [rawDetail, rawReview] = await Promise.all([
      serverApi<unknown>(ep.meeting(id), { accessToken }),
      serverApi<unknown>(ep.meetingReview(id), { accessToken }),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { kind: "notFound" };
    throw error;
  }

  /* 단언이 아니라 검사다 — 모양이 어긋나면 판정 전에 여기서 멈춘다(각 매퍼 주석 참고) */
  const detail = parseMeetingDetail(rawDetail);
  const review = parseActionReview(rawReview);

  const viewer = await getViewer();
  if (!canOperateMeeting(viewer, { ownerId: hostIdOf(detail) })) {
    return { kind: "notHost" };
  }
  if (review.dispatchedAt !== null) return { kind: "alreadyConfirmed", meetingId };

  return { kind: "ok", review: toMeetingReviewInfo({ detail, review }) };
}

/**
 * 마이페이지 "미확정 액션" 탭 — 이 사람이 Host이고 아직 [액션 분배 확정]을 안 누른
 * 회의만 회의 제목 단위로 모아 보여준다(WORKFLOW.md §3-4 "Host만 접근"과 같은 축).
 *
 * ⚠️ `GET /api/meetings/pending-action-distributions`(MEET-10, 구현 완료)는 **서버가 이미
 *    host 본인 회의로 스코프한다** — 역할이 아니라 `hostMemberId` 일치가 기준이라 OWNER·ADMIN도
 *    남의 회의는 안 온다. 그래서 실서버 경로엔 `viewerId` 필터가 없다(목 경로만 직접 거른다).
 */
export async function listPendingReviewsForViewer(
  viewerId: number,
): Promise<PendingReviewSummary[]> {
  if (!isMock) {
    const accessToken = await requireAccessToken();
    const { meetings } = await serverApi<BePendingActionDistributionsResponse>(
      ep.meetingsPendingActionDistributions(),
      { accessToken },
    );
    return meetings.map(toPendingReviewSummary);
  }

  return listMockPendingReviewMeetingIds()
    .map((meetingId) => findMockMeetingReview(meetingId))
    .filter((review): review is MeetingReviewInfo => review !== null)
    .filter((review) => review.hostId === viewerId && !review.actionsConfirmed)
    .map((review) => ({
      meetingId: review.meetingId,
      meetingTitle: review.meetingTitle,
      actionCount: review.drafts.length,
    }));
}
