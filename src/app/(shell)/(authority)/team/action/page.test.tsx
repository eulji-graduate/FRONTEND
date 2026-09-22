/*
  ⚠️ 회귀 방지(#614) — 가드 없이 `getTeamActionsPage`를 부르면 Owner에게 BE가 403
     (`DENIED_FILTER`)을 던졌다. `/team/*`은 LEADER 스코프라 LEADER만 조회로 넘어가고,
     그 외(Owner·Member)는 조회 전에 AccessDenied로 걸러져야 한다. 가드가 다시 빠지거나
     `canAccessTeamScope`가 뒤집히면 이 테스트가 잡는다.
*/
jest.mock("server-only", () => ({}));

jest.mock("@/features/shell/viewer", () => ({
  getViewer: jest.fn(),
}));

jest.mock("@/features/shell/home", () => ({
  roleHome: jest.fn(() => "/"),
}));

jest.mock("@/lib/permission", () => ({
  canAccessTeamScope: jest.fn(),
}));

jest.mock("@/features/action/server", () => ({
  getTeamActionsPage: jest.fn(async () => ({
    items: [],
    page: 0,
    totalPages: 1,
    totalCount: 0,
  })),
}));

jest.mock("@/components/common/access-denied", () => ({
  AccessDenied: () => <div data-testid="access-denied" />,
}));

jest.mock("@/features/action/components/team-action-list-view", () => ({
  TeamActionListView: () => <div data-testid="team-action-list" />,
}));

import { render, screen } from "@testing-library/react";

import { getTeamActionsPage } from "@/features/action/server";
import { getViewer } from "@/features/shell/viewer";
import { canAccessTeamScope } from "@/lib/permission";

import TeamActionPage from "./page";

describe("/app/team/action — 팀 스코프 진입 가드(#614)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getViewer as jest.Mock).mockResolvedValue({ role: "leader" });
  });

  it("LEADER는 팀 액션 목록을 본다", async () => {
    (canAccessTeamScope as jest.Mock).mockReturnValue(true);

    const ui = await TeamActionPage();
    render(ui);

    expect(screen.getByTestId("team-action-list")).toBeInTheDocument();
    expect(screen.queryByTestId("access-denied")).not.toBeInTheDocument();
  });

  it("진입 자격이 없으면(Owner·Member) 조회 전에 AccessDenied로 막고 BE를 부르지 않는다", async () => {
    (canAccessTeamScope as jest.Mock).mockReturnValue(false);

    const ui = await TeamActionPage();
    render(ui);

    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
    expect(screen.queryByTestId("team-action-list")).not.toBeInTheDocument();
    // ⚠️ 403의 근원 — 가드에 막혔으면 목록 조회가 아예 안 나가야 한다
    expect(getTeamActionsPage).not.toHaveBeenCalled();
  });
});
