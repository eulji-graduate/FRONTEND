/*
  ⚠️ 회귀 방지 — 이전에 `canManage`가 반대로 걸려 관리 권한자에게 [회의실 등록] 버튼이 숨고
     비권한자에게 폼이 노출된 사고가 있었다(PR #449 코드래빗). 화면 가드가 다시 뒤집히면 곧장
     이 테스트가 잡아 준다.
*/
jest.mock("server-only", () => ({}));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));

jest.mock("@/features/shell/viewer", () => ({
  getViewer: jest.fn(),
}));

jest.mock("@/features/rooms/server", () => ({
  getMeetingRooms: jest.fn(async () => []),
}));

jest.mock("@/lib/permission", () => ({
  canAccessManageScope: jest.fn(() => true),
  canManageRooms: jest.fn(),
}));

jest.mock("@/components/common/access-denied", () => ({
  AccessDenied: () => <div data-testid="access-denied" />,
}));

jest.mock("@/features/rooms/components/room-create-dialog", () => ({
  RoomCreateDialog: () => <div data-testid="room-create-dialog" />,
}));

jest.mock("@/features/rooms/components/rooms-manage-table", () => ({
  RoomsManageTable: () => <div data-testid="rooms-manage-table" />,
}));

import { render, screen } from "@testing-library/react";

import { getViewer } from "@/features/shell/viewer";
import { canManageRooms } from "@/lib/permission";

import ManageRoomsPage from "./page";

describe("/manage/rooms — 회의실 등록 버튼 가드", () => {
  beforeEach(() => {
    (getViewer as jest.Mock).mockResolvedValue({ role: "owner" });
  });

  it("관리 권한이 있으면 [회의실 등록] 다이얼로그가 뜬다", async () => {
    (canManageRooms as jest.Mock).mockReturnValue(true);

    const ui = await ManageRoomsPage();
    render(ui);

    expect(screen.getByTestId("room-create-dialog")).toBeInTheDocument();
  });

  it("관리 권한이 없으면 [회의실 등록] 다이얼로그가 숨는다", async () => {
    (canManageRooms as jest.Mock).mockReturnValue(false);

    const ui = await ManageRoomsPage();
    render(ui);

    expect(screen.queryByTestId("room-create-dialog")).not.toBeInTheDocument();
  });
});
