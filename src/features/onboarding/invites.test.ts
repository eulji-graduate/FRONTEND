import {
  departmentsWithLeader,
  duplicatedLeaderIds,
  duplicateEmails,
  type InviteRules,
  isValidEmail,
} from "./invite-rules";
import {
  changeInviteDepartment,
  changeInviteEmail,
  changeInvitePosition,
  changeInviteRole,
  createInvite,
  markInvitesSent,
  remapInvite,
  removeInvite,
  sendableInvites,
  toggleInviteAdmin,
} from "./invites";
import type { Invite } from "./types";
import { LEADER_ROLE_ID, NO_ROLE_ID } from "./types";

/** 목록에서 `lead`만 리더 직급으로 보고, 모든 부서에 역할이 있다고 본다 */
const isLeader: InviteRules = {
  isLeaderPosition: (positionId) => positionId === "lead",
  hasRoles: () => true,
};

/*
  ⚠️ 역할은 **실제 역할 id**를 쓴다. 전에는 세 줄 다 `NO_ROLE_ID`(`없음`)였는데,
     위 `isLeader`는 `hasRoles: () => true`(모든 팀에 역할이 있다)라 규칙상 `없음`을 고를 수
     없는 줄이었다 — 픽스처 자체가 규칙과 모순이었고, `sendableInvites`가 짝 규칙을 보게 되면서
     드러났다(적대적 검토 #163).
*/
const makeList = (): Invite[] => [
  {
    id: "a",
    name: "",
    email: "dev1@company.com",
    departmentId: "dev",
    roleId: "fe",
    positionId: "staff",
    isAdmin: false,
    isSent: false,
  },
  {
    id: "b",
    name: "",
    email: "design@company.com",
    departmentId: "design",
    roleId: "fe",
    positionId: "staff",
    isAdmin: false,
    isSent: false,
  },
  {
    id: "c",
    name: "",
    email: "",
    departmentId: "dev",
    roleId: "fe",
    positionId: "staff",
    isAdmin: false,
    isSent: false,
  },
];

const emails = (invites: Invite[]) => invites.map((invite) => invite.email);

describe("createInvite", () => {
  it("부서·역할·직급까지 **전부 빈 채로** 만든다 — 고르지 않은 값이 채워져 있으면 안 된다", () => {
    expect(createInvite("invite-1")).toEqual({
      id: "invite-1",
      name: "",
      email: "",
      departmentId: "",
      // ⚠️ `NO_ROLE_ID`가 아니다 — 그건 `없음`을 **고른** 상태다. 새 줄은 아직 안 골랐다.
      roleId: "",
      positionId: "",
      isAdmin: false,
      isSent: false,
    });
  });
});

describe("isValidEmail", () => {
  it.each(["a@b.co", " dev1@company.com "])("올바른 주소를 통과시킨다: %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(["", "  ", "dev1", "dev1@", "@company.com", "dev1@company", "dev 1@company.com"])(
    "형식이 어긋나면 막는다: %s",
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    },
  );
});

