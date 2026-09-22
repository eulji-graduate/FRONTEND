jest.mock("@/mocks/config", () => ({ isMock: false }));
jest.mock("@/features/auth/session", () => ({ requireAccessToken: jest.fn() }));
jest.mock("@/features/member/manage-server", () => ({ getTeamLeaders: jest.fn() }));
jest.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  serverApi: jest.fn(),
}));

import { AUTHORITY } from "@/constants/authority";
import { requireAccessToken } from "@/features/auth/session";
import { getTeamLeaders } from "@/features/member/manage-server";
import { serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import type { Actor } from "@/lib/permission";

import { getReservableMembers, getReservableProjects, getReservableTeamActions } from "./server";

/**
 * 참석자 후보 명부 — **실서버 분기가 Owner와 Leader·Member에서 다른 API를 부른다.**
 *
 * ⚠️ Owner는 팀이 없어 `/api/members/my-team`이 빈 배열만 준다(BE 확인) — 그래서 이 분기는
 *    아예 그 API를 안 부르고 `getTeamLeaders()`로 간다. 실수로 두 분기가 뒤섞이면 Owner
 *    화면의 참석자 후보가 조용히 텅 빈다.
 */

const requireAccessTokenMock = requireAccessToken as unknown as jest.Mock;
const getTeamLeadersMock = getTeamLeaders as unknown as jest.Mock;
const serverApiMock = serverApi as unknown as jest.Mock;

const OWNER: Actor = { id: 1, role: AUTHORITY.OWNER };
const LEADER: Actor = { id: 2, role: AUTHORITY.LEADER, teamName: "개발팀" };
const MEMBER: Actor = { id: 3, role: AUTHORITY.MEMBER, teamName: "개발팀" };

beforeEach(() => {
  jest.clearAllMocks();
  requireAccessTokenMock.mockResolvedValue("token");
});

describe("getReservableMembers — 실서버", () => {
  it("Owner는 팀별 리더 조회(getTeamLeaders)로 후보를 만든다 — my-team API는 안 부른다", async () => {
    getTeamLeadersMock.mockResolvedValue(
      new Map([
        ["개발팀", { id: 2, name: "김서준" }],
        ["마케팅팀", { id: 5, name: "최유진" }],
      ]),
    );

    const members = await getReservableMembers(OWNER);

    expect(members).toEqual([
      { id: 2, name: "김서준", teamName: "개발팀", authority: AUTHORITY.LEADER },
      { id: 5, name: "최유진", teamName: "마케팅팀", authority: AUTHORITY.LEADER },
    ]);
    expect(serverApiMock).not.toHaveBeenCalled();
  });

  it("Leader·Member는 /api/members/my-team을 부르고 자기 팀 이름을 붙인다", async () => {
    serverApiMock.mockResolvedValue([
      { memberId: 2, name: "김서준" },
      { memberId: 4, name: "박도현" },
    ]);

    const members = await getReservableMembers(LEADER);

    expect(serverApiMock).toHaveBeenCalledWith(
      ep.membersMyTeam(),
      expect.objectContaining({ accessToken: "token" }),
    );
    expect(members).toEqual([
      { id: 2, name: "김서준", teamName: "개발팀", authority: AUTHORITY.MEMBER },
      { id: 4, name: "박도현", teamName: "개발팀", authority: AUTHORITY.MEMBER },
    ]);
    expect(getTeamLeadersMock).not.toHaveBeenCalled();
  });

  it("Member도 같은 API를 쓴다 — LEADER와 갈릴 이유가 없다(둘 다 자기 팀 로스터)", async () => {
    serverApiMock.mockResolvedValue([{ memberId: 3, name: "이서연" }]);

    const members = await getReservableMembers(MEMBER);

    expect(members).toEqual([
      { id: 3, name: "이서연", teamName: "개발팀", authority: AUTHORITY.MEMBER },
    ]);
  });
});

/**
 * 예약 폼의 "프로젝트" select — 2026-08-14 프로덕션에서 무조건 throw하던 것을 고쳤다.
 * `getProjectsPage`(project 도메인, 이미 실연동)를 그대로 재사용하는지 확인한다.
 */
function projectFixture(overrides: { id: number; tag: string; name: string; status: string }) {
  return {
    ...overrides,
    color: "blue",
    description: "",
    startDate: null,
    dueDate: "2026-12-31",
    teamCount: 1,
    actionCount: 0,
    completedActionCount: 0,
    meetingCount: 0,
    progressPct: 0,
    teamNames: [],
  };
}

describe("getReservableProjects — 실서버", () => {
  it("getProjectsPage를 재사용해 select 모양으로 줄인다 — TODO·IN_PROGRESS 둘 다 불러 합친다", async () => {
    serverApiMock.mockImplementation(async (path: string) => {
      const isTodo = path.includes("status=TODO");
      return {
        content: [
          isTodo
            ? projectFixture({ id: 13, tag: "product-v3", name: "제품 v3.0", status: "TODO" })
            : projectFixture({
                id: 12,
                tag: "product-v2",
                name: "제품 v2.0",
                status: "IN_PROGRESS",
              }),
        ],
        page: 0,
        size: 200,
        totalElements: 1,
        totalPages: 1,
        hasNext: false,
      };
    });

    const projects = await getReservableProjects();

    // ⚠️ 순서까지 확인한다 — IN_PROGRESS를 먼저, TODO를 뒤에 붙인다(진행중 항목이 우선).
    expect(projects).toEqual([
      { id: "12", name: "제품 v2.0", tag: "product-v2" },
      { id: "13", name: "제품 v3.0", tag: "product-v3" },
    ]);
    expect(serverApiMock).toHaveBeenCalledWith(
      expect.stringContaining("status=IN_PROGRESS"),
      expect.objectContaining({ accessToken: "token" }),
    );
    expect(serverApiMock).toHaveBeenCalledWith(
      expect.stringContaining("status=TODO"),
      expect.objectContaining({ accessToken: "token" }),
    );
    expect(serverApiMock).toHaveBeenCalledTimes(2);
    // ⚠️ page·size도 확인한다 — 기본 페이지 크기(20)로 조용히 바뀌어도 status만 보면 통과했다(코드래빗 지적)
    const requestUrl = serverApiMock.mock.calls[0][0] as string;
    expect(requestUrl).toContain("page=0");
    expect(requestUrl).toContain("size=200"); // select 한 번에 받을 상한(RESERVABLE_PROJECTS_PAGE_SIZE)
  });

  /*
    ⚠️ 팀 액션 select에서 코드래빗이 잡은 것과 같은 결함을 여기서도 먼저 막는다 — 200개를
       조용히 자르지 않는다. `totalPages`가 1보다 크면 뒤 페이지 프로젝트는 select에서
       영원히 안 보인다(§정직성).
  */
  it("어느 한 상태의 프로젝트가 200건 상한을 넘으면(totalPages>1) 잘린 목록을 정상으로 돌려주지 않는다", async () => {
    serverApiMock.mockResolvedValue({
      content: [],
      page: 0,
      size: 200,
      totalElements: 201,
      totalPages: 2,
      hasNext: true,
    });

    await expect(getReservableProjects()).rejects.toThrow("상한을 넘어");
  });
});

/**
 * 예약 폼의 "상위 팀 액션" select — 2026-08-14 프로덕션에서 무조건 throw하던 것을 고쳤다.
 * `GET /api/team/actions`는 teamId를 토큰에서만 꺼내므로(BE 확인) actor.teamName으로
 * 필터링할 필요가 없다 — 그 사실을 테스트로도 확인한다.
 */
describe("getReservableTeamActions — 실서버", () => {
  it("Owner는 상위 팀 액션 필드가 없어 서버를 안 부르고 빈 배열이다", async () => {
    const teamActions = await getReservableTeamActions(OWNER);

    expect(teamActions).toEqual([]);
    expect(serverApiMock).not.toHaveBeenCalled();
  });

  it("Leader·Member는 GET /api/team/actions를 TODO·IN_PROGRESS 둘 다 불러 합친다", async () => {
    function actionFixture(overrides: { id: number; title: string; status: string }) {
      return {
        ...overrides,
        actionType: "TEAM",
        description: "",
        startDate: null,
        plannedStartDate: null,
        dueDate: "2026-09-30",
        needsReview: false,
        isDelayed: false,
        assigneeName: null,
        projectId: 3,
        projectTag: "marketing-q3",
        projectName: "마케팅 캠페인 Q3",
        teamName: "개발팀",
        sourceMeetingTitle: null,
        parentActionId: null,
        parentActionTitle: null,
        childDoneCount: 2,
        childTotalCount: 5,
      };
    }

    serverApiMock.mockImplementation(async (path: string) => {
      const isTodo = path.includes("status=TODO");
      return {
        content: [
          isTodo
            ? actionFixture({ id: 8, title: "4분기 캠페인 초안", status: "TODO" })
            : actionFixture({ id: 7, title: "3분기 마케팅 캠페인 기획", status: "IN_PROGRESS" }),
        ],
        page: 0,
        size: 200,
        totalElements: 1,
        totalPages: 1,
        hasNext: false,
      };
    });

    const teamActions = await getReservableTeamActions(LEADER);

    // ⚠️ 순서까지 확인한다 — IN_PROGRESS를 먼저, TODO를 뒤에 붙인다(진행중 항목이 우선).
    expect(teamActions).toEqual([
      { id: 7, name: "3분기 마케팅 캠페인 기획", projectTag: "marketing-q3" },
      { id: 8, name: "4분기 캠페인 초안", projectTag: "marketing-q3" },
    ]);
    expect(serverApiMock).toHaveBeenCalledWith(
      ep.teamActions({ status: "IN_PROGRESS", page: 0, size: 200 }),
      expect.objectContaining({ accessToken: "token" }),
    );
    expect(serverApiMock).toHaveBeenCalledWith(
      ep.teamActions({ status: "TODO", page: 0, size: 200 }),
      expect.objectContaining({ accessToken: "token" }),
    );
    expect(serverApiMock).toHaveBeenCalledTimes(2);
  });

  /*
    ⚠️ 코드래빗 지적(2026-08-14) — 실서버는 토큰에서 팀을 결정하므로 `actor.teamName`이
       없어도 API를 불러야 한다. 목 분기와 뭉쳐 있으면 이 조합에서 항상 빈 배열만 받는다.
  */
  it("teamName이 없는 Leader·Member도 실서버는 부른다 — 그 검사는 목 분기 안에만 둔다", async () => {
    serverApiMock.mockResolvedValue({
      content: [],
      page: 0,
      size: 200,
      totalElements: 0,
      totalPages: 1,
      hasNext: false,
    });
    const leaderWithoutTeamName: Actor = { id: 9, role: AUTHORITY.LEADER };

    await getReservableTeamActions(leaderWithoutTeamName);

    expect(serverApiMock).toHaveBeenCalled();
  });

  /*
    ⚠️ 코드래빗 지적(2026-08-14) — 200개를 조용히 자르지 않는다. hasNext가 참인데
       첫 페이지만 돌려주면 뒤 페이지 항목은 select에서 영원히 안 보인다(§정직성).
  */
  it("진행중 팀 액션이 200건 상한을 넘으면(hasNext) 잘린 목록을 정상으로 돌려주지 않는다", async () => {
    serverApiMock.mockResolvedValue({
      content: [],
      page: 0,
      size: 200,
      totalElements: 201,
      totalPages: 2,
      hasNext: true,
    });

    await expect(getReservableTeamActions(LEADER)).rejects.toThrow("상한을 넘어");
  });
});
