// 서버 액션은 next 런타임 함수를 부른다 — jsdom엔 없으니 목으로 대체하고 호출만 검증한다.
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
// isMock은 환경변수로 정해진다 — 테스트가 환경에 휘둘리지 않게 고정한다.
jest.mock("@/mocks/config", () => ({ isMock: true }));
// 신원은 세션에서 온다 — 배우를 갈아 끼울 수 있게 목으로 둔다.
jest.mock("@/features/shell/viewer", () => ({ getViewer: jest.fn() }));

import { revalidatePath } from "next/cache";

import { AUTHORITY } from "@/constants/domain";
import { getViewer } from "@/features/shell/viewer";

import { saveCompanyProfileAction, saveDepartmentsAction, savePositionsAction } from "./actions";
import { getMockCompanySetting, resetMockCompanySetting } from "./mock/company";
import { getCompanySetting } from "./server";
import type { CompanyProfileDraft, DepartmentNode, Position } from "./types";

/**
 * 기업 설정의 **변경 작업**.
 *
 * ⚠️ 여기서 보는 건 화면이 아니라 **서버가 마지막에 무엇을 막느냐**다. 액션은 주소만 알면
 *    직접 부를 수 있어서(§권한: 화면 숨김은 보안이 아니다), 이 파일이 없으면 권한 검사를
 *    지워도 아무도 못 잡는다.
 */

const revalidatePathMock = revalidatePath as unknown as jest.Mock;
const getViewerMock = getViewer as unknown as jest.Mock;

const OWNER = { id: 1, name: "대표", role: AUTHORITY.OWNER, isAdmin: false };
const ADMIN_MEMBER = { id: 2, name: "관리자", role: AUTHORITY.MEMBER, isAdmin: true };
const LEADER = { id: 3, name: "팀장", role: AUTHORITY.LEADER, isAdmin: false };

const VALID_PROFILE: CompanyProfileDraft = {
  name: "새이름",
  businessNumber: "999-88-77777",
  place: { address: "서울 강남구 테헤란로 1", lat: 37.5, lng: 127 },
};

/*
  ⚠️ **사람이 있는 팀·역할은 다 남겨 둔다**(BE PR #528 이후로는 역할도 그렇다). 하나라도
     빠지면 "N명이 쓰고 있습니다"로 막히는데, 그건 아래 전용 테스트가 볼 일이다 — 여기서는
     정상 저장 경로를 봐야 한다.
  ⚠️ 목의 팀은 `d1~d5`이고 사람이 없는 건 `d5`뿐이다. 역할은 `r1`(프론트엔드)·`r3`(브랜드)에
     사람이 있어(`mock/company.ts`의 `roleMemberCounts`) 둘 다 남긴다 — 나머지 역할은
     비어 있어 빼도 통과한다.
*/
const VALID_TEAMS: DepartmentNode[] = [
  { id: "d1", name: "개발팀", children: [{ id: "r1", name: "프론트엔드", children: [] }] },
  { id: "d2", name: "마케팅팀", children: [{ id: "r3", name: "브랜드", children: [] }] },
  { id: "d3", name: "디자인팀", children: [] },
  { id: "d4", name: "전략기획팀", children: [] },
];

const VALID_POSITIONS: Position[] = [
  { id: "p1", name: "팀장", role: AUTHORITY.LEADER },
  { id: "p2", name: "사원", role: AUTHORITY.MEMBER },
];

function profileForm(draft: CompanyProfileDraft): FormData {
  const data = new FormData();
  data.append("name", draft.name);
  data.append("businessNumber", draft.businessNumber);
  if (draft.place) {
    data.append("placeAddress", draft.place.address);
    data.append("placeLat", String(draft.place.lat));
    data.append("placeLng", String(draft.place.lng));
  }
  return data;
}

beforeEach(() => {
  revalidatePathMock.mockClear();
  resetMockCompanySetting();
  getViewerMock.mockResolvedValue(OWNER);
});

