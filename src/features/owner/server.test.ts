jest.mock("@/mocks/config", () => ({ isMock: false }));
jest.mock("@/features/auth/session", () => ({ requireAccessToken: jest.fn() }));
jest.mock("@/lib/api", () => ({ serverApi: jest.fn() }));

import { requireAccessToken } from "@/features/auth/session";
import { serverApi } from "@/lib/api";

import { getOwnerDashboardOverview } from "./server";

/* #38 — 대표 대시보드 "최근 프로젝트 회의"를 MEET-17(scope=owner)에 연결 */
describe("getOwnerDashboardOverview — 최근 프로젝트 회의(실서버)", () => {
  const serverApiMock = serverApi as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (requireAccessToken as unknown as jest.Mock).mockResolvedValue("token");
  });

  function stub(meetings: () => Promise<unknown>) {
    serverApiMock.mockImplementation((url: string) => {
      if (url.startsWith("/api/meetings/dashboard")) return meetings();
      if (url.includes("leader")) return Promise.resolve([]);
      return Promise.resolve({
        totalProjectCount: 2,
        dueSoonProjectCount: 0,
        totalMemberCount: 10,
        onLeaveMemberCount: 0,
      });
    });
  }

  it("scope=owner로 불러와 카드로 옮긴다", async () => {
    stub(() =>
      Promise.resolve({
        meetings: [
          {
            meetingId: 1,
            title: "온보딩 킥오프",
            projectTag: "ONBOARDING",
            status: "DONE",
            room: "회의실 A",
            scheduledAt: "2026-11-10T10:00:00",
            attendeeCount: 3,
            originLabel: "Owner",
            hostLabel: null,
          },
        ],
      }),
    );

    const overview = await getOwnerDashboardOverview();

    expect(serverApiMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/meetings/dashboard?scope=owner"),
      { accessToken: "token" },
    );
    expect(overview.projectMeetings).toEqual([
      expect.objectContaining({ id: "1", title: "온보딩 킥오프", room: "회의실 A" }),
    ]);
  });

  it("회의 조회만 실패하면 그 카드만 null이고 나머지는 그대로다", async () => {
    stub(() => Promise.reject(new Error("500")));

    const overview = await getOwnerDashboardOverview();

    expect(overview.projectMeetings).toBeNull();
    expect(overview.totalProjectCount).toBe(2);
  });
});