describe("changeInvite*", () => {
  it("주소를 바꾼다", () => {
    expect(emails(changeInviteEmail(makeList(), "c", "biz@company.com"))).toEqual([
      "dev1@company.com",
      "design@company.com",
      "biz@company.com",
    ]);
  });

  it("부서를 바꾼다", () => {
    const next = changeInviteDepartment(makeList(), "a", "biz", isLeader);
    expect(next[0]?.departmentId).toBe("biz");
  });

  it("직급을 바꾼다", () => {
    const next = changeInvitePosition(makeList(), "a", "staff", isLeader);
    expect(next[0]?.positionId).toBe("staff");
  });

  /*
    리더는 부서 전체를 맡는 자리다 — 부서 안의 한 역할에 매이면 관리 범위가 어긋난다.
    화면에서 막는 것만으로는 부족하다: 역할을 먼저 고른 뒤 직급을 리더로 바꾸는 순서가 남는다.
  */
  /*
    ⚠️ **비우는 게 아니라 `리더`로 채운다.** 전에는 `없음`으로 비웠는데, 팀장 줄에 `없음`이라
       적히니 "역할을 안 정했다"로 읽혔다. BE에서도 `리더`는 실재하는 역할이다(전역 시드 1).
  */
  it("리더 직급을 고르면 역할이 `리더`로 채워진다", () => {
    const next = changeInvitePosition(makeList(), "a", "lead", isLeader);
    expect(next[0]?.positionId).toBe("lead");
    expect(next[0]?.roleId).toBe(LEADER_ROLE_ID);
  });

  it("리더가 아닌 직급은 역할을 건드리지 않는다", () => {
    const before = makeList()[0]?.roleId;
    expect(changeInvitePosition(makeList(), "a", "staff", isLeader)[0]?.roleId).toBe(before);
  });

  /*
    ⚠️ **리더에서 내려오면 역할을 비운다.** `리더`는 리더 직급만 가질 수 있는 값이라 그대로
       두면 `과장 + 리더`처럼 짝이 어긋난 줄이 남는다.
  */
  /*
    ⚠️ **팀 칸은 `positionsFor` 필터를 지나가지 않는 유일한 경로다.** 여기서 안 막으면 한 팀에
       리더가 둘이 된다. 한때 여기서 역할·직급을 비워 막았는데, 그건 사용자가 고른 값을
       화면이 조용히 지우는 일이었다 — 지금은 **값을 그대로 두고 발송 검증이 막는다**
       (적대적 검토 #163).
  */
  it("이미 리더가 있는 팀으로 옮겨도 고른 값을 지우지 않는다", () => {
    const first = changeInvitePosition(makeList(), "a", "lead", isLeader);
    const moved = changeInviteDepartment(first, "b", "dev", isLeader);
    const asLeader = changeInvitePosition(moved, "b", "lead", isLeader);

    // b가 리더가 된 뒤 a와 같은 팀으로 옮기면 — 자리가 이미 찼다
    const clash = changeInviteDepartment(asLeader, "b", "dev", isLeader);

    expect(clash[1]?.departmentId).toBe("dev");
    // 고른 값은 남는다 — 왜 비었는지 말해 줄 자리가 없는 채로 지우지 않는다
    expect(clash[1]?.roleId).toBe(LEADER_ROLE_ID);
    expect(clash[1]?.positionId).toBe("lead");
  });

  /*
    ⚠️ **규칙은 검증에 있다.** 값을 지워서 우회하면 `팀당 리더 한 명`이 코드 어디에도
       적혀 있지 않게 된다 — 발송 검증이 그 규칙을 직접 본다.
    ⚠️ 화면 경고(`duplicatedLeaderIds`)와 **같은 줄**이 빠져야 한다. 각자 세면
       경고는 뜨는데 발송은 되는 줄이 생긴다.
  */
  it("한 팀에 리더가 둘이면 뒤에 온 줄이 발송에서 빠진다", () => {
    const first = changeInvitePosition(makeList(), "a", "lead", isLeader);
    const moved = changeInviteDepartment(first, "b", "dev", isLeader);
    const asLeader = changeInvitePosition(moved, "b", "lead", isLeader);
    const clash = changeInviteDepartment(asLeader, "b", "dev", isLeader);

    const going = sendableInvites(clash, isLeader).map((invite) => invite.id);

    // 앞줄은 그대로 나가고 뒷줄만 빠진다 — 주소 중복과 같은 규약이다
    expect(going).toContain("a");
    expect(going).not.toContain("b");
    // 화면이 문제로 잡는 줄과 정확히 같아야 한다
    expect([...duplicatedLeaderIds(clash, isLeader.isLeaderPosition)]).toEqual(["b"]);
  });

  it("리더가 없는 팀으로 옮기면 `리더`가 그대로 따라간다", () => {
    const asLeader = changeInvitePosition(makeList(), "a", "lead", isLeader);
    const moved = changeInviteDepartment(asLeader, "a", "biz", isLeader);

    expect(moved[0]?.roleId).toBe(LEADER_ROLE_ID);
    expect(moved[0]?.positionId).toBe("lead");
  });

  it("리더에서 내려오면 `리더` 역할을 비운다 — 짝이 어긋난 줄을 남기지 않는다", () => {
    const asLeader = changeInvitePosition(makeList(), "a", "lead", isLeader);
    const next = changeInvitePosition(asLeader, "a", "staff", isLeader);

    expect(next[0]?.positionId).toBe("staff");
    expect(next[0]?.roleId).toBe("");
  });

  it("원본을 바꾸지 않는다", () => {
    const invites = makeList();
    changeInviteEmail(invites, "a", "other@company.com");
    expect(invites[0]?.email).toBe("dev1@company.com");
  });
});