describe("권한 — OWNER 전용", () => {
  /*
    ⚠️ **Admin 겸직도 막는다.** 여기서 직급의 권한을 고칠 수 있어서, 열어주면 Admin이
       자기 직급을 Leader로 올려 스스로 상위 권한을 만든다(`canManageCompany` 참고).
  */
  it.each([
    ["Admin 겸직자", ADMIN_MEMBER],
    ["팀장", LEADER],
  ])("%s는 세 가지 다 못 바꾼다", async (_label, viewer) => {
    getViewerMock.mockResolvedValue(viewer);

    const profile = await saveCompanyProfileAction({ errors: {} }, profileForm(VALID_PROFILE));
    expect(profile.message).toBeTruthy();
    expect(await saveDepartmentsAction(VALID_TEAMS)).toMatchObject({ isSuccess: false });
    expect(await savePositionsAction(VALID_POSITIONS)).toMatchObject({ isSuccess: false });

    // 막혔으면 저장도 재검증도 없어야 한다
    expect(getMockCompanySetting().profile.name).not.toBe(VALID_PROFILE.name);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  /*
    ⚠️ 세션을 못 읽은 것과 권한이 없는 것은 **다른 말**이다. 쿠키가 만료된 대표에게
       "권한이 없습니다"라고 하면 할 수 있는 게 없어진다.
  */
  it("세션을 못 읽으면 거부하되 권한 없음과 다른 말을 한다", async () => {
    getViewerMock.mockRejectedValue(new Error("no session"));

    const result = await saveDepartmentsAction(VALID_TEAMS);

    expect(result.isSuccess).toBe(false);
    expect(result.message).toMatch(/로그인/);
    expect(result.message).not.toMatch(/권한/);
  });
});

describe("saveCompanyProfileAction", () => {
  it("저장하면 목에 남고 경로를 다시 읽는다", async () => {
    const result = await saveCompanyProfileAction({ errors: {} }, profileForm(VALID_PROFILE));

    expect(result.errors).toEqual({});
    expect(getMockCompanySetting().profile.name).toBe("새이름");
    expect(revalidatePathMock).toHaveBeenCalledWith("/owner/setting");
  });

  /*
    ⚠️ 이 카드는 저장해도 **화면 값이 그대로**라, 토스트가 성공을 알리는 유일한 신호다.
       그 토스트는 이 값을 보고 뜬다 — 빠지면 저장해도 아무 말도 안 한다.
  */
  it("성공하면 저장됐다고 알린다", async () => {
    const result = await saveCompanyProfileAction({ errors: {} }, profileForm(VALID_PROFILE));

    expect(result.isSaved).toBe(true);
  });

  it("실패하면 저장됐다고 하지 않는다", async () => {
    const result = await saveCompanyProfileAction(
      { errors: {} },
      profileForm({ ...VALID_PROFILE, name: "" }),
    );

    expect(result.isSaved).toBeUndefined();
  });

  /* ⚠️ 기업 코드는 폼에 없다 — 저장이 그 값을 지워 버리면 사원이 전부 못 들어온다 */
  it("기업 코드는 그대로 남는다", async () => {
    const before = getMockCompanySetting().profile.code;

    await saveCompanyProfileAction({ errors: {} }, profileForm(VALID_PROFILE));

    expect(getMockCompanySetting().profile.code).toBe(before);
  });

  it("검증에 걸리면 저장도 재검증도 없다", async () => {
    const result = await saveCompanyProfileAction(
      { errors: {} },
      profileForm({ ...VALID_PROFILE, businessNumber: "1234567890" }),
    );

    expect(result.errors.businessNumber).toBeTruthy();
    expect(getMockCompanySetting().profile.name).not.toBe("새이름");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("saveDepartmentsAction · savePositionsAction", () => {
  it("정상 값은 저장되고 경로를 다시 읽는다", async () => {
    expect(await saveDepartmentsAction(VALID_TEAMS)).toEqual({ isSuccess: true });
    expect(getMockCompanySetting().departments).toEqual(VALID_TEAMS);

    expect(await savePositionsAction(VALID_POSITIONS)).toEqual({ isSuccess: true });
    expect(getMockCompanySetting().positions).toEqual(VALID_POSITIONS);

    expect(revalidatePathMock).toHaveBeenCalledTimes(2);
  });

  it("팀이 비면 막고 저장하지 않는다", async () => {
    const result = await saveDepartmentsAction([]);

    expect(result.isSuccess).toBe(false);
    expect(getMockCompanySetting().departments.length).toBeGreaterThan(0);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  /*
    ⚠️ **화면이 안 주는 값도 들어온다.** 셀렉트는 Leader·Member만 주지만 액션은 직접 부를 수
       있다 — `role: "OWNER"`인 직급이 저장되면 그 직급을 받은 사람 전원이 회사 전체 권한을 얻는다.
  */
  it("직급에 OWNER 권한을 심으려 하면 막는다", async () => {
    const result = await savePositionsAction([
      { id: "p9", name: "사원", role: AUTHORITY.OWNER } as Position,
    ]);

    expect(result.isSuccess).toBe(false);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  /*
    ⚠️ **`getMockCompanySetting()`이 아니라 `getCompanySetting()`을 쓴다.** 저장소는 역할을
       원본 그대로 들고 있어(전역 시드 `없음`이 팀마다 같은 id로 반복된다), 화면이 실제로
       받는 값은 `withoutSystemRoles`로 그 값을 거른 뒤다(`getCompanySetting`) — 안 거르면
       모든 팀에 `없음`(id `r0`)이 겹쳐서 "같은 식별자가 둘"로 먼저 막힌다.
  */
  /* ⚠️ 화면이 미리 막지만 액션은 직접 부를 수 있다 — 서버가 마지막에 다시 본다 */
  /* ⚠️ 옮긴 것과 지운 것은 다른 사건이라 문구도 다르다 */
  it("사원이 남은 팀을 남의 역할로 내리려 하면 다른 말로 막는다", async () => {
    const teams = (await getCompanySetting()).departments;
    /* ⚠️ 자식이 없는 팀을 옮긴다 — 자식 있는 팀을 넣으면 3계층이 되어 다른 규칙에 먼저 걸린다 */
    const moved = teams
      .filter((team) => team.id !== "d4")
      .map((team) =>
        team.id === "d1"
          ? { ...team, children: [...team.children, teams.find((t) => t.id === "d4")!] }
          : team,
      );

    const result = await saveDepartmentsAction(moved);

    expect(result.isSuccess).toBe(false);
    expect(result.message).toMatch(/옮길 수 없습니다/);
  });

  it("사원이 남은 팀을 지우려 하면 막는다", async () => {
    const withoutTeams = (await getCompanySetting()).departments.filter((team) => team.id !== "d1");

    const result = await saveDepartmentsAction(withoutTeams);

    expect(result.isSuccess).toBe(false);
    expect(result.message).toMatch(/사원 관리/);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("빈 팀은 지울 수 있다", async () => {
    // ⚠️ 사람이 없는 팀은 `d5`다 — `d3`(디자인팀)에는 사원이 있다
    const withoutEmpty = (await getCompanySetting()).departments.filter((team) => team.id !== "d5");

    expect(await saveDepartmentsAction(withoutEmpty)).toEqual({ isSuccess: true });
  });

  it("Leader 직급이 둘이면 막는다", async () => {
    const result = await savePositionsAction([
      { id: "p1", name: "팀장", role: AUTHORITY.LEADER },
      { id: "p2", name: "실장", role: AUTHORITY.LEADER },
    ]);

    expect(result.isSuccess).toBe(false);
  });
});
