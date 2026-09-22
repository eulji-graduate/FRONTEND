jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/mocks/config", () => ({ isMock: false }));
jest.mock("@/features/shell/viewer", () => ({ getViewer: jest.fn() }));
jest.mock("@/features/auth/session", () => ({ requireAccessToken: jest.fn() }));
jest.mock("@/features/company/server", () => ({ getCompanyOrg: jest.fn() }));
jest.mock("@/features/member/manage-server", () => ({ getManagedMember: jest.fn() }));
jest.mock("@/lib/api", () => ({
  serverApi: jest.fn().mockResolvedValue(undefined),
  toUserMessage: jest.fn((error: unknown) => String(error)),
}));

import { AUTHORITY } from "@/constants/authority";
import { requireAccessToken } from "@/features/auth/session";
import { getCompanyOrg } from "@/features/company/server";
import { getViewer } from "@/features/shell/viewer";
import { serverApi } from "@/lib/api";

import { changeMemberGradeAction } from "./manage-actions";
import { getManagedMember } from "./manage-server";
import type { ManagedMember, ManagedMemberDetail } from "./manage-types";

/**
 * 실서버 분기(`isMock: false`)에서 `PATCH /api/members/{id}`로 나가는 요청 본문 — 특히
 * `roleId`(2026-08-14 BE PR #489, 이름 대신 id로 바뀌었다).
 *
 * ⚠️ **왜 따로 판다.** 기존 `manage-actions.test.ts`는 파일 전체가 `isMock: true`로
 *    고정돼 있어(모듈 스코프 `jest.mock`), 실서버로 나가는 요청 본문은 그 파일 어디서도
 *    실행되지 않는다 — `roleId`를 매번 실어 보내던 버그가 타입 에러 하나로만 드러났고
 *    실행 경로로는 한 번도 검증되지 않았다.
 * ⚠️ **바뀐 게 아니면 필드째 뺀다**(`manage-actions.ts` 주석). BE는 `null`(필드 없음)을
 *    "안 바꾼다"로 읽는다 — 매 요청에 값을 실으면 직급만 고쳐도 역할이 함께 써진다.
 */

const getViewerMock = getViewer as unknown as jest.Mock;
const getCompanyOrgMock = getCompanyOrg as unknown as jest.Mock;
const getManagedMemberMock = getManagedMember as unknown as jest.Mock;
const requireAccessTokenMock = requireAccessToken as unknown as jest.Mock;
const serverApiMock = serverApi as unknown as jest.Mock;

const OWNER = { id: 1, name: "박대표", role: AUTHORITY.OWNER, isAdmin: false };

/* ⚠️ 역할 id는 **숫자 문자열**이어야 한다 — 액션이 BE로 나갈 때 `Number()`로 바꾼다 */
const NONE_ROLE_ID = "0";
const FRONTEND_ROLE_ID = "1";
const BACKEND_ROLE_ID = "2";

function memberOf(overrides: Partial<ManagedMember>): ManagedMember {
  return {
    id: 4,
    name: "박도현",
    email: "dohyun@zgroup.co.kr",
    /*
      ⚠️ 팀은 있어야 `isRoleOfTeam`이 실제로 검사한다. `findTeamLeaderClash`는 권한이
         안 바뀌면(이 테스트들은 authority를 그대로 둔다) `getTeamLeaders()`를 안 불러
         팀이 있어도 추가 목 설정이 필요 없다.
    */
    teamName: "제품팀",
    position: "사원",
    authority: AUTHORITY.MEMBER,
    isAdmin: false,
    roleLabel: "프론트엔드",
    status: "ACTIVE" as ManagedMember["status"],
    joinedAt: "2026-01-01",
    pendingHandoverType: null,
    ...overrides,
  };
}

function detailOf(overrides: {
  member?: Partial<ManagedMember>;
  roleId?: string | null;
}): ManagedMemberDetail {
  return {
    member: memberOf(overrides.member ?? {}),
    actions: null,
    pendingHandover: null,
    roleId: overrides.roleId ?? FRONTEND_ROLE_ID,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  getViewerMock.mockResolvedValue(OWNER);
  getCompanyOrgMock.mockResolvedValue({
    departments: [
      {
        id: "team-1",
        name: "제품팀",
        children: [
          { id: NONE_ROLE_ID, name: "없음", children: [] },
          { id: FRONTEND_ROLE_ID, name: "프론트엔드", children: [] },
          { id: BACKEND_ROLE_ID, name: "백엔드", children: [] },
        ],
      },
    ],
    positions: [{ id: 10, name: "사원" }],
  });
  requireAccessTokenMock.mockResolvedValue("token");
  serverApiMock.mockResolvedValue(undefined);
});