describe("removeInvite", () => {
  it("해당 줄만 지운다", () => {
    expect(emails(removeInvite(makeList(), "a"))).toEqual(["design@company.com", ""]);
  });

  it("없는 id면 그대로 둔다", () => {
    expect(removeInvite(makeList(), "없음")).toHaveLength(3);
  });
});

describe("sendableInvites", () => {
  it("주소가 유효한 줄만 남긴다 — 빈 줄은 발송 대상이 아니다", () => {
    expect(emails(sendableInvites(makeList(), isLeader))).toEqual([
      "dev1@company.com",
      "design@company.com",
    ]);
  });
});

describe("markInvitesSent", () => {
  it("발송하면 주소가 유효한 줄에만 도장이 찍힌다 — 빈 줄은 그대로다", () => {
    const next = markInvitesSent(makeList(), isLeader);
    expect(next.map((invite) => invite.isSent)).toEqual([true, true, false]);
  });

  it("이미 보낸 줄은 다음 발송 대상에서 빠진다", () => {
    const sent = markInvitesSent(makeList(), isLeader);
    expect(sendableInvites(sent, isLeader)).toEqual([]);
  });

  it("나중에 추가한 줄만 다음 발송 대상이 된다", () => {
    const sent = markInvitesSent(makeList(), isLeader);
    const added: Invite[] = [
      ...sent,
      {
        id: "d",
        name: "",
        email: "new@company.com",
        departmentId: "dev",
        roleId: "fe",
        positionId: "staff",
        isAdmin: false,
        isSent: false,
      },
    ];
    expect(emails(sendableInvites(added, isLeader))).toEqual(["new@company.com"]);
  });
});

describe("duplicateEmails", () => {
  it("대소문자·공백을 무시하고 중복을 찾는다", () => {
    const invites: Invite[] = [
      {
        id: "a",
        name: "",
        email: "dev1@company.com",
        departmentId: "dev",
        roleId: "fe",
        positionId: "staff",
        isAdmin: false,
        isSent: false,
      },
      {
        id: "b",
        name: "",
        email: " DEV1@Company.com ",
        departmentId: "design",
        roleId: "fe",
        positionId: "staff",
        isAdmin: false,
        isSent: false,
      },
      {
        id: "c",
        name: "",
        email: "biz@company.com",
        departmentId: "biz",
        roleId: "fe",
        positionId: "staff",
        isAdmin: false,
        isSent: false,
      },
    ];
    expect(duplicateEmails(invites)).toEqual(new Set(["dev1@company.com"]));
  });

  it("빈 줄은 중복으로 세지 않는다", () => {
    const invites: Invite[] = [
      {
        id: "a",
        name: "",
        email: "",
        departmentId: "dev",
        roleId: "fe",
        positionId: "staff",
        isAdmin: false,
        isSent: false,
      },
      {
        id: "b",
        name: "",
        email: "  ",
        departmentId: "dev",
        roleId: "fe",
        positionId: "staff",
        isAdmin: false,
        isSent: false,
      },
    ];
    expect(duplicateEmails(invites).size).toBe(0);
  });
});

