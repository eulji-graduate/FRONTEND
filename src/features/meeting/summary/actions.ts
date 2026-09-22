"use server";

import { revalidatePath } from "next/cache";

import { requireAccessToken } from "@/features/auth/session";
import { getViewer } from "@/features/shell/viewer";
import { ApiError, serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { canOperateMeeting } from "@/lib/permission";
import { isMock } from "@/mocks/config";

import { hostIdOf, parseMeetingDetail } from "../mapper";
import {
  type BeAnalysisResumeResponse,
  type RetrySummaryResult,
  toRetrySummaryResult,
} from "./mapper";
import { findMockStalledSummary, removeMockStalledSummary } from "./mock/stalled-summaries";

const MY_PAGE_PATH = "/app/me";

/**
 * BE가 **재개할 계층이 없다**고 답할 때의 코드(409 `ANLZ-008`).
 *
 * ⚠️ 번호가 005가 아니다. 처음엔 005로 넣었다가 `SUMMARY_ITEM_NOT_FOUND`(404)와 겹쳐 008로
 *    옮겼다(BE `CaptureErrorCode` 주석 — CodeRabbit PR #318). 문서에 005로 남아 있는 곳이
 *    있는데 **실코드가 008**이다(§연동 검증: 문서와 코드가 다르면 코드가 맞다).
 */
const NOTHING_TO_RESUME = "ANLZ-008";

/**
 * [다시 분석] 결과 — **실패를 던지지 않고 값으로 돌려준다.**
 *
 * ⚠️ 예전엔 `void`를 주고 던졌는데, 그러면 화면이 `catch` 한 곳에서 전부 같은 문구를 띄운다 —
 *    "재개할 계층이 없다"(처음부터 다시 돌려야 한다)와 "서버가 답을 안 한다"가 같은 말이 됐다.
 *    무엇이 막았는지 화면이 알아야 다음 걸음을 안내할 수 있다(§정직성, `cancelMeetingAction`과 같은 모양).
 */
export interface RetryMeetingSummaryState {
  /** 값이 있으면 실패다 — 화면에 그대로 띄울 한 줄(§lib/api: BE `message`를 새로 짓지 않는다) */
  error: string | null;
  /**
   * **재개할 자리가 없는 회의**(409 `ANLZ-008`). 전부 성공했거나 한 번도 안 돌았다는 뜻이라
   * 이 버튼으로는 영영 안 된다 — 처음부터(ANLZ-01) 돌려야 한다.
   *
   * ⚠️ 일반 실패와 가른다. "잠시 후 다시 시도"라고 안내하면 같은 버튼을 계속 누르게 되는데
   *    그 회의는 몇 번을 눌러도 같은 409다.
   */
  needsFullRerun: boolean;
  /**
   * 요청은 갔는데 **요약이 아직 없는** 경우의 사정 한 줄 — 다 됐으면 `null`이다.
   *
   * ⚠️ 200인데 `FAILED`·`SKIPPED`거나 다른 실행이 돌고 있는(`ALREADY_RUNNING`·`SUPERSEDED`)
   *    경우다(§mapper). 오류로 칠하지 않는다 — 요청 자체는 정상으로 처리됐다. 다만 성공
   *    토스트를 띄우면 요약이 생긴 줄 알게 되므로 **문구를 갈라야 한다**(§정직성).
   */
  pendingNote: string | null;
}

const OK: RetryMeetingSummaryState = { error: null, needsFullRerun: false, pendingNote: null };

/** 실패도 아니고 완료도 아닌 결과를 그대로 옮긴다 — BE 문장을 새로 짓지 않는다. */
function toState(result: RetrySummaryResult): RetryMeetingSummaryState {
  if (result.outcome === "resumed") return OK;
  return { error: null, needsFullRerun: false, pendingNote: result.message };
}

/**
 * [다시 분석](ANLZ-02) — **실패한 계층부터 이어서** 돌린다(재과금 없음).
 *
 * ⚠️ **본문을 안 보낸다.** 이 버튼은 어느 계층이 깨졌는지 모르고, 알려면 CAP-06을 먼저 부르는
 *    왕복이 생긴다 — 생략하면 서버가 처음 깨진 계층을 고른다(BE `ResumeAnalysisRequest`).
 *    빈 문자열을 보내면 400 `ANLZ-003`이라 **아예 안 보내는 것**이 계약이다.
 * ⚠️ **Host만 요청할 수 있다 — 그 판정이 우리 몫이다.** BE ANLZ-02는 역할(`@PreAuthorize`)과
 *    회사 스코프(`MeetingAccessGuard`)만 보고 **host인지는 안 본다**(RVW-05와 다르다). 그래서
 *    회의 상세(MEET-04)로 개설자를 확인하고 부른다 — 화면 버튼 숨김은 보안이 아니다(§권한).
 * ⚠️ 성공해도 요약이 찼다는 보장이 없다 — 200 응답의 `status`가 실제 결과다(§mapper).
 */
export async function retryMeetingSummaryAction(
  meetingId: string,
): Promise<RetryMeetingSummaryState> {
  const viewer = await getViewer();

  if (isMock) {
    const item = findMockStalledSummary(meetingId);
    if (!item)
      return { error: "회의를 찾을 수 없습니다", needsFullRerun: false, pendingNote: null };
    if (!canOperateMeeting(viewer, { ownerId: item.hostId })) {
      return { error: "권한이 없습니다", needsFullRerun: false, pendingNote: null };
    }

    removeMockStalledSummary(meetingId);
    revalidatePath(MY_PAGE_PATH);
    return OK;
  }

  const accessToken = await requireAccessToken();

  /*
    ⚠️ **상세로 개설자를 직접 본다**(2026-08-13, 코드래빗 지적). 예전엔 중단 목록(MEET-15)
       **첫 페이지**에 그 회의가 있는지로 갈랐는데, 그 목록은 페이지로 오므로(최대 100건)
       101번째부터의 **자기 회의가 "권한 없음"으로 막혔다** — 소유권은 페이지 운에 달린 값이
       아니다. 목이 `hostId`로 하는 검사를 실연동에서 대신하는 자리이고, 판정 함수도
       목과 같은 `canOperateMeeting` 하나다(§권한: 판정은 한 곳).
    ⚠️ 한 번 더 부르는 값은 있다. 이 버튼은 자주 눌리지 않고, 없으면 **회사 안 아무 회의나**
       재분석을 걸 수 있는 경로가 열린 채로 남는다.
  */
  try {
    const detail = parseMeetingDetail(
      await serverApi<unknown>(ep.meeting(Number(meetingId)), { accessToken }),
    );
    if (!canOperateMeeting(viewer, { ownerId: hostIdOf(detail) })) {
      return { error: "권한이 없습니다", needsFullRerun: false, pendingNote: null };
    }
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { error: error.message, needsFullRerun: false, pendingNote: null };
  }

  try {
    const response = await serverApi<BeAnalysisResumeResponse>(
      ep.meetingAnalysisRetry(Number(meetingId)),
      { method: "POST", accessToken },
    );
    revalidatePath(MY_PAGE_PATH);
    return toState(toRetrySummaryResult(response));
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    /*
      ⚠️ 409 둘을 뭉치지 않는다. `ANLZ-008`은 이 버튼으로는 끝난 이야기라 다른 안내가 필요하고,
         `ANLZ-004`(앞 계층 미완)는 지금은 못 잇는다는 뜻이라 나중에 같은 요청이 성립한다 —
         그쪽은 BE 문장을 그대로 띄우는 일반 실패로 둔다.
    */
    return {
      error: error.message,
      needsFullRerun: error.code === NOTHING_TO_RESUME,
      pendingNote: null,
    };
  }
}
