jest.mock("../manage-actions", () => ({
  approveHandoverAction: jest.fn(),
  rejectHandoverAction: jest.fn(),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AUTHORITY } from "@/constants/authority";
import { HANDOVER_TYPE } from "@/constants/handover";

import type { PendingHandover } from "../manage-types";
import { HandoverApprovalCard } from "./handover-approval-card";

const BASE: PendingHandover = {
  id: "10",
  type: HANDOVER_TYPE.VACATION,
  period: { from: "2026-11-05", to: "2026-11-09" },
  actionCount: 3,
  midApproval: null,
  requesterAuthority: AUTHORITY.MEMBER,
};

function renderCard(handover: PendingHandover, isRequesterLeader = false, canApprove = true) {
  render(
    <HandoverApprovalCard
      memberId={3}
      memberName="이하윤"
      memberAuthority={isRequesterLeader ? AUTHORITY.LEADER : AUTHORITY.MEMBER}
      handover={handover}
      canApprove={canApprove}
      isRequesterLeader={isRequesterLeader}
    />,
  );
}

describe("HandoverApprovalCard — 겸직 관리자", () => {
  it("승인 권한이 없으면 버튼 대신 대표만 할 수 있다고 적는다", () => {
    renderCard(BASE, false, false);

    expect(screen.queryByRole("button", { name: "최종 승인" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "반려" })).not.toBeInTheDocument();
    expect(screen.getByText("최종 승인·반려는 대표만 할 수 있습니다.")).toBeInTheDocument();
  });

  it("대표에게는 안내 문구를 띄우지 않는다", () => {
    renderCard(BASE);

    expect(screen.queryByText("최종 승인·반려는 대표만 할 수 있습니다.")).not.toBeInTheDocument();
  });

  it("승인 권한이 없으면 '검토 필요' 배지도 숨긴다", () => {
    renderCard(BASE, false, false);

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
    renderCard({
      ...BASE,
      type: HANDOVER_TYPE.OFFBOARDING,
      period: null,
      midApproval: { approverName: "최유진", approvedAt: "2026-11-07" },
    });

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

describe("HandoverApprovalCard — 중간 승인 전 최종 승인 잠금", () => {
  it("일반 팀원 신청이 중간 승인 전이면 최종 승인을 잠그고 그 이유 문장에 잇는다", () => {
    // Arrange
    renderCard(BASE);

    // Act
    const approve = screen.getByRole("button", { name: "최종 승인" });

    // Assert
    expect(approve).toBeDisabled();
    expect(approve).toHaveAccessibleDescription(/아직 팀장의 중간 승인을 기다리고 있습니다/);
  });

  it("중간 승인 전이어도 반려는 열어 둔다", () => {
    renderCard(BASE);

    expect(screen.getByRole("button", { name: "반려" })).toBeEnabled();
  });

  it("중간 승인이 끝나면 최종 승인이 열린다", () => {
    renderCard({
      ...BASE,
      midApproval: { approverName: "김서준", approvedAt: "2026-11-03" },
    });

    expect(screen.getByRole("button", { name: "최종 승인" })).toBeEnabled();
  });

  it("팀장 본인 신청은 중간 승인 단계가 없어 바로 열린다", () => {
    renderCard({ ...BASE, requesterAuthority: AUTHORITY.LEADER }, true);

    expect(screen.getByRole("button", { name: "최종 승인" })).toBeEnabled();
  });
});
