import { AUTHORITY } from "@/constants/domain";

import { findPayloadProblem, toOnboardingPayload } from "./mapper";
import type { DepartmentNode, Invite, Position } from "./types";
import { LEADER_ROLE_ID, NO_ROLE_ID } from "./types";

/**
 * 매퍼 시험 — **BE가 400을 내는 지점**을 하나씩 짚는다.
 * 커밋은 한 번뿐이라 여기서 놓치면 되돌릴 자리가 없다.
 */

const DEPARTMENTS: DepartmentNode[] = [
  {
    id: "d1",
    name: "개발팀",
    children: [
      { id: "r1", name: "프론트", children: [] },
      { id: "r2", name: "백엔드", children: [] },
    ],
  },
  { id: "d2", name: "디자인팀", children: [] },
];

const POSITIONS: Position[] = [
  { id: "p1", name: "팀장", role: AUTHORITY.LEADER },
  { id: "p2", name: "사원", role: AUTHORITY.MEMBER },
];

function invite(patch: Partial<Invite>): Invite {
  return {
    id: "invite-1",
    name: "홍길동",
    email: "dev@company.com",
    departmentId: "d1",
    roleId: "r2",
    positionId: "p2",
    isAdmin: false,
    isSent: false,
    ...patch,
  };
}

describe("toOnboardingPayload", () => {
  it("화면 id를 그대로 tempId로 쓴다 — 부서·역할·직급이 서로를 가리킬 수 있어야 한다", () => {
    const payload = toOnboardingPayload({
      departments: DEPARTMENTS,
      positions: POSITIONS,
      invites: [invite({})],
    });

    expect(payload.teams[0]).toEqual({
      tempId: "d1",
      name: "개발팀",
      subTeams: [
        { tempId: "r1", name: "프론트" },
        { tempId: "r2", name: "백엔드" },
      ],
    });
    expect(payload.jobPositions[0]).toEqual({
      tempId: "p1",
      name: "팀장",
      defaultRole: "LEADER",
    });
    expect(payload.invites[0]).toMatchObject({
      teamTempId: "d1",
      subTeamTempId: "r2",
      jobPositionTempId: "p2",
    });
  });

  it("역할이 없는 부서는 빈 배열이다 — null이면 400이다", () => {
    const payload = toOnboardingPayload({
      departments: DEPARTMENTS,
      positions: POSITIONS,
      invites: [],
    });

    expect(payload.teams[1]?.subTeams).toEqual([]);
  });

  it.each([
    ["리더", LEADER_ROLE_ID],
    ["없음", NO_ROLE_ID],
    ["안 고름", ""],
  ])("화면 예약값(%s)은 subTeamTempId를 null로 보낸다 — BE에 없는 값이다", (_label, roleId) => {
    const payload = toOnboardingPayload({
      departments: DEPARTMENTS,
      positions: POSITIONS,
      invites: [invite({ roleId })],
    });

    expect(payload.invites[0]?.subTeamTempId).toBeNull();
  });

  it("이름이 비면 주소 앞부분으로 메운다 — BE 필수라 한 줄 때문에 커밋 전체가 400이 된다", () => {
    const payload = toOnboardingPayload({
      departments: DEPARTMENTS,
      positions: POSITIONS,
      invites: [invite({ name: "  ", email: "  hong@company.com " })],
    });

    expect(payload.invites[0]).toMatchObject({ name: "hong", email: "hong@company.com" });
  });
});

describe("findPayloadProblem", () => {
  const base = { departments: DEPARTMENTS, positions: POSITIONS, invites: [] };

  it("멀쩡한 값은 통과시킨다", () => {
    expect(findPayloadProblem(toOnboardingPayload(base))).toBeNull();
  });

  it("OWNER 직급은 보내기 전에 막는다 — BE가 400으로 답하는데 어느 직급인지 안 알려준다", () => {
    const payload = toOnboardingPayload({
      ...base,
      positions: [{ id: "p9", name: "대표", role: AUTHORITY.OWNER }],
    });

    expect(findPayloadProblem(payload)).toContain("대표");
  });

  it.each([
    ["부서", { ...base, departments: [] }, "팀"],
    ["직급", { ...base, positions: [] }, "직급"],
  ])("%s가 하나도 없으면 막는다", (_label, input, expected) => {
    expect(findPayloadProblem(toOnboardingPayload(input))).toContain(expected);
  });
});
