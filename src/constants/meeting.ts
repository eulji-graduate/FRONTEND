/**
 * 회의 · 캡처 · AI 요약 상수.
 *
 * ⚠️ 코드값은 **FE 제안**이다. 회의 도메인 담당자 문서를 받으면 여기부터 맞춘다
 *    (CLAUDE.md §연동 검증).
 */

export const MEETING_STATUS = {
  SCHEDULED: "SCHEDULED",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
  /** 취소(MEET-06) — 소프트 취소다. BE도 물리 삭제 없이 `status`+`canceled_at`으로 남긴다. */
  CANCELED: "CANCELED",
} as const;
export type MeetingStatus = (typeof MEETING_STATUS)[keyof typeof MEETING_STATUS];

export const MEETING_STATUS_LABEL: Record<MeetingStatus, string> = {
  SCHEDULED: "예정",
  IN_PROGRESS: "진행중",
  DONE: "완료",
  CANCELED: "취소",
};

/** URL 쿼리처럼 바깥에서 들어오는 값을 검증할 때 쓴다(`isVisibleMemberStatus`와 같은 패턴). */
export function isMeetingStatus(value: string): value is MeetingStatus {
  return (Object.values(MEETING_STATUS) as string[]).includes(value);
}

/** 캡처 세션 — 담당자만 조작 가능(권한 2축, lib/permission.ts) */
export const CAPTURE_STATUS = {
  IDLE: "IDLE",
  RECORDING: "RECORDING",
  SUBMITTING: "SUBMITTING",
  DONE: "DONE",
} as const;
export type CaptureStatus = (typeof CAPTURE_STATUS)[keyof typeof CAPTURE_STATUS];

/**
 * ⚠️ `REVIEWED`와 `DISTRIBUTED`는 다른 단계다. 요약은 **초안**까지이고,
 *    실제 액션은 검토 화면에서 [액션 분배 확정]을 눌러야 생긴다(CLAUDE.md §브라우저 API).
 */
export const AI_SUMMARY_STATUS = {
  PENDING: "PENDING",
  SUMMARIZING: "SUMMARIZING",
  REVIEWED: "REVIEWED",
  DISTRIBUTED: "DISTRIBUTED",
  /**
   * ⚠️ BE #177(2026-08-08): 서버가 죽어 끊긴 것도, 실제로 분석이 실패한 것도 전부
   *    이 값으로 온다. 둘을 가르는 건 `stalled` 플래그(층별)다 — 상태 하나 더 만들지
   *    않는다(§도메인 상수: 파생값은 계산). 이 상수엔 `stalled` 자체를 안 담는다 —
   *    회의 하나 안의 여러 층 중 일부만 stalled일 수 있어서, 그 판정은 화면(마이페이지
   *    "요약이 중단된 회의")이 층 목록을 보고 계산한다.
   */
  FAILED: "FAILED",
} as const;
export type AiSummaryStatus = (typeof AI_SUMMARY_STATUS)[keyof typeof AI_SUMMARY_STATUS];

export const AI_SUMMARY_STATUS_LABEL: Record<AiSummaryStatus, string> = {
  PENDING: "대기",
  SUMMARIZING: "요약 중",
  REVIEWED: "검토 완료",
  DISTRIBUTED: "분배 완료",
  FAILED: "실패",
};

/**
 * AI 처리 상태(CAP-06 `GET /api/meetings/:id/processing-status`)의 `status`.
 * [확인] BE 실코드 대조(2026-08-13) — `capture/application/result/ProcessingStatus.java`
 * (`OverallStatus`) · 응답은 `ProcessingStatusResponse`가 `status().name()`으로 문자열화한다.
 *
 * ⚠️ **`AI_SUMMARY_STATUS`와 다른 값이다.** 저쪽은 회의 카드에 붙는 요약 진행 라벨이고,
 *    이건 **계층 실행 상태를 회의 하나로 접은 값**이다. 이름이 비슷해 섞어 쓰기 쉬운데,
 *    섞으면 매퍼에서 조용히 틀린다(§도메인 상수 — BE enum과 이름이 어긋나면 조용히 틀린다).
 * ⚠️ **`NOT_STARTED`는 "안 한다"가 아니라 "아직 계층 기록이 없다"**는 뜻이다. 회의 종료
 *    직후 서버가 큐에 걸기 전까지 이 값이 온다 — 완료로 읽으면 요약이 없는데 다 됐다고
 *    말하게 된다(§정직성).
 * ⚠️ **멈춘 RUNNING은 BE가 `FAILED`로 접어 준다**(BE #177 · `stalled`). 화면이 따로
 *    계산하지 않아도 실패로 보인다 — 안 접으면 「요약 중」이 영원히 끝나지 않는다.
 */
