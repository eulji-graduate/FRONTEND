jest.mock("../manage-actions", () => ({
  approveHandoverAction: jest.fn(),
  rejectHandoverAction: jest.fn(),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AUTHORITY } from "@/constants/authority";
import { FINALIZE_BLOCK_REASON, HANDOVER_TYPE } from "@/constants/handover";

import type { PendingHandover } from "../manage-types";
import { HandoverApprovalCard } from "./handover-approval-card";

const BASE: PendingHandover = {
  id: "10",
  type: HANDOVER_TYPE.VACATION,
  period: { from: "2026-11-05", to: "2026-11-09" },
  actionCount: 3,
  midApproval: null,
  /* 일반 팀원 신청, 중간 승인 전 — 대표가 보는 BE 판정 */
  canFinalize: false,
  requiresIntermediateApproval: true,
  finalizeBlockReason: FINALIZE_BLOCK_REASON.INTERMEDIATE_APPROVAL_REQUIRED,
};

/** 중간 승인이 끝나 대표가 최종 승인할 수 있는 상태 */
const READY: PendingHandover = {
  ...BASE,
  midApproval: { approverName: "김서준", approvedAt: "2026-11-03" },
  canFinalize: true,
  requiresIntermediateApproval: false,
  finalizeBlockReason: null,
};

function renderCard(handover: PendingHandover, canApprove = true, isLeader = false) {
  render(
    <HandoverApprovalCard
      memberId={3}
      memberName="이하윤"
      memberAuthority={isLeader ? AUTHORITY.LEADER : AUTHORITY.MEMBER}
      handover={handover}
      canApprove={canApprove}
    />,
  );
}

describe("HandoverApprovalCard — 겸직 관리자", () => {
  it("승인 권한이 없으면 버튼 대신 대표만 할 수 있다고 적는다", () => {
    renderCard({ ...BASE, finalizeBlockReason: FINALIZE_BLOCK_REASON.OWNER_REQUIRED }, false);

    expect(screen.queryByRole("button", { name: "최종 승인" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "반려" })).not.toBeInTheDocument();
    expect(screen.getByText("최종 승인·반려는 대표만 할 수 있습니다.")).toBeInTheDocument();
  });

  it("대표에게는 안내 문구를 띄우지 않는다", () => {
    renderCard(BASE);

    expect(screen.queryByText("최종 승인·반려는 대표만 할 수 있습니다.")).not.toBeInTheDocument();
  });

  it("승인 권한이 없으면 '검토 필요' 배지도 숨긴다", () => {
    renderCard({ ...BASE, finalizeBlockReason: FINALIZE_BLOCK_REASON.OWNER_REQUIRED }, false);

    expect(screen.queryByText("검토 필요")).not.toBeInTheDocument();
  });

  it("대표에게는 '검토 필요' 배지를 단다", () => {
    renderCard(BASE);

    expect(screen.getByText("검토 필요")).toBeInTheDocument();
  });
});

describe("HandoverApprovalCard — 반려 안내", () => {
  const RETURN_COPY = "인계된 액션은 원래 담당자에게 돌아갑니다.";

  it("오프보딩 반려 창은 인계된 액션이 원래 담당자에게 돌아간다고 적는다", async () => {
    const user = userEvent.setup();
    renderCard({ ...READY, type: HANDOVER_TYPE.OFFBOARDING, period: null });

    await user.click(screen.getByRole("button", { name: "반려" }));

    expect(await screen.findByText(RETURN_COPY, { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(/되돌아오지 않습니다/)).not.toBeInTheDocument();
  });

  /* ⚠️ BE는 휴직 반려 때도 인계된 액션을 되돌린다 — 휴직 창도 같은 문장이다 */
  it("휴직 반려 창도 같은 문장을 적는다", async () => {
    const user = userEvent.setup();
    renderCard(BASE);

    await user.click(screen.getByRole("button", { name: "반려" }));

    expect(await screen.findByText(RETURN_COPY, { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(/인수인계부터 새로 밟아야/)).not.toBeInTheDocument();
  });
});

describe("HandoverApprovalCard — 최종 승인은 BE 판정(canFinalize)대로", () => {
  it("중간 승인 전이면 최종 승인을 잠그고 BE 사유를 문장으로 잇는다", () => {
    // Arrange
    renderCard(BASE);

    // Act
    const approve = screen.getByRole("button", { name: "최종 승인" });

    // Assert
    expect(approve).toBeDisabled();
    expect(approve).toHaveAccessibleDescription("팀장의 중간 승인 후 최종 승인할 수 있습니다.");
    expect(screen.getByText(/아직 팀장의 중간 승인을 기다리고 있습니다/)).toBeInTheDocument();
  });

  it("최종 승인이 잠겨도 반려는 열어 둔다", () => {
    renderCard(BASE);

    expect(screen.getByRole("button", { name: "반려" })).toBeEnabled();
  });

  it("canFinalize가 참이면 열리고 사유 문장이 없다", () => {
    renderCard(READY);

    const approve = screen.getByRole("button", { name: "최종 승인" });
    expect(approve).toBeEnabled();
    expect(approve).not.toHaveAccessibleDescription();
  });

  it("중간 승인 기록도, 더 받을 필요도 없으면 팀장 직접 신청 문장을 쓴다", () => {
    renderCard({ ...READY, midApproval: null }, true, true);

    expect(screen.getByRole("button", { name: "최종 승인" })).toBeEnabled();
    expect(screen.getByText(/중간 승인 단계 없이 올라왔습니다/)).toBeInTheDocument();
  });

  /* ⚠️ 화면은 권한·중간 승인으로 다시 추정하지 않는다 — 중간 승인이 있어도 BE가 막으면 잠근다 */
  it("중간 승인이 있어도 BE가 이미 처리됐다고 하면 잠근다", () => {
    renderCard({
      ...READY,
      canFinalize: false,
      finalizeBlockReason: FINALIZE_BLOCK_REASON.ALREADY_FINALIZED,
    });

    const approve = screen.getByRole("button", { name: "최종 승인" });
    expect(approve).toBeDisabled();
    expect(approve).toHaveAccessibleDescription("이미 최종 승인된 신청입니다.");
  });

  it("모르는 사유로 잠기면 일반 문장으로라도 이유를 적는다", () => {
    renderCard({ ...READY, canFinalize: false, finalizeBlockReason: null });

    expect(screen.getByRole("button", { name: "최종 승인" })).toHaveAccessibleDescription(
      "지금은 최종 승인할 수 없습니다.",
    );
  });
});