/*
  ⚠️ **`없음`은 어느 팀에서나 고를 수 있다**(2026-08-10 변경). 전에는 역할이 있는 팀에서
     일반 팀원이 `없음`을 고르는 걸 막았는데, 이제 목록에 띄워 놓고 고르게 하므로
     막으면 화면과 발송 판정이 다른 말을 한다. BE도 `subTeamTempId: null`을 허용한다.
*/
describe("`없음` — 팀에 역할이 있든 없든 고를 수 있다", () => {
  const noRoles: InviteRules = { isLeaderPosition: (id) => id === "lead", hasRoles: () => false };

  it("역할 없는 팀 — 일반 직급을 그대로 둔다", () => {
    const next = changeInviteRole(makeList(), "a", NO_ROLE_ID, noRoles);
    expect(next[0]?.roleId).toBe(NO_ROLE_ID);
    expect(next[0]?.positionId).toBe("staff");
  });

  it("역할 있는 팀에서도 직급이 그대로 남는다 — 더는 예외가 갈리지 않는다", () => {
    const next = changeInviteRole(makeList(), "a", NO_ROLE_ID, isLeader);
    expect(next[0]?.roleId).toBe(NO_ROLE_ID);
    expect(next[0]?.positionId).toBe("staff");
  });
});

describe("changeInviteRole", () => {
  it("역할만 바꾼다", () => {
    const next = changeInviteRole(makeList(), "a", "fe", isLeader);
    expect(next[0]?.roleId).toBe("fe");
    expect(next[0]?.departmentId).toBe("dev");
  });

  /*
    역할과 직급은 짝이 맞아야 한다: **`리더`는 리더 직급하고만** 붙는다.
    ⚠️ 어긋나면 **직급을 비운다.** 막기만 하면 어느 쪽도 못 고치는 줄이 생긴다.
    ⚠️ `없음`은 이제 짝을 안 가린다 — 위의 describe 참고.
  */
  it("리더가 아닌 직급인데 역할을 `리더`로 바꾸면 직급이 비워진다", () => {
    const staff = changeInviteRole(makeList(), "a", "fe", isLeader);
    const next = changeInviteRole(staff, "a", LEADER_ROLE_ID, isLeader);
    expect(next[0]?.roleId).toBe(LEADER_ROLE_ID);
    expect(next[0]?.positionId).toBe("");
  });

  it("리더 직급인데 역할을 고르면 직급이 비워진다", () => {
    const leader = changeInvitePosition(makeList(), "a", "lead", isLeader);
    const next = changeInviteRole(leader, "a", "fe", isLeader);
    expect(next[0]?.roleId).toBe("fe");
    expect(next[0]?.positionId).toBe("");
  });

  it("짝이 맞으면 직급은 그대로다", () => {
    const next = changeInviteRole(makeList(), "a", "fe", isLeader);
    expect(next[0]?.positionId).toBe("staff");
  });
});

describe("changeInviteDepartment — 역할 초기화", () => {
  it("부서를 바꾸면 역할은 비운다 — 다른 부서의 역할이 남으면 안 된다", () => {
    const assigned = changeInviteRole(makeList(), "a", "fe", isLeader);
    const moved = changeInviteDepartment(assigned, "a", "design", isLeader);
    expect(moved[0]?.departmentId).toBe("design");
    expect(moved[0]?.roleId).toBe("");
  });
});

