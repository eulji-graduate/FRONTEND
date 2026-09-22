jest.mock("@/mocks/config", () => ({ isMock: false }));
jest.mock("@/features/auth/session", () => ({ requireAccessToken: jest.fn() }));
jest.mock("@/lib/api", () => ({ serverApi: jest.fn(), ApiError: class ApiError extends Error {} }));

import { requireAccessToken } from "@/features/auth/session";
import { serverApi } from "@/lib/api";

import { getManagedMember, listAllManagedMembersForOrgChart } from "./manage-server";

/**
 * 조직도 전체 명부 — 2026-08-14, 두 번째 사고.
 *
 * 1차 수정(같은 날 앞선 커밋)은 `GET /api/members` 페이지 순회를 조직도 전용 응답
 * (`GET /api/members/org-chart`) 한 번 호출로 바꿨는데, 그때 응답 shape을 "팀 → 사람"
 * 2단계로 잘못 가정했다. BE 실코드 대조 결과(`OrgChartTeamResponse` 등) 실제로는
 * **팀 → 역할(`subTeams`) → 사람 3단계**다 — 그 가정 때문에 `team.members`가 매번
 * `undefined`였고, 방어 코드(`?? []`)가 조용히 빈 배열로 접어 **조직도가 항상 0명으로
 * 그려지고 있었다**(안현님 FE 보고 → BE PR #511). 이 테스트는 3단계 구조를 평평한
 * 명부로 올바르게 펴는지를 잠근다.
 *
 * ⚠️ **여기엔 근무상태 필터가 없다.** 이 응답에는 `workStatus` 자체가 없다(BE 주석:
 *    "조직도 응답에는 이름·직급·권한만 들어간다") — 삭제된 사람을 빼는 일은 BE가
 *    쿼리 단(`findActiveByCompany`)에서 이미 하고 있어, FE가 다시 거를 값이 없다.
 */
describe("listAllManagedMembersForOrgChart — 실서버", () => {
  const requireAccessTokenMock = requireAccessToken as unknown as jest.Mock;
  const serverApiMock = serverApi as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    requireAccessTokenMock.mockResolvedValue("token");
  });

  function member(id: number, overrides: Partial<Record<string, unknown>> = {}) {
    return {
      memberId: id,
      name: `사원${id}`,
      positionName: null,
      role: "MEMBER",
      ...overrides,
    };
  }

  it("조직도 전용 응답을 한 번만 호출한다", async () => {
    serverApiMock.mockResolvedValueOnce([]);

    await listAllManagedMembersForOrgChart();

    expect(serverApiMock).toHaveBeenCalledTimes(1);
    expect(serverApiMock.mock.calls[0][0]).toBe("/api/members/org-chart");
  });

  it("팀 → 역할 → 사람 3단계 응답을 평평한 명부로 편다 — 순서를 그대로 유지한다", async () => {
    serverApiMock.mockResolvedValueOnce([
      {
        teamId: null,
        name: "미배정",
        subTeams: [{ roleLabel: null, members: [member(1, { role: "OWNER" })] }],
      },
      {
        teamId: 10,
        name: "개발팀",
        subTeams: [
          { roleLabel: "프론트엔드", members: [member(2)] },
          { roleLabel: "백엔드", members: [member(3)] },
        ],
      },
      { teamId: 20, name: "디자인팀", subTeams: [{ roleLabel: null, members: [member(4)] }] },
    ]);

    const roster = await listAllManagedMembersForOrgChart();

    expect(roster.map((m) => m.id)).toEqual([1, 2, 3, 4]);
    expect(roster.map((m) => m.teamName)).toEqual(["미배정", "개발팀", "개발팀", "디자인팀"]);
    expect(roster.map((m) => m.roleLabel)).toEqual([null, "프론트엔드", "백엔드", null]);
  });

  /*
    ⚠️ **팀 미배정 인원이 응답에서 통째로 빠지던 사고**(BE PR #511)가 다시 나면 여기가 잡는다.
       "미배정" 칸도 그냥 팀처럼 평평하게 펴야 한다 — `buildOrgChart`가 `teamName`이 아니라
       `authority`로 대표를 뽑아내므로, 이 칸의 이름이 뭐든 대표는 항상 챙겨진다.
  */
  it("팀 미배정(대표) 칸도 명부에 포함된다", async () => {
    serverApiMock.mockResolvedValueOnce([
      {
        teamId: null,
        name: "미배정",
        subTeams: [{ roleLabel: null, members: [member(1, { role: "OWNER" })] }],
      },
    ]);

    const roster = await listAllManagedMembersForOrgChart();

    expect(roster).toHaveLength(1);
    expect(roster[0]?.authority).toBe("OWNER");
  });

  /*
    ⚠️ **`subTeams`·`members` 필드가 없는 칸도 있을 수 있다**(사람·역할이 없는 팀) — 필드째
       빠지면 `.flatMap`이 `undefined`에서 터진다. 그때 죽지 않고 그 칸만 빈 것으로 본다.
  */
  it("subTeams·members 필드가 없어도 죽지 않는다", async () => {
    serverApiMock.mockResolvedValueOnce([
      { teamId: 10, name: "개발팀", subTeams: [{ roleLabel: null, members: [member(1)] }] },
      { teamId: 30, name: "신규팀" },
      { teamId: 40, name: "빈팀", subTeams: [{ roleLabel: "백엔드" }] },
    ]);

    const roster = await listAllManagedMembersForOrgChart();

    expect(roster.map((m) => m.id)).toEqual([1]);
  });

  /*
    ⚠️ **BE의 시스템 값 `"없음"`도 `null`로 되돌린다**(사원 관리 목록과 같은 규칙,
       `toRoleLabel` — 매퍼 한 곳을 공유한다).
  */
  it("역할 라벨의 '없음' 시스템 값을 null로 되돌린다", async () => {
    serverApiMock.mockResolvedValueOnce([
      { teamId: 10, name: "개발팀", subTeams: [{ roleLabel: "없음", members: [member(1)] }] },
    ]);

    const roster = await listAllManagedMembersForOrgChart();

    expect(roster[0]?.roleLabel).toBeNull();
  });
});