export const PROCESSING_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  RUNNING: "RUNNING",
  DONE: "DONE",
  FAILED: "FAILED",
} as const;
export type ProcessingStatus = (typeof PROCESSING_STATUS)[keyof typeof PROCESSING_STATUS];

/** 스트림·응답으로 들어온 문자열이 우리가 아는 값인지(`isMeetingStatus`와 같은 패턴). */
export function isProcessingStatus(value: string): value is ProcessingStatus {
  return (Object.values(PROCESSING_STATUS) as string[]).includes(value);
}

/*
  ⚠️ **초대 수락·거절 상수는 두지 않는다**(2026-08-07 제거). `MEETING_INVITE_STATUS`
     (미응답·참석·불참)가 정의만 되고 아무 데서도 안 쓰이고 있었는데, WORKFLOW 어디에도
     참석 응답 개념이 없다 — 예약은 **즉시 확정**이고(§3-1) 참석자는 지정될 뿐이며,
     열람 권한도 응답이 아니라 지정 여부로 판정한다(§3-2-1).
     남겨 두면 나중에 이걸 근거로 수락/거절 UI가 생긴다(§도메인 상수: 없는 걸 금지 문장으로만
     두면 누가 만든다). 회의 주제 enum을 같은 이유로 지운 것과 같은 처리다.
*/

/**
 * AI 액션 분배 리뷰 화면(`/app/meeting/:id/review`)의 확신도 구분 — 표시 차이일 뿐
 * 둘 다 전부 수정 가능하다(WORKFLOW.md §3-4 "두 그룹은 시각적 구분(라벨)일 뿐, 수정은 전부
 * 가능(A안)"). ⚠️ 구분은 **색이 아니라 아이콘**으로 한다(DESIGN.md §5 — 상태점 외 색 금지).
 */
export const AI_CONFIDENCE = {
  HIGH: "HIGH",
  NEEDS_REVIEW: "NEEDS_REVIEW",
} as const;
export type AiConfidence = (typeof AI_CONFIDENCE)[keyof typeof AI_CONFIDENCE];

export const AI_CONFIDENCE_LABEL: Record<AiConfidence, string> = {
  HIGH: "AI 확신도 높음",
  // ⚠️ "AI 확인 필요"에서 정정(2026-08-07 사용자 확정) — WORKFLOW.md §3-4 문구도 같이 갱신.
  NEEDS_REVIEW: "AI 요약 불확실",
};

/**
 * 액션 분배 리뷰에서 ✕(반려) 클릭 시 고르는 사유 5택(WORKFLOW.md §3-4).
 * 담당자·날짜만 고친 경우는 사유가 필요 없다 — ✕로 제외할 때만 고른다.
 *
 * ⚠️ **BE `RejectReason`에서 사람이 고르는 값(`isHumanSelectable`)과 1:1이다**
 *    (2026-08-11 PM 확정으로 3종 → 5종 — [확인] `capture/domain/model/RejectReason.java`).
 *    `NOT_CONFIRMED`는 `NOT_ACTION`으로 대체됐다 — 옛 값을 보내면 BE enum에 없어 거절된다.
 * ⚠️ `WRONG_ASSIGNEE` 같은 **수정 사유는 여기 없다.** 사람이 고르는 게 아니라 바뀐 필드를
 *    보고 BE가 자동으로 붙인다 — 보내면 422(`REVIEW_REASON_NOT_SELECTABLE`).
 * ⚠️ `ETC`는 텍스트 입력이 없다(PM 확정) — 버튼 하나로 고르는 순수 enum 값이다.
 */
export const ACTION_REJECT_REASON = {
  HALLUCINATION: "HALLUCINATION",
  DUPLICATE: "DUPLICATE",
  NOT_ACTION: "NOT_ACTION",
  NOT_ATTENDANCE: "NOT_ATTENDANCE",
  ETC: "ETC",
} as const;
export type ActionRejectReason = (typeof ACTION_REJECT_REASON)[keyof typeof ACTION_REJECT_REASON];

/**
 * 액션 분배 검토 화면이 배정 대상을 부르는 말 — Owner 회의는 "부서", 그 외엔 "담당자"
 * (WORKFLOW.md §2/§3-4, 2026-08-13 확정). ⚠️ CodeRabbit 지적으로 분리 — 화면 곳곳(셀렉트
 * aria-label·미정 안내·배너·확정 대상 표시)에 "부서"/"담당자"를 직접 하드코딩하지 않고
 * 여기서만 고른다. 판정 기준은 `MeetingReviewInfo.isOwnerMeeting` 하나다.
 */