describe("departmentsWithLeader / duplicatedLeaderIds — 부서마다 리더 한 명", () => {
  const isLeader = (positionId: string) => positionId === "lead";
  const row = (id: string, departmentId: string, positionId: string): Invite => ({
    id,
    name: "",
    email: `${id}@company.com`,
    departmentId,
    roleId: "fe",
    positionId,
    isAdmin: false,
    isSent: false,
  });

  /*
    ⚠️ 주소를 안 적었어도 리더 자리는 **차지한다**(2026-08-04 변경).
       전에는 빼고 셌는데, 그러면 리더로 골라 둔 줄을 여러 개 만든 뒤 주소만 채우는 순서로
       한 부서에 리더가 여럿 남았다. 직급은 부서·역할을 고른 뒤에야 열리므로,
       리더로 고른 줄은 주소가 없어도 작정한 줄이다.
  */
  it("주소가 비어도 리더 자리를 차지한다", () => {
    const empty: Invite = {
      id: "a",
      name: "",
      email: "",
      departmentId: "dev",
      roleId: "fe",
      positionId: "lead",
      isAdmin: false,
      isSent: false,
    };
    expect(departmentsWithLeader([empty], isLeader)).toEqual(new Set(["dev"]));
    expect(duplicatedLeaderIds([empty, { ...empty, id: "b" }], isLeader)).toEqual(new Set(["b"]));
  });

  it("리더가 있는 부서를 알려준다", () => {
    const invites = [row("a", "dev", "lead"), row("b", "design", "staff")];
    expect(departmentsWithLeader(invites, isLeader)).toEqual(new Set(["dev"]));
  });

  it("자기 줄은 빼고 센다 — 자기가 리더인 줄에서 다시 리더를 고를 수 있어야 한다", () => {
    const invites = [row("a", "dev", "lead")];
    expect(departmentsWithLeader(invites, isLeader, "a").size).toBe(0);
  });

  it("부서가 다르면 리더가 둘이어도 괜찮다", () => {
    const invites = [row("a", "dev", "lead"), row("b", "design", "lead")];
    expect(duplicatedLeaderIds(invites, isLeader).size).toBe(0);
  });

  it("같은 부서에 리더가 둘이면 뒷줄을 잡는다", () => {
    const invites = [row("a", "dev", "lead"), row("b", "dev", "lead")];
    expect(duplicatedLeaderIds(invites, isLeader)).toEqual(new Set(["b"]));
  });
});

describe("이미 발송한 줄은 고칠 수 없다", () => {
  const sent: Invite[] = [
    {
      id: "a",
      name: "",
      email: "dev1@company.com",
      departmentId: "dev",
      roleId: "fe",
      positionId: "staff",
      isAdmin: false,
      isSent: true,
    },
  ];

  it("메일 주소를 바꾸려 해도 그대로다", () => {
    expect(changeInviteEmail(sent, "a", "other@company.com")[0]?.email).toBe("dev1@company.com");
  });

  it("부서를 바꾸려 해도 그대로다 — 역할도 지워지지 않는다", () => {
    const next = changeInviteDepartment(sent, "a", "design", isLeader)[0];
    expect(next?.departmentId).toBe("dev");
    expect(next?.roleId).toBe("fe");
  });

  it("역할·직급도 그대로다", () => {
    expect(changeInviteRole(sent, "a", "be", isLeader)[0]?.roleId).toBe("fe");
    expect(changeInvitePosition(sent, "a", "lead", isLeader)[0]?.positionId).toBe("staff");
  });
});

describe("같은 주소는 한 번만 나간다", () => {
  const twice: Invite[] = [
    {
      id: "a",
      name: "",
      email: "dev1@company.com",
      departmentId: "dev",
      roleId: "fe",
      positionId: "staff",
      isAdmin: false,
      isSent: false,
    },
    {
      id: "b",
      name: "",
      email: "DEV1@company.com",
      departmentId: "design",
      roleId: "fe",
      positionId: "staff",
      isAdmin: false,
      isSent: false,
    },
  ];

  it("중복 주소는 첫 줄만 발송 대상이다", () => {
    expect(sendableInvites(twice, isLeader).map((invite) => invite.id)).toEqual(["a"]);
  });

  it("발송해도 둘째 줄은 잠기지 않는다 — 아직 안 나갔으니까", () => {
    const next = markInvitesSent(twice, isLeader);
    expect(next[0]?.isSent).toBe(true);
    expect(next[1]?.isSent).toBe(false);
  });

  it("이미 나간 주소를 새 줄에 다시 적어도 나가지 않는다", () => {
    const again: Invite[] = [
      { ...twice[0]!, isSent: true },
      { ...twice[1]!, id: "c" },
    ];
    expect(sendableInvites(again, isLeader)).toHaveLength(0);
  });
});

