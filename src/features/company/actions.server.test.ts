// 서버 액션은 next 런타임 함수를 부른다 — jsdom엔 없으니 목으로 대체하고 호출만 검증한다.
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/mocks/config", () => ({ isMock: false }));
jest.mock("@/features/shell/viewer", () => ({ getViewer: jest.fn() }));
jest.mock("@/features/auth/session", () => ({ requireAccessToken: jest.fn() }));
jest.mock("@/lib/api", () => ({
  serverApi: jest.fn(),
  toUserMessage: jest.fn((error: unknown) => (error as Error).message),
}));

import { AUTHORITY } from "@/constants/domain";
import { requireAccessToken } from "@/features/auth/session";
import { getViewer } from "@/features/shell/viewer";
import { serverApi } from "@/lib/api";

import { saveDepartmentsAction } from "./actions";
import type { DepartmentNode } from "./types";

/**
 * `saveDepartmentsAction` — **실서버 경로**(BE PR #528, 팀 안 역할 CRUD).
 *
 * ⚠️ `actions.test.ts`는 `isMock: true`로 고정돼 있어 이 파일이 잠그는 실서버 분기(팀·역할
 * POST/PATCH/DELETE, 임시 id → 서버 id 해석)를 전혀 지나지 않는다 — 그래서 따로 둔다.
 */

const requireAccessTokenMock = requireAccessToken as unknown as jest.Mock;
const getViewerMock = getViewer as unknown as jest.Mock;
const serverApiMock = serverApi as unknown as jest.Mock;

const OWNER = { id: 1, name: "대표", role: AUTHORITY.OWNER, isAdmin: false };

const BE_PROFILE = {
  companyId: 1,
  code: "ZIGZAG",
  name: "지그재그컴퍼니",
  businessNumber: "123-45-67890",
  representativeName: null,
  address: null,
  latitude: null,
  longitude: null,
  phone: null,
  subscriptionStatus: "ACTIVE",
  onboardedAt: "2026-08-01T00:00:00",
};

/** 개발팀(10) 안에 프론트엔드(101, 인원 2)·백엔드(102, 인원 0)가 있는 회사 하나 */
const BE_TEAMS = [
  {
    teamId: 10,
    name: "개발팀",
    leaderMemberId: null,
    leaderName: null,
    memberCount: 3,
    roles: [
      { roleId: 2, name: "없음", memberCount: 0 },
      { roleId: 101, name: "프론트엔드", memberCount: 2 },
      { roleId: 102, name: "백엔드", memberCount: 0 },
    ],
  },
];

