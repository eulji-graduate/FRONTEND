/*
  ⚠️ 2026-08-14 — 이 화면의 결제 전 회사 리다이렉트 가드는 없앴다(`page.tsx` 주석 참고).
     `getBillingOverview`가 이제 항상 더미를 돌려줘 404가 날 수 없다 — 여기서 지키는 건
     "권한 없으면 화면 대신 접근 거부를 그린다"뿐이다.
*/
jest.mock("server-only", () => ({}));

jest.mock("@/features/shell/viewer", () => ({ getViewer: jest.fn() }));

jest.mock("@/features/billing/server", () => ({
  getOnboardingSubscription: jest.fn(),
  getBillingOverview: jest.fn(async () => ({ subscription: {}, payments: [] })),
  getBillingConfig: jest.fn(async () => ({})),
}));

jest.mock("@/lib/permission", () => ({
  canAccessManageScope: jest.fn(),
  canManageBilling: jest.fn(() => true),
}));

jest.mock("@/components/common/access-denied", () => ({
  AccessDenied: () => <div data-testid="access-denied" />,
}));

jest.mock("@/features/billing/components/billing-view", () => ({
  BillingView: () => <div data-testid="billing-view" />,
}));

import { render, screen } from "@testing-library/react";

import { getBillingConfig, getBillingOverview } from "@/features/billing/server";
import { getViewer } from "@/features/shell/viewer";
import { canAccessManageScope } from "@/lib/permission";

import OwnerBillingPage from "./page";

describe("/manage/billing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getViewer as jest.Mock).mockResolvedValue({ role: "owner" });
  });

  /*
    ⚠️ `toBeTruthy()`는 아무 React element에나 통과한다 — 실제로 어느 컴포넌트가
       그려졌는지, 조회가 몇 번 나갔는지는 그걸로 안 잡힌다(코드래빗 지적, 2026-08-14).
       렌더링까지 해서 눈에 보이는 결과로 확인한다.
  */
  it("관리 스코프 권한이 없으면 접근 거부를 그린다 — 조회는 안 나간다", async () => {
    (canAccessManageScope as jest.Mock).mockReturnValue(false);

    render(await OwnerBillingPage());

    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
    expect(screen.queryByTestId("billing-view")).not.toBeInTheDocument();
    expect(getBillingOverview).not.toHaveBeenCalled();
    expect(getBillingConfig).not.toHaveBeenCalled();
  });

  it("권한이 있으면 조회를 마치고 화면을 그린다", async () => {
    (canAccessManageScope as jest.Mock).mockReturnValue(true);

    render(await OwnerBillingPage());

    expect(screen.getByTestId("billing-view")).toBeInTheDocument();
    expect(screen.queryByTestId("access-denied")).not.toBeInTheDocument();
    expect(getBillingOverview).toHaveBeenCalledTimes(1);
    expect(getBillingConfig).toHaveBeenCalledTimes(1);
  });
});