describe("Admin 겸직 토글", () => {
  const make = (isAdmin: boolean, isSent: boolean): Invite[] => [
    {
      id: "a",
      name: "",
      email: "a@company.com",
      departmentId: "dev",
      roleId: "fe",
      positionId: "staff",
      isAdmin,
      isSent,
    },
  ];

  it("켜고 끌 수 있다", () => {
    expect(toggleInviteAdmin(make(false, false), "a")[0]?.isAdmin).toBe(true);
    expect(toggleInviteAdmin(make(true, false), "a")[0]?.isAdmin).toBe(false);
  });

  it("이미 나간 초대장은 못 바꾼다", () => {
    expect(toggleInviteAdmin(make(false, true), "a")[0]?.isAdmin).toBe(false);
  });

  it("역할·직급은 건드리지 않는다 — 겸직은 그 위에 얹히는 것이다", () => {
    const [next] = toggleInviteAdmin(make(false, false), "a");

    expect(next?.positionId).toBe("staff");
    expect(next?.roleId).toBe("fe");
  });
});

/**
 * 1·2단계로 돌아가 전제를 바꾸면 예약값의 뜻이 사라진다 — 그때 값도 같이 비워야 한다.
 *
 * ⚠️ 전에는 `리더`·`없음`을 검사 없이 통과시켰다. 그래서 규칙이 금지한 조합이 **세 칸이 다 찬
 *    채로** 발송됐고, 역할 칸은 목록에 없는 값이라 `선택`으로 보여 화면과 발송이 다른 말을 했다
 *    (적대적 검토 #163).
 */
describe("remapInvite — 1·2단계 편집분 반영", () => {
  const options = {
    departmentIds: new Set(["dev"]),
    positionIds: new Set(["lead", "staff"]),
    roleIdsOf: (departmentId: string) =>
      departmentId === "dev" ? new Set(["fe"]) : new Set<string>(),
  };
  const row = (patch: Partial<Invite>): Invite => ({
    id: "a",
    name: "",
    email: "a@x.com",
    departmentId: "dev",
    roleId: "",
    positionId: "",
    isAdmin: false,
    isSent: false,
    ...patch,
  });

  it("직급이 리더 권한이면 `리더`가 남는다", () => {
    const next = remapInvite(
      row({ roleId: LEADER_ROLE_ID, positionId: "lead" }),
      options,
      isLeader,
    );
    expect(next.roleId).toBe(LEADER_ROLE_ID);
  });

  it("그 직급이 리더가 아니게 되면 `리더`를 비운다 — `과장 + 리더`가 남지 않는다", () => {
    const notLeader: InviteRules = { isLeaderPosition: () => false, hasRoles: () => true };
    const next = remapInvite(
      row({ roleId: LEADER_ROLE_ID, positionId: "lead" }),
      options,
      notLeader,
    );

    expect(next.roleId).toBe("");
    expect(sendableInvites([next], isLeader)).toEqual([]);
  });

  /*
    ⚠️ 전에는 팀에 역할이 생기면 `없음`을 비웠다 — "고를 수 있는데 안 고른 셈"이라서다.
       이제 `없음`은 어느 팀에서나 **직접 고르는 값**이라(`rolesFor`), 1단계에서 역할이
       늘었다고 사용자가 고른 값을 지우면 안 된다.
  */
  it("팀에 역할이 생겨도 `없음`은 남는다 — 직접 고른 값이다", () => {
    const hasRoles: InviteRules = { isLeaderPosition: () => false, hasRoles: () => true };
    const next = remapInvite(row({ roleId: NO_ROLE_ID, positionId: "staff" }), options, hasRoles);

    expect(next.roleId).toBe(NO_ROLE_ID);
  });

  it("팀에 역할이 없으면 `없음`이 남는다", () => {
    const noRoles: InviteRules = { isLeaderPosition: () => false, hasRoles: () => false };
    const next = remapInvite(row({ roleId: NO_ROLE_ID, positionId: "staff" }), options, noRoles);

    expect(next.roleId).toBe(NO_ROLE_ID);
  });

  it("이미 나간 줄은 건드리지 않는다 — 보낸 내용과 화면이 달라지면 안 된다", () => {
    const sent = row({
      roleId: LEADER_ROLE_ID,
      positionId: "gone",
      departmentId: "gone",
      isSent: true,
    });
    expect(remapInvite(sent, options, isLeader)).toEqual(sent);
  });
});