export const REVIEW_ASSIGNMENT_TARGET = {
  TEAM: "TEAM",
  PERSONAL: "PERSONAL",
} as const;
export type ReviewAssignmentTarget =
  (typeof REVIEW_ASSIGNMENT_TARGET)[keyof typeof REVIEW_ASSIGNMENT_TARGET];

export const REVIEW_ASSIGNMENT_TARGET_LABEL: Record<ReviewAssignmentTarget, string> = {
  TEAM: "부서",
  PERSONAL: "담당자",
};

export const ACTION_REJECT_REASON_LABEL: Record<ActionRejectReason, string> = {
  HALLUCINATION: "그런 말을 한 적 없음",
  DUPLICATE: "다른 액션과 중복",
  NOT_ACTION: "액션으로 분배할 내용이 아님",
  NOT_ATTENDANCE: "담당자가 회의에 참석하지 않음",
  ETC: "기타",
};

/*
  ⚠️ 회의 주제(대주제/소주제) 고정 enum은 여기 없다(2026-08-07 제거) — WORKFLOW.md §3-1
     확정: "대주제 1개+소주제 1개 필수, 나머지는 추가/삭제 버튼으로 늘리고 줄이는" **자유 입력
     텍스트**다. 타입은 `features/rooms/types.ts`의 `MeetingTopicInput`(자유 텍스트 쌍)을 본다.
*/

/**
 * 회의 상태 배지 — **색이 아니라 명도**로 가른다(DESIGN §5).
 *
 * ⚠️ 한때 예정=파랑·진행중=초록이었다. 그건 "색을 써도 되는 자리" 표에 없는 색이고,
 *    같은 화면의 프로젝트 태그(팔레트 색)와 섞여 무엇을 구분하는 색인지 알 수 없었다.
 *    지금 도는 회의만 **채워서** 띄우고 나머지는 테두리만 둔다.
 * ⚠️ 목록 카드와 대시보드 위젯이 **같은 맵을 쓴다.** 두 벌로 두면 같은 상태가 화면마다
 *    다르게 보인다(§도메인 상수: 라벨·색은 한 곳).
 */
export const MEETING_STATUS_BADGE_CLASS: Record<MeetingStatus, string> = {
  /*
    ⚠️ **명도 사다리를 벌린다**(2026-08-10). 셋 다 테두리만 있는 옅은 글씨라 **상태가 눈에
       안 걸렸다** — 예정인지 완료인지가 이 목록에서 제일 먼저 보여야 하는 값인데도 그랬다.
       색을 쓸 수 없으니(위 주석) 대신 **면·굵기·대비**를 셋 사이에서 확실히 갈라 놓는다.
    ⚠️ 지금 도는 회의가 제일 진하고, 다가올 회의가 그다음, 끝난 회의가 제일 옅다 —
       손이 필요한 순서다.
  */
  /** 지금 도는 것 — 먹색 면. 이 목록에서 제일 강하다 */
  IN_PROGRESS: "border-transparent bg-foreground text-background font-semibold",
  /** 다가올 것 — 옅은 면 + 진한 글씨. 테두리만 있던 때는 배경에 묻혔다 */
  SCHEDULED: "border-transparent bg-foreground/[0.08] text-foreground font-semibold",
  /** 끝난 것 — 테두리만. 더 볼 일이 없다는 뜻이라 일부러 물러나 있다 */
  DONE: "border-border text-muted-foreground font-medium",
  /** 취소된 것 — DONE과 같은 무게(더 볼 일이 없다)다. 취소는 색이 아니라 라벨 글자로만 구분한다. */
  CANCELED: "border-border text-muted-foreground font-medium",
};

/**
 * 캡처 화면이 **막혔을 때 하는 말** — 화면에 흩어 두지 않는다(§도메인 상수: 라벨 하드코딩 금지).
 *
 * ⚠️ 종료는 되돌릴 수 없는 조작이라, 실패했을 때 **무엇이 안 됐는지**를 정확히 말해야 한다 —
 *    "연결하지 못했습니다"처럼 원인을 단정하면 서버가 멀쩡할 때 거짓말이 된다(§정직성).
 * ⚠️ 토스트로 쓰는 문구는 **한 줄(220px)**을 넘기지 않는다(`components/ui/sonner.tsx`).
 */
export const CAPTURE_FAILURE_MESSAGE = {
  /** 화면에 남기는 줄 — 다음에 할 일까지 적는다 */
  MEETING_END: "회의 종료를 서버에 알리지 못했습니다. 잠시 후 다시 시도해 주세요.",
  /** 토스트로 쓰는 짧은 말 */
  MEETING_END_TOAST: "회의를 종료하지 못했습니다",
} as const;