describe("changeMemberGradeAction — 실서버 요청 본문의 roleId", () => {
  it("역할을 안 바꾸면 요청에 roleId 키 자체가 없다", async () => {
    getManagedMemberMock.mockResolvedValue(detailOf({ roleId: FRONTEND_ROLE_ID }));

    const result = await changeMemberGradeAction(4, {
      position: "사원",
      authority: AUTHORITY.MEMBER,
      isAdmin: false,
      roleId: FRONTEND_ROLE_ID,
    });

    expect(result.isSuccess).toBe(true);
    const [, options] = serverApiMock.mock.calls[0]!;
    expect(options.json).not.toHaveProperty("roleId");
  });

  it("roleId를 아예 안 넘겨도(직급만 고친 저장) 키가 없다", async () => {
    getManagedMemberMock.mockResolvedValue(detailOf({ roleId: FRONTEND_ROLE_ID }));

    await changeMemberGradeAction(4, {
      position: "사원",
      authority: AUTHORITY.MEMBER,
      isAdmin: false,
    });

    const [, options] = serverApiMock.mock.calls[0]!;
    expect(options.json).not.toHaveProperty("roleId");
  });

  it("역할을 실제로 바꾸면 숫자로 바꿔 싣는다", async () => {
    getManagedMemberMock.mockResolvedValue(detailOf({ roleId: FRONTEND_ROLE_ID }));

    const result = await changeMemberGradeAction(4, {
      position: "사원",
      authority: AUTHORITY.MEMBER,
      isAdmin: false,
      roleId: BACKEND_ROLE_ID,
    });

    expect(result.isSuccess).toBe(true);
    const [, options] = serverApiMock.mock.calls[0]!;
    expect(options.json).toMatchObject({ roleId: 2 });
  });

  /*
    ⚠️ **비우기는 막지 않는다** — `없음`도 그 팀의 실제 역할 행이라(진짜 id가 있다) 다른
       역할을 고르는 것과 똑같이 취급한다. 예전(라벨 시절)처럼 특별 취급하지 않는다.
  */
  it("역할을 `없음`으로 바꾸면 그 행의 id를 그대로 실어 보낸다", async () => {
    getManagedMemberMock.mockResolvedValue(detailOf({ roleId: FRONTEND_ROLE_ID }));

    const result = await changeMemberGradeAction(4, {
      position: "사원",
      authority: AUTHORITY.MEMBER,
      isAdmin: false,
      roleId: NONE_ROLE_ID,
    });

    expect(result.isSuccess).toBe(true);
    const [, options] = serverApiMock.mock.calls[0]!;
    expect(options.json).toMatchObject({ roleId: 0 });
  });

  it("이미 그 값이면(안 바뀜) 키 자체를 안 싣는다", async () => {
    getManagedMemberMock.mockResolvedValue(detailOf({ roleId: NONE_ROLE_ID }));

    await changeMemberGradeAction(4, {
      position: "사원",
      authority: AUTHORITY.MEMBER,
      isAdmin: false,
      roleId: NONE_ROLE_ID,
    });

    const [, options] = serverApiMock.mock.calls[0]!;
    expect(options.json).not.toHaveProperty("roleId");
  });

  /* ⚠️ 화면은 그 팀 역할만 주지만 액션은 주소만 알면 부를 수 있다 — 남의 팀 역할을 막는다 */
  it("그 팀에 없는 역할 id면 막고 요청을 보내지 않는다", async () => {
    getManagedMemberMock.mockResolvedValue(detailOf({ roleId: FRONTEND_ROLE_ID }));

    const result = await changeMemberGradeAction(4, {
      position: "사원",
      authority: AUTHORITY.MEMBER,
      isAdmin: false,
      roleId: "no-such-role",
    });

    expect(result.isSuccess).toBe(false);
    expect(result.message).toBe("그 팀에 없는 역할입니다");
    expect(serverApiMock).not.toHaveBeenCalled();
  });
});