/*
  적대적 검토(#163)가 잡은 구멍 셋 — 값을 지우지 않기로 하면서 규칙을 검증으로 옮긴 뒤
  실제로 뚫려 있던 자리다. 임시로 확인만 하고 버리면 다시 뚫리므로 여기 남긴다.
*/
describe("발송 검증이 막아야 하는 것들", () => {
  const guardRules: InviteRules = { isLeaderPosition: (p) => p === "lead", hasRoles: () => true };
  const guardRow = (patch: Partial<Invite>): Invite => ({
    id: "x",
    name: "",
    email: "x@z.com",
    departmentId: "A",
    roleId: "fe",
    positionId: "staff",
    isAdmin: false,
    isSent: false,
    ...patch,
  });

  /*
    ⚠️ 목록 순서로만 앞줄을 정상으로 보면, 이미 나간 리더 줄이 **뒤에** 있을 때 그 줄이
       중복으로 찍히고 새 줄이 통과한다 — 나간 초대장은 고칠 수 없으니 자리는 그쪽 것이다.
  */
  it("이미 나간 리더 줄이 목록 뒤에 있어도 자리를 지킨다", () => {
    const list = [
      guardRow({
        id: "new",
        roleId: LEADER_ROLE_ID,
        positionId: "lead",
        email: "n@z.com",
      }),
      guardRow({
        id: "sent",
        roleId: LEADER_ROLE_ID,
        positionId: "lead",
        email: "s@z.com",
        isSent: true,
      }),
    ];

    expect([...duplicatedLeaderIds(list, guardRules.isLeaderPosition)]).toEqual(["new"]);
    expect(sendableInvites(list, guardRules)).toEqual([]);
  });

  /*
    ⚠️ 2단계로 돌아가 직급 권한을 **올리는** 방향. 내리는 방향은 `remapInvite`가 막고 있었는데
       올리는 방향이 비어 있어서 `리더 직급 + 일반 역할`이 세 칸이 다 찬 채로 나갔다.
  */
  it("직급 권한을 Leader로 올리면 `리더 직급 + 일반 역할`은 안 나간다", () => {
    expect(
      sendableInvites([guardRow({ id: "r", roleId: "fe", positionId: "lead" })], guardRules),
    ).toEqual([]);
  });

  it("리더 있는 팀으로 옮겨도 값은 남고 발송만 막힌다", () => {
    const base = [
      guardRow({ id: "a", roleId: LEADER_ROLE_ID, positionId: "lead", email: "a@z.com" }),
      guardRow({
        id: "b",
        departmentId: "B",
        roleId: LEADER_ROLE_ID,
        positionId: "lead",
        email: "b@z.com",
      }),
    ];

    const moved = changeInviteDepartment(base, "b", "A", guardRules);

    expect(moved[1]?.positionId).toBe("lead");
    expect(sendableInvites(moved, guardRules).map((invite) => invite.id)).toEqual(["a"]);
  });
});
