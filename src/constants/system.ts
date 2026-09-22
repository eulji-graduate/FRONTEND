/**
 * 서비스 운영자(SYSTEM) 화면에서만 쓰는 상수 — AI 파이프라인 · 공지 발행 대상 · 기업 관리.
 *
 * ⚠️ 여기 값은 **우리 회사 화면에 안 나간다.** 기업 사용자 화면에서 쓰기 시작하면
 *    운영자 개념이 새어 나가므로, 쓸 일이 생기면 해당 도메인 파일로 옮긴다.
 */

/**
 * 회의 캡처 → 액션 하달까지의 처리 단계. SYSTEM 운영자가 큐·실패를 이 단계 기준으로 본다.
 * ⚠️ STT(자막 변환)는 브라우저 기능이지만, 여기 단계는 **서버 파이프라인의 재처리 단위**라
 *    별개다 — 운영자가 실패를 재처리하는 대상은 서버 잡이다(CLAUDE.md §AI: STT 표기 주의).
 */
export const PIPELINE_STAGE = {
  UPLOAD: "UPLOAD",
  TRANSCRIBE: "TRANSCRIBE",
  SUMMARIZE: "SUMMARIZE",
  EXTRACT_ACTION: "EXTRACT_ACTION",
} as const;
export type PipelineStage = (typeof PIPELINE_STAGE)[keyof typeof PIPELINE_STAGE];

export const PIPELINE_STAGE_LABEL: Record<PipelineStage, string> = {
  UPLOAD: "업로드",
  TRANSCRIBE: "자막 변환",
  SUMMARIZE: "요약 생성",
  EXTRACT_ACTION: "액션 추출",
};

/** 공지 발행 대상. SYSTEM 운영자가 어느 기업군에 공지를 뿌릴지 고른다. */
export const NOTICE_TARGET = {
  ALL: "ALL",
  SPECIFIC: "SPECIFIC",
  UNPAID: "UNPAID",
} as const;
export type NoticeTarget = (typeof NOTICE_TARGET)[keyof typeof NOTICE_TARGET];

export const NOTICE_TARGET_LABEL: Record<NoticeTarget, string> = {
  ALL: "전체 기업",
  SPECIFIC: "특정 기업",
  UNPAID: "미납 기업",
};

/*
  ───────── 구독 · 기업 ─────────
  ⚠️ 우리 화면의 구독 상태는 여기가 아니라 `features/billing/subscription.ts`다
     (`SUBSCRIPTION_STATUS`). 아래는 **운영자가 남의 회사를 볼 때** 쓰는 값이라 축이 다르다.
*/

/*
  ⚠️ **요금제 상수는 여기 없다.** 유료 하나뿐이라 고를 것이 없다(CLAUDE.md §요금제) —
     `PLAN`/`PLAN_LABEL`을 두면 화면이 "어느 플랜이냐"를 묻기 시작하고, 그 순간
     없는 무료 요금제가 다시 생긴다. 결제 전·해지 후는 플랜이 아니라 **구독 상태**다
     (`features/billing/subscription.ts`의 `SUBSCRIPTION_STATUS`).
*/

export const PAYMENT_STATUS = {
  PAID: "PAID",
  UNPAID: "UNPAID",
  CANCELED: "CANCELED",
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PAID: "완료",
  UNPAID: "미납",
  CANCELED: "해지",
};

/** 시스템(운영자)이 보는 기업 상태 */
export const COMPANY_STATUS = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  UNPAID: "UNPAID",
} as const;
export type CompanyStatus = (typeof COMPANY_STATUS)[keyof typeof COMPANY_STATUS];

export const COMPANY_STATUS_LABEL: Record<CompanyStatus, string> = {
  ACTIVE: "활성",
  SUSPENDED: "정지",
  UNPAID: "미납",
};

/** URL 쿼리처럼 바깥에서 들어오는 값을 검증할 때 쓴다(`isVisibleMemberStatus`와 같은 패턴). */
export function isCompanyStatus(value: string): value is CompanyStatus {
  return (Object.values(COMPANY_STATUS) as string[]).includes(value);
}

/** "기업 관리" 목록 정렬 기준 — 규모·플랜 필터를 대신한다(구성원수·가입일 기준). */
export const COMPANY_SORT = {
  MEMBERS_DESC: "MEMBERS_DESC",
  MEMBERS_ASC: "MEMBERS_ASC",
  JOINED_DESC: "JOINED_DESC",
  JOINED_ASC: "JOINED_ASC",
} as const;
export type CompanySort = (typeof COMPANY_SORT)[keyof typeof COMPANY_SORT];

export const COMPANY_SORT_LABEL: Record<CompanySort, string> = {
  MEMBERS_DESC: "구성원 많은순",
  MEMBERS_ASC: "구성원 적은순",
  JOINED_DESC: "최신 가입순",
  JOINED_ASC: "오래된 가입순",
};

export function isCompanySort(value: string): value is CompanySort {
  return (Object.values(COMPANY_SORT) as string[]).includes(value);
}

/** 기업 가입 신청서의 직원 규모 구간. */
export const COMPANY_SIZE = {
  MICRO: "MICRO",
  SMALL: "SMALL",
  MEDIUM: "MEDIUM",
  LARGE: "LARGE",
} as const;
export type CompanySize = (typeof COMPANY_SIZE)[keyof typeof COMPANY_SIZE];

export const COMPANY_SIZE_LABEL: Record<CompanySize, string> = {
  MICRO: "5명 이하",
  SMALL: "6~20명",
  MEDIUM: "21~100명",
  LARGE: "101명 이상",
};

/** 기업 승인 처리 결과 — 상세 모달이 어느 쪽을 실행했는지 가리고, 결과 토스트 문구를 고른다. */
export const APPROVAL_RESULT = {
  APPROVE: "approve",
  REJECT: "reject",
} as const;
export type ApprovalResult = (typeof APPROVAL_RESULT)[keyof typeof APPROVAL_RESULT];

export const APPROVAL_RESULT_LABEL: Record<ApprovalResult, string> = {
  approve: "승인했습니다",
  reject: "반려했습니다",
};
