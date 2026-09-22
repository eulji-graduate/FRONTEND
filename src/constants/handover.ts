/**
 * 인수인계 상수.
 *
 * ⚠️ **임시저장이 없다**(2026-08-05 확정). 생성 즉시 팀장에게 상신되고 작성자는 `WAITING`이 된다 —
 *    그래서 `DRAFT`가 없다. 되돌릴 수 없는 흐름이라 생성 창에서 한 번 확인을 받는다.
 * ⚠️ 승인이 **2단계**(팀장 중간 → 오너·Admin 최종)라 상태도 그만큼 필요하다.
 * ⚠️ 값 목록은 **인수인계 도메인 담당자 문서로 확인**해 맞춘다. 반려와 중간 승인을 표현할 수
 *    있어야 한다 — 셋뿐이면 승인 2단계를 담지 못한다.
 */
export const HANDOVER_STATUS = {
  SUBMITTED: "SUBMITTED",
  MID_APPROVED: "MID_APPROVED",
  FINAL_APPROVED: "FINAL_APPROVED",
  REJECTED: "REJECTED",
} as const;
export type HandoverStatus = (typeof HANDOVER_STATUS)[keyof typeof HANDOVER_STATUS];

export const HANDOVER_STATUS_LABEL: Record<HandoverStatus, string> = {
  SUBMITTED: "전달 완료",
  MID_APPROVED: "중간 승인",
  FINAL_APPROVED: "최종 승인",
  REJECTED: "반려",
};

/**
 * BE가 실제로 내려주는 상태 원본값(BE 인수인계 문서, 2026-08-10) — `REASSIGNED`·`FINALIZED`는
 * FE 이름과 달라 매퍼에서만 변환한다. `SUBMITTED`·`REJECTED`는 이름이 같아 그대로 통과.
 * ⚠️ BE enum은 DB·테스트까지 굳어 있어 이름을 안 바꾼다 — 경계(`mapHandoverStatusFromBe`)에서만
 *    흡수하고 UI·기존 화면(`MID_APPROVED` 등 사용)은 손대지 않는다.
 */
export const HANDOVER_STATUS_BE = {
  SUBMITTED: "SUBMITTED",
  REASSIGNED: "REASSIGNED",
  FINALIZED: "FINALIZED",
  REJECTED: "REJECTED",
} as const;
export type HandoverStatusBe = (typeof HANDOVER_STATUS_BE)[keyof typeof HANDOVER_STATUS_BE];

/** 응답 매퍼 경계 — BE 상태 원본값을 FE `HandoverStatus`로 바꾼다. */
export function mapHandoverStatusFromBe(status: HandoverStatusBe): HandoverStatus {
  switch (status) {
    case HANDOVER_STATUS_BE.REASSIGNED:
      return HANDOVER_STATUS.MID_APPROVED;
    case HANDOVER_STATUS_BE.FINALIZED:
      return HANDOVER_STATUS.FINAL_APPROVED;
    default:
      return status;
  }
}

export const HANDOVER_TYPE = {
  VACATION: "VACATION",
  OFFBOARDING: "OFFBOARDING",
} as const;
export type HandoverType = (typeof HANDOVER_TYPE)[keyof typeof HANDOVER_TYPE];

export const HANDOVER_TYPE_LABEL: Record<HandoverType, string> = {
  /*
    ⚠️ **"휴가"가 아니라 "휴직"이다.** 워크플로우가 처음부터 끝까지 휴직으로 부르고
       (§7 팀장 본인 휴직·휴직 최종 승인), 끝난 뒤 사람 상태도 `MEMBER_STATUS_LABEL.VACATION`
       = 휴직이다 — 신청 화면만 휴가라고 하면 같은 일을 두 이름으로 부르게 된다.
  */
  VACATION: "휴직",
  /*
    ⚠️ **흐름은 "오프보딩", 사람 상태는 "퇴사"다**(2026-08-05 확정, DECISIONS.md).
       같은 일의 두 쪽이라 라벨을 섞어 쓰면 화면이 다른 말을 한다 — 신청·승인 화면에서는
       여기 라벨을, 끝난 뒤 사원 목록에서는 `MEMBER_STATUS_LABEL.RESIGNED`를 쓴다.
  */
  OFFBOARDING: "오프보딩",
};

/**
 * "인수인계서 관리"(`/owner/leader-handovers`)의 상태 — **오프보딩 최종 승인
 * 뒤에만** 생긴다(WORKFLOW.md §7). `HANDOVER_STATUS`와 다른 축이다: 저건 신청→승인
 * 흐름이고, 이건 승인이 끝난 뒤 "담당자 없는 액션 뭉치를 누구에게 넘길지"의 흐름이다.
 * ⚠️ 팀장 **휴직**은 여기 안 온다 — 휴직은 본인이 재할당을 마치고 올라간다(§7).
 */
export const LEADER_HANDOVER_CUSTODY_STATUS = {
  PENDING: "PENDING",
  ASSIGNED: "ASSIGNED",
} as const;
export type LeaderHandoverCustodyStatus =
  (typeof LEADER_HANDOVER_CUSTODY_STATUS)[keyof typeof LEADER_HANDOVER_CUSTODY_STATUS];

export const LEADER_HANDOVER_CUSTODY_STATUS_LABEL: Record<LeaderHandoverCustodyStatus, string> = {
  PENDING: "귀속 대기",
  ASSIGNED: "귀속 완료",
};

/**
 * 승인 카드 제목에 붙는 신청자 서술어 — **권한 배지(Leader/Member, 영문)가 아니라
 * 한글 서술어다**(`handover-approval-card.tsx` 참고). 신청은 OWNER 제외 전원이 할 수
 * 있지만(`canWriteHandover`) 제목에서 가르는 건 팀장 본인 신청인지 여부뿐이라 둘로 충분하다.
 */
export const HANDOVER_APPLICANT_TYPE_LABEL = {
  LEADER: "팀장",
  MEMBER: "사원",
} as const;
