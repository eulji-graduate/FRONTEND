import type { DepartmentNode } from "@/features/company/types";

import { buildTeamRoles, isRoleOfTeam, roleIdOf, roleNameOf } from "./team-roles";

/*
  ⚠️ **`없음`을 실제 행으로 둔다**(2026-08-14 BE PR #489) — BE가 모든 팀의 역할 목록에
     전역 시드 행 `없음`을 실제 id로 끼워서 주므로, 여기서도 화면이 만들어 넣지 않고
     BE처럼 목에 이미 있는 값으로 둔다.
*/
const TEAMS: DepartmentNode[] = [
  {
    id: "d1",
    name: "개발팀",
    children: [
      { id: "r0", name: "없음", children: [] },
      { id: "r1", name: "프론트엔드", children: [] },
      { id: "r2", name: "백엔드", children: [] },
    ],
  },
  { id: "d2", name: "전략기획팀", children: [{ id: "r0", name: "없음", children: [] }] },
];

describe("buildTeamRoles", () => {
  it("팀 이름에 그 팀의 역할만 매단다", () => {
    expect(buildTeamRoles(TEAMS)).toEqual({
      개발팀: [
        { id: "r0", name: "없음" },
        { id: "r1", name: "프론트엔드" },
        { id: "r2", name: "백엔드" },
      ],
      전략기획팀: [{ id: "r0", name: "없음" }],
    });
  });
});

describe("isRoleOfTeam", () => {
  const roles = buildTeamRoles(TEAMS);

  it("그 팀의 역할이면 통과한다", () => {
    expect(isRoleOfTeam(roles, "개발팀", "r2")).toBe(true);
  });

  /* ⚠️ 역할은 팀에 매여 있다 — 남의 팀 역할을 붙이면 조직도가 거짓말을 한다 */
  it("다른 팀의 역할이면 막는다", () => {
    expect(isRoleOfTeam(roles, "전략기획팀", "r2")).toBe(false);
  });

  it("`null`(아직 안 골랐다)은 늘 통과한다", () => {
    expect(isRoleOfTeam(roles, "개발팀", null)).toBe(true);
    expect(isRoleOfTeam(roles, "전략기획팀", null)).toBe(true);
  });

  /* ⚠️ `없음`도 그 팀의 실제 역할 행이라 다른 역할과 똑같이 검사를 통과한다 */
  it("`없음` id를 고른 것도 통과한다 — 실제로 있는 행이다", () => {
    expect(isRoleOfTeam(roles, "전략기획팀", "r0")).toBe(true);
  });

  it("모르는 팀이면 막는다 — `null`만 예외다", () => {
    expect(isRoleOfTeam(roles, "없는팀", "r2")).toBe(false);
  });
});

describe("roleNameOf — 목 저장소에 싣기 전 id → 이름", () => {
  const roles = buildTeamRoles(TEAMS);

  it("역할 id면 그 이름을 돌려준다", () => {
    expect(roleNameOf(roles, "개발팀", "r1")).toBe("프론트엔드");
  });

  /* ⚠️ 목 계약(`ManagedMember.roleLabel`)은 역할 없음을 `null`로 적는다 */
  it("`없음` id는 `null`이다", () => {
    expect(roleNameOf(roles, "개발팀", "r0")).toBeNull();
  });

  it("`null`(안 바꿈)도 `null`이다", () => {
    expect(roleNameOf(roles, "개발팀", null)).toBeNull();
  });
});

describe("roleIdOf — 목 저장소를 읽어 화면 계약 채우기", () => {
  const roles = buildTeamRoles(TEAMS);

  it("이름이 있으면 그 id를 돌려준다", () => {
    expect(roleIdOf(roles, "개발팀", "백엔드")).toBe("r2");
  });

  /* ⚠️ 라벨이 없는 사람(`roleLabel: null`)은 그 팀의 `없음` 행 id로 되찾는다 */
  it("라벨이 없으면 `없음` 행의 id다", () => {
    expect(roleIdOf(roles, "개발팀", null)).toBe("r0");
    expect(roleIdOf(roles, "전략기획팀", null)).toBe("r0");
  });

  it("못 찾으면 `null`이다", () => {
    expect(roleIdOf(roles, "개발팀", "없는역할")).toBeNull();
  });
});
