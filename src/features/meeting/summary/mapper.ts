/**
 * BE shape → UI 계약(§Mock 격리막). 컴포넌트는 이 파일을 모른다 — `server.ts`만 쓴다.
 * [확인] D도메인 REST API 명세(2026-08-12) 대조.
 */

import type { StalledSummaryInfo } from "./types";

/**
 * `GET /api/meetings/stalled-summaries`(MEET-15, 구현 완료) 목록 원소.
 * ⚠️ `isStalled`는 D가 만들지 않는다 — 요약 파이프라인을 가진 A가 갖고 있는 값을 그대로 싣는다.
 */
export interface BeStalledSummaryMeeting {
  meetingId: number;
  title: string;
  isStalled: boolean;
}

export interface BeStalledSummariesResponse {
  meetings: BeStalledSummaryMeeting[];
  page: { page: number; size: number; totalElements: number; totalPages: number };
}

/**
 * 마이페이지 "요약이 중단된 회의" 목록이 받는 모양으로 바꾼다.
 * ⚠️ `meetingId`는 BE가 숫자로 주지만 화면 계약은 문자열이다(다른 회의 id와 동일 규칙).
 */
export function toStalledSummaryInfo(be: BeStalledSummaryMeeting): StalledSummaryInfo {
  return {
    meetingId: String(be.meetingId),
    meetingTitle: be.title,
    isStalled: be.isStalled,
  };
}

/**
 * `POST /api/meetings/{meetingId}/analysis/retry`(ANLZ-02) 응답.
 * [확인] `capture/presentation/api/response/AnalysisResumeResponse.java`(2026-08-13).
 *
 * ⚠️ **`status`가 실제 결과다.** 명세는 202 `QUEUED`를 전제하지만 지금 BE엔 큐가 없어 요청
 *    스레드에서 그대로 돌린다 — 그래서 **이미 다시 실패한 재시도도 HTTP 200**으로 온다
 *    (BE 응답 주석). 200을 성공으로 읽으면 화면이 거짓말을 한다(§정직성).
 * ⚠️ 화면이 쓰는 필드만 적는다(§mapper 원칙). 응답엔 `resumeFromLayer`·`reusedLayers`·
 *    `failedLayer`·`errorCode`·`retryable`·`topicCount`도 오지만 이 위젯은 계층 이야기를
 *    하지 않는다 — 행 하나에 토스트 한 줄이 전부다.
 */
export interface BeAnalysisResumeResponse {
  /** `DONE` · `SKIPPED` · `ALREADY_RUNNING` · `SUPERSEDED` · `FAILED` (BE `AnalysisOutcome.Status`) */
  status: string;
  /** 실패·건너뜀의 사정 한 줄 — 성공이면 `null`이다 */
  message: string | null;
}

/**
 * [다시 분석]이 실제로 어떻게 됐는지 — **다섯 결과를 셋으로 접는다.**
 *
 * ⚠️ 사람이 다음에 할 일이 같은 것끼리만 묶는다:
 *    - `resumed`     요약이 채워졌다. 목록에서 그 줄이 빠진다.
 *    - `running`     다른 실행이 그 일을 하고 있다(`ALREADY_RUNNING`·`SUPERSEDED`) —
 *                    **오류가 아니라 중복 방어가 동작한 것**이라 기다리면 결과가 나온다.
 *    - `failedAgain` 또 멈췄거나(`FAILED`) 돌릴 것이 없었다(`SKIPPED`, 발화 0건 등).
 *                    어느 쪽이든 **요약은 여전히 없다** — 성공 토스트를 띄우면 거짓말이다.
 * ⚠️ 모르는 `status`를 성공으로 접지 않는다. BE가 값을 늘렸을 때 조용히 "됐습니다"라고
 *    말하는 쪽이 훨씬 나쁘다 — 요약이 없는데 됐다고 믿고 사람이 떠난다.
 */
export type RetrySummaryOutcome = "resumed" | "running" | "failedAgain";

export interface RetrySummaryResult {
  outcome: RetrySummaryOutcome;
  /** 화면에 띄울 한 줄 — BE가 사정을 실어 줬으면 그 문장을 그대로 쓴다(§lib/api) */
  message: string;
}

/** BE `AnalysisOutcome.Status` — 화면 어휘와 달라 이 파일에서만 쓴다(§도메인 상수: `enum` 금지). */
const RESUME_STATUS = {
  DONE: "DONE",
  ALREADY_RUNNING: "ALREADY_RUNNING",
  SUPERSEDED: "SUPERSEDED",
} as const;

export function toRetrySummaryResult(be: BeAnalysisResumeResponse): RetrySummaryResult {
  if (be.status === RESUME_STATUS.DONE) {
    return { outcome: "resumed", message: "다시 분석했습니다" };
  }
  if (be.status === RESUME_STATUS.ALREADY_RUNNING || be.status === RESUME_STATUS.SUPERSEDED) {
    return { outcome: "running", message: be.message ?? "이미 분석이 진행 중입니다" };
  }
  /* ⚠️ `FAILED`·`SKIPPED`·모르는 값이 전부 여기로 온다 — 요약이 없다는 사실은 셋 다 같다. */
  return { outcome: "failedAgain", message: be.message ?? "다시 분석했지만 또 멈췄습니다" };
}
