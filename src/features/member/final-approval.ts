import { FINALIZE_BLOCK_REASON } from "@/constants/handover";

import type { PendingHandover } from "./manage-types";

type FinalApproval = Pick<
  PendingHandover,
  "canFinalize" | "requiresIntermediateApproval" | "finalizeBlockReason"
>;

/**
 * 최종 승인 판정 — **목 전용**이다. 실서버는 BE가 같은 값을 응답에 실어 준다.
 *
 * ⚠️ BE `HandoverFinalApproval.evaluate`를 그대로 옮겼다 — 목과 실서버가 다른 규칙이면
 *    데모에서 되던 버튼이 시연에서 안 된다.
 * ⚠️ 목은 **대기 중인 신청만** 들고 있다(승인·반려하면 지운다). 그래서 상태는 둘뿐이고
 *    중간 승인이 있으면 `REASSIGNED`, 없으면 `SUBMITTED`로 본다.
 * ⚠️ **팀장인지는 신청 당시가 아니라 지금 기준이다**(BE와 같다 — 당시 권한 스냅샷은 없다).
 */
export function evaluateFinalApproval({
  hasMidApproval,
  isWriterCurrentLeader,
  isViewerOwner,
}: {
  hasMidApproval: boolean;
  isWriterCurrentLeader: boolean;
  isViewerOwner: boolean;
}): FinalApproval {
  const requiresIntermediateApproval = !hasMidApproval && !isWriterCurrentLeader;

  if (!isViewerOwner) {
    return {
      canFinalize: false,
      requiresIntermediateApproval,
      finalizeBlockReason: FINALIZE_BLOCK_REASON.OWNER_REQUIRED,
    };
  }
  if (requiresIntermediateApproval) {
    return {
      canFinalize: false,
      requiresIntermediateApproval: true,
      finalizeBlockReason: FINALIZE_BLOCK_REASON.INTERMEDIATE_APPROVAL_REQUIRED,
    };
  }
  return { canFinalize: true, requiresIntermediateApproval: false, finalizeBlockReason: null };
}