/** `getCompanySetting()`이 도는 GET 세 개 + 팀·역할 CRUD를 한 함수로 분기한다 */
function stubServerApi(overrides: Partial<Record<string, (json?: unknown) => unknown>> = {}) {
  serverApiMock.mockImplementation((url: string, init?: { method?: string; json?: unknown }) => {
    const method = init?.method ?? "GET";
    const key = `${method} ${url}`;
    if (key in overrides) return Promise.resolve(overrides[key]?.(init?.json));

    if (url === "/api/companies/me") return Promise.resolve(BE_PROFILE);
    if (url === "/api/teams" && method === "GET") return Promise.resolve(BE_TEAMS);
    if (url === "/api/job-positions") return Promise.resolve([]);
    // 팀·역할 쓰기 호출(POST·PATCH·DELETE)은 오버라이드가 없으면 그냥 성공한 걸로 본다 —
    // 이 파일의 관심사는 "어느 url·메서드로 나갔나"지 응답 내용이 아니다(팀 생성만 예외 —
    // 새 역할을 만들 때 진짜 팀 id가 필요해서 오버라이드로 따로 준다).
    if (/^\/api\/teams(\/\d+)?(\/roles(\/\d+)?)?$/.test(url) && method !== "GET") {
      return Promise.resolve(undefined);
    }

    throw new Error(`이 테스트가 예상하지 않은 호출: ${key}`);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  getViewerMock.mockResolvedValue(OWNER);
  requireAccessTokenMock.mockResolvedValue("token");
});

describe("saveDepartmentsAction — 역할 저장(실서버)", () => {
  it("역할 이름을 바꾸면 PATCH가 그 팀·역할 id로 나간다", async () => {
    stubServerApi();
    const next: DepartmentNode[] = [
      {
        id: "10",
        name: "개발팀",
        children: [
          { id: "101", name: "프론트", children: [] }, // 이름만 변경
          { id: "102", name: "백엔드", children: [] },
        ],
      },
    ];

    const result = await saveDepartmentsAction(next);

    expect(result).toEqual({ isSuccess: true });
    expect(serverApiMock).toHaveBeenCalledWith(
      "/api/teams/10/roles/101",
      expect.objectContaining({ method: "PATCH", json: { name: "프론트" } }),
    );
    // 안 바뀐 역할(백엔드)은 다시 보내지 않는다
    expect(serverApiMock).not.toHaveBeenCalledWith("/api/teams/10/roles/102", expect.anything());
  });

  it("새 역할은 그 팀 밑에 POST로 만든다", async () => {
    stubServerApi();
    const next: DepartmentNode[] = [
      {
        id: "10",
        name: "개발팀",
        children: [
          { id: "101", name: "프론트엔드", children: [] },
          { id: "102", name: "백엔드", children: [] },
          { id: crypto.randomUUID(), name: "디자인", children: [] }, // 새 역할
        ],
      },
    ];

    await saveDepartmentsAction(next);

    expect(serverApiMock).toHaveBeenCalledWith(
      "/api/teams/10/roles",
      expect.objectContaining({ method: "POST", json: { name: "디자인" } }),
    );
  });

  it("사람이 없는 역할을 지우면 DELETE가 나간다", async () => {
    stubServerApi();
    const next: DepartmentNode[] = [
      {
        id: "10",
        name: "개발팀",
        // 백엔드(인원 0)만 뺀다
        children: [{ id: "101", name: "프론트엔드", children: [] }],
      },
    ];

    const result = await saveDepartmentsAction(next);

    expect(result).toEqual({ isSuccess: true });
    expect(serverApiMock).toHaveBeenCalledWith(
      "/api/teams/10/roles/102",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  /*
    ⚠️ 팀 삭제와 같은 원칙이다(§validate `findBlockedRoleChange`) — 사람이 있는 역할이
       사라지면 그 사람은 되돌릴 절차 없이 "역할 없음"이 된다.
  */
  it("사람이 있는 역할을 지우려 하면 막고, 아무 요청도 안 나간다", async () => {
    stubServerApi();
    const next: DepartmentNode[] = [
      { id: "10", name: "개발팀", children: [{ id: "102", name: "백엔드", children: [] }] }, // 프론트엔드(인원 2) 제거
    ];

    const result = await saveDepartmentsAction(next);

    expect(result).toEqual({
      isSuccess: false,
      message:
        "'프론트엔드' 역할을 사원 2명이 쓰고 있습니다. 사원 관리에서 역할을 바꾼 뒤 지워 주세요",
    });
    // 조회(GET) 세 번 말고는 아무 것도 안 나갔다 — 쓰기 요청이 없어야 한다
    const writeCalls = serverApiMock.mock.calls.filter(
      ([, init]: [string, { method?: string } | undefined]) =>
        init?.method && init.method !== "GET",
    );
    expect(writeCalls).toHaveLength(0);
  });

  /*
    ⚠️ **새 팀 밑의 새 역할은 화면의 임시 id가 아니라 서버가 방금 발급한 진짜 팀 id로
       만들어야 한다.** 여기가 흔들리면 역할이 엉뚱한(또는 존재하지 않는) 팀에 걸린다.
  */
  it("새 팀을 만들면서 그 안에 역할을 같이 추가하면, 서버가 준 진짜 팀 id로 역할을 만든다", async () => {
    const newTeamId = crypto.randomUUID();
    stubServerApi({
      "POST /api/teams": () => ({ teamId: 20 }),
    });

    const next: DepartmentNode[] = [
      ...BE_TEAMS.map((team) => ({
        id: String(team.teamId),
        name: team.name,
        children: (team.roles ?? [])
          .filter((role) => role.name !== "없음")
          .map((role) => ({ id: String(role.roleId), name: role.name, children: [] })),
      })),
      {
        id: newTeamId,
        name: "신규팀",
        children: [{ id: crypto.randomUUID(), name: "새역할", children: [] }],
      },
    ];

    await saveDepartmentsAction(next);

    expect(serverApiMock).toHaveBeenCalledWith(
      "/api/teams",
      expect.objectContaining({ method: "POST", json: { name: "신규팀" } }),
    );
    // 임시 id(newTeamId)가 아니라 서버가 돌려준 20으로 역할을 만든다
    expect(serverApiMock).toHaveBeenCalledWith(
      "/api/teams/20/roles",
      expect.objectContaining({ method: "POST", json: { name: "새역할" } }),
    );
  });

  it("팀을 통째로 지우면 팀만 DELETE하고 그 안의 역할은 따로 지우지 않는다(BE가 함께 지운다)", async () => {
    /*
      ⚠️ **`validateDepartments`는 팀이 최소 하나 있어야 통과한다** — 지울 팀(30, 사람 없음)
         말고 안 건드리는 팀(10)을 하나 더 둔다. 사람이 있는 팀(10)은 애초에 못 지우므로
         (`findBlockedTeamChange`) 지우는 대상은 항상 빈 팀 쪽이어야 한다.
    */
    stubServerApi({
      "GET /api/teams": () => [
        ...BE_TEAMS,
        {
          teamId: 30,
          name: "신규팀",
          leaderMemberId: null,
          leaderName: null,
          memberCount: 0,
          roles: [{ roleId: 2, name: "없음", memberCount: 0 }],
        },
      ],
    });

    const next: DepartmentNode[] = [
      {
        id: "10",
        name: "개발팀",
        children: [
          { id: "101", name: "프론트엔드", children: [] },
          { id: "102", name: "백엔드", children: [] },
        ],
      },
      // 신규팀(30)은 next에서 뺀다 — 삭제 대상
    ];

    const result = await saveDepartmentsAction(next);

    expect(result).toEqual({ isSuccess: true });
    expect(serverApiMock).toHaveBeenCalledWith(
      "/api/teams/30",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(serverApiMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/teams\/30\/roles/),
      expect.anything(),
    );
  });

  /*
    ⚠️⚠️ **부분 실패 뒤 재시도가 중복을 만들던 자리**(코드래빗 지적, 2026-08-14). 한 건씩
       부르다 중간(두 번째 역할)에서 실패하면, 첫 번째 역할은 이미 서버에 반영됐는데 화면은
       그걸 모른 채 같은 트리로 재시도할 수 있다 — 실패 응답에 지금 서버의 실제 트리를 함께
       담아, 화면이 그 값으로 되돌아가게 한다(`company-team-card.tsx`가 이 값으로 재동기화).
  */
  it("역할 저장 중간에 실패하면, 실패 응답에 지금 서버의 실제 트리를 함께 담는다", async () => {
    stubServerApi({
      "PATCH /api/teams/10/roles/102": () => {
        throw new Error("BE 500");
      },
    });

    const next: DepartmentNode[] = [
      {
        id: "10",
        name: "개발팀",
        children: [
          { id: "101", name: "프론트", children: [] }, // 먼저 성공
          { id: "102", name: "서버", children: [] }, // 이 PATCH가 실패
        ],
      },
    ];

    const result = await saveDepartmentsAction(next);

    expect(result.isSuccess).toBe(false);
    expect(result.message).toBe("BE 500");
    // 실패해도 지금 서버 트리(진짜 id 포함)를 돌려준다 — 화면의 임시/절반 반영 트리가 아니다
    expect(result.departments).toEqual([
      {
        id: "10",
        name: "개발팀",
        children: [
          { id: "101", name: "프론트엔드", children: [] },
          { id: "102", name: "백엔드", children: [] },
        ],
      },
    ]);
  });
});