/**
 * 사원 상세 실서버 조회 — `roleId` 정규화(2026-08-14 프로덕션 재현).
 *
 * ⚠️ **`manage-actions.role-id.test.ts`는 이 실코드를 안 지난다** — 그 파일은
 *    `getManagedMember` 자체를 `jest.mock`으로 통째로 갈아치운다. `!= null`(BE PR #489
 *    미배포 시 `undefined`도 걸러야 한다)이 실제로 지켜지는지는 여기서만 잠긴다 — 나중에
 *    누가 `eqeqeq` 린트에 맞춰 `!==`로 되돌려도 다른 테스트는 못 잡는다.
 */
describe("getManagedMember — 실서버 roleId", () => {
  const requireAccessTokenMock = requireAccessToken as unknown as jest.Mock;
  const serverApiMock = serverApi as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    requireAccessTokenMock.mockResolvedValue("token");
  });

  function detail(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      memberId: 4,
      name: "박도현",
      teamName: "개발팀",
      positionName: "사원",
      role: "MEMBER",
      isAdmin: false,
      roleLabel: null,
      workStatus: "ACTIVE",
      joinedOn: "2023-01-15",
      teamId: 1,
      jobPositionId: 1,
      email: "dohyun@zgroup.co.kr",
      ...overrides,
    };
  }

  /** 담당 액션·대기 신청 조회는 이 테스트의 관심사가 아니다 — 빈 값으로 통일해 둔다 */
  function stubSideCalls() {
    serverApiMock.mockImplementation((url: string) => {
      if (url.startsWith("/api/handovers")) return Promise.resolve([]);
      if (url.startsWith("/api/company/actions")) {
        return Promise.resolve({ content: [], totalElements: 0 });
      }
      throw new Error(`이 테스트가 예상하지 않은 serverApi 호출: ${url}`);
    });
  }

  it("BE에 roleId 필드 자체가 없으면(#489 미배포) null이다 — 문자열 'undefined'가 아니다", async () => {
    stubSideCalls();
    serverApiMock.mockImplementationOnce((url: string) => {
      expect(url).toBe("/api/members/4");
      return Promise.resolve(detail({ roleId: undefined }));
    });

    const result = await getManagedMember(4);

    expect(result?.roleId).toBeNull();
  });

  it("BE가 roleId를 실제로 주면 문자열로 옮긴다", async () => {
    stubSideCalls();
    serverApiMock.mockImplementationOnce((url: string) => {
      expect(url).toBe("/api/members/4");
      return Promise.resolve(detail({ roleId: 3 }));
    });

    const result = await getManagedMember(4);

    expect(result?.roleId).toBe("3");
  });

  it("roleId가 명시적으로 null이면 그대로 null이다", async () => {
    stubSideCalls();
    serverApiMock.mockImplementationOnce((url: string) => {
      expect(url).toBe("/api/members/4");
      return Promise.resolve(detail({ roleId: null }));
    });

    const result = await getManagedMember(4);

    expect(result?.roleId).toBeNull();
  });
});
