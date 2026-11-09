import { FINALIZE_BLOCK_REASON } from "@/constants/handover";

import { evaluateFinalApproval } from "./final-approval";

/* BE `HandoverFinalApprovalTest`와 같은 표다 — 목과 실서버가 같은 규칙이어야 한다 */
describe("evaluateFinalApproval (목 전용, BE 규칙 복제)", () => {
  it("대표 + 일반 팀원 신청 + 중간 승인 전 → 중간 승인 필요", () => {
    expect(
      evaluateFinalApproval({
        hasMidApproval: false,
        isWriterCurrentLeader: false,
        isViewerOwner: true,
      }),
    ).toEqual({
      canFinalize: false,
      requiresIntermediateApproval: true,
      finalizeBlockReason: FINALIZE_BLOCK_REASON.INTERMEDIATE_APPROVAL_REQUIRED,
    });
  });

  it("대표 + 중간 승인 완료 → 승인 가능", () => {
    expect(
      evaluateFinalApproval({
        hasMidApproval: true,
        isWriterCurrentLeader: false,
        isViewerOwner: true,
      }),
    ).toEqual({
      canFinalize: true,
      requiresIntermediateApproval: false,
      finalizeBlockReason: null,
    });
  });

  it("대표 + 지금 팀장의 본인 신청 → 중간 승인 없이 승인 가능", () => {
    expect(
      evaluateFinalApproval({
        hasMidApproval: false,
        isWriterCurrentLeader: true,
        isViewerOwner: true,
      }),
    ).toEqual({
      canFinalize: true,
      requiresIntermediateApproval: false,
      finalizeBlockReason: null,
    });
  });

  it("대표가 아니면(겸직 관리자) 승인 불가 — 중간 승인 필요 여부는 그대로 알려 준다", () => {
    expect(
      evaluateFinalApproval({
        hasMidApproval: false,
        isWriterCurrentLeader: false,
        isViewerOwner: false,
      }),
    ).toEqual({
      canFinalize: false,
      requiresIntermediateApproval: true,
      finalizeBlockReason: FINALIZE_BLOCK_REASON.OWNER_REQUIRED,
    });
  });
});
