jest.mock("@/mocks/config", () => ({ isMock: false }));
jest.mock("@/features/auth/session", () => ({ requireAccessToken: jest.fn() }));
jest.mock("@/features/shell/viewer", () => ({ getViewer: jest.fn() }));
jest.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  serverApi: jest.fn(),
}));

import { AUTHORITY } from "@/constants/authority";
import { requireAccessToken } from "@/features/auth/session";
import { getViewer } from "@/features/shell/viewer";
import { serverApi } from "@/lib/api";

import { getHandoverContext } from "./server";

/**
 * 인수인계 신청 화면 컨텍스트 — **실서버 분기가 신청자 role에 따라 팀원 명부를 부를지 가른다.**
 *
 * ⚠️ MEMBER는 `GET /api/team/members`를 아예 안 부른다 — 그 엔드포인트가 LEADER 전용이라
 *    MEMBER 토큰으로 부르면 403이다. 자가 재할당 대상(teammates)이 원래 필요 없는
 *    MEMBER가 이 API를 실수로 타면 신청 화면 전체가 죽는다.
 */

const requireAccessTokenMock = requireAccessToken as unknown as jest.Mock;
const getViewerMock = getViewer as unknown as jest.Mock;
const serverApiMock = serverApi as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  requireAccessTokenMock.mockResolvedValue("token");
});

describe("getHandoverContext — 실서버", () => {
  it("MEMBER는 담당 액션만 받고, 팀원 명부(GET /api/team/members)는 안 부른다", async () => {
    getViewerMock.mockResolvedValue({
      id: 3,
      name: "이하윤",
      role: AUTHORITY.MEMBER,
      teamName: "개발팀",
    });
    serverApiMock.mockResolvedValueOnce({
      content: [
        {
          id: 101,
          actionType: "PERSONAL",
          title: "온보딩 플로우 와이어프레임 검토",
          status: "IN_PROGRESS",
          dueDate: "2026-08-20",
          projectTag: "GOODS",
          parentActionTitle: "앱 개발 착수",
        },
        {
          id: 102,
          actionType: "PERSONAL",
          title: "완료된 액션",
          status: "DONE",
          dueDate: "2026-08-01",
          projectTag: "GOODS",
          parentActionTitle: "앱 개발 착수",
        },
        {
          id: 103,
          actionType: "TEAM",
          title: "팀 액션은 섞이면 안 됨",
          status: "IN_PROGRESS",
          dueDate: "2026-08-20",
          projectTag: "GOODS",
          parentActionTitle: null,
        },
      ],
    });

    const context = await getHandoverContext();

    expect(context.applicant).toEqual({
      id: 3,
      name: "이하윤",
      role: AUTHORITY.MEMBER,
      teamName: "개발팀",
    });
    // ⚠️ 완료 액션(102)과 TEAM 타입(103)은 빠지고 진행중 PERSONAL(101)만 남아야 한다.
    expect(context.actions).toEqual([
      {
        id: 101,
        projectTag: "GOODS",
        parentTeamActionName: "앱 개발 착수",
        title: "온보딩 플로우 와이어프레임 검토",
        status: "IN_PROGRESS",
        dueDate: "2026-08-20",
      },
    ]);
    expect(context.teammates).toEqual([]);
    expect(serverApiMock).toHaveBeenCalledTimes(1);
  });

  it("LEADER는 담당 액션과 함께 본인 제외 팀원 명부(GET /api/team/members)도 받는다", async () => {
    getViewerMock.mockResolvedValue({
      id: 2,
      name: "김서준",
      role: AUTHORITY.LEADER,
      teamName: "개발팀",
    });
    serverApiMock.mockResolvedValueOnce({ content: [] }).mockResolvedValueOnce([
      { memberId: 2, name: "김서준", positionName: "팀장", roleName: "리더", status: "ACTIVE" },
      {
        memberId: 3,
        name: "이하윤",
        positionName: "사원",
        roleName: "프론트엔드",
        status: "ACTIVE",
      },
    ]);

    const context = await getHandoverContext();

    // ⚠️ 본인(memberId 2)은 후보에서 빠져야 한다 — 자기 자신에게 재배정할 수 없다.
    expect(context.teammates).toEqual([
      { id: 3, name: "이하윤", position: "사원", role: "프론트엔드" },
    ]);
    expect(serverApiMock).toHaveBeenCalledTimes(2);
  });
});
