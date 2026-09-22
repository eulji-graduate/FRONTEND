import { AUTHORITY } from "@/constants/domain";

import {
  blockedRoles,
  changePositionRole,
  createPosition,
  enforceSingleLeader,
  isLeaderTaken,
  movePosition,
  nextAvailablePositionName,
  removePosition,
  renamePosition,
  shiftPosition,
} from "./positions";
import type { Position } from "./types";

const makeList = (): Position[] => [
  { id: "lead", name: "팀장", role: AUTHORITY.LEADER },
  { id: "gwajang", name: "과장", role: AUTHORITY.MEMBER },
  { id: "daeri", name: "대리", role: AUTHORITY.MEMBER },
  { id: "staff", name: "사원", role: AUTHORITY.MEMBER },
];

const names = (positions: Position[]) => positions.map((position) => position.name);
const roleOf = (positions: Position[], id: string) =>
  positions.find((position) => position.id === id)?.role;

describe("createPosition", () => {
  it("이름과 권한을 그대로 쓴다", () => {
    const position = createPosition("차장", AUTHORITY.MEMBER);
    expect(position.name).toBe("차장");
    expect(position.role).toBe(AUTHORITY.MEMBER);
    expect(position.id).toEqual(expect.any(String));
  });
});

describe("nextAvailablePositionName", () => {
  it("겹치지 않으면 그대로 쓴다", () => {
    expect(nextAvailablePositionName(makeList(), "차장")).toBe("차장");
  });

  it("겹치면 2부터 번호를 붙인다", () => {
    expect(nextAvailablePositionName(makeList(), "사원")).toBe("사원 2");
  });

  it("이미 쓰인 번호는 건너뛴다", () => {
    const list = [...makeList(), createPosition("사원 2", AUTHORITY.MEMBER)];
    expect(nextAvailablePositionName(list, "사원")).toBe("사원 3");
  });
});

describe("renamePosition / changePositionRole / removePosition", () => {
  it("이름만 바꾸고 권한은 그대로 둔다", () => {
    const next = renamePosition(makeList(), "staff", "주임");
    expect(names(next)).toEqual(["팀장", "과장", "대리", "주임"]);
    expect(roleOf(next, "staff")).toBe(AUTHORITY.MEMBER);
  });

  it("권한만 바꾼다", () => {
    expect(roleOf(changePositionRole(makeList(), "staff", AUTHORITY.LEADER), "staff")).toBe(
      AUTHORITY.LEADER,
    );
  });

  it("지우면 그 줄만 사라진다", () => {
    expect(names(removePosition(makeList(), "gwajang"))).toEqual(["팀장", "대리", "사원"]);
  });

  it("원본을 바꾸지 않는다", () => {
    const original = makeList();
    removePosition(original, "lead");
    renamePosition(original, "lead", "실장");
    expect(names(original)).toEqual(["팀장", "과장", "대리", "사원"]);
  });
});

describe("shiftPosition", () => {
  it("한 칸 위로 옮긴다", () => {
    expect(names(shiftPosition(makeList(), "daeri", -1))).toEqual(["팀장", "대리", "과장", "사원"]);
  });

  it("맨 끝에서 더 나가면 그대로 둔다", () => {
    const list = makeList();
    expect(shiftPosition(list, "lead", -1)).toEqual(list);
    expect(shiftPosition(list, "staff", 1)).toEqual(list);
  });
});

describe("movePosition", () => {
  it("대상 앞/뒤로 옮긴다", () => {
    expect(names(movePosition(makeList(), "staff", "lead", "before"))).toEqual([
      "사원",
      "팀장",
      "과장",
      "대리",
    ]);
    expect(names(movePosition(makeList(), "lead", "staff", "after"))).toEqual([
      "과장",
      "대리",
      "사원",
      "팀장",
    ]);
  });

  it("자기 자신으로는 옮기지 않는다", () => {
    const list = makeList();
    expect(movePosition(list, "lead", "lead", "before")).toEqual(list);
  });

  it("옮겨도 개수는 그대로다", () => {
    expect(movePosition(makeList(), "staff", "lead", "before")).toHaveLength(4);
  });
});

describe("isLeaderTaken / blockedRoles — 리더는 하나뿐", () => {
  const withLeader = (): Position[] => [
    { id: "lead", name: "팀장", role: AUTHORITY.LEADER },
    { id: "staff", name: "사원", role: AUTHORITY.MEMBER },
  ];

  it("이미 리더가 있으면 다른 줄에서는 못 고른다", () => {
    expect(isLeaderTaken(withLeader(), "staff")).toBe(true);
    expect(blockedRoles(withLeader(), "staff")).toEqual([AUTHORITY.LEADER]);
  });

  it("자기 자신이 리더인 줄은 막지 않는다 — 다시 고를 수 있어야 한다", () => {
    expect(isLeaderTaken(withLeader(), "lead")).toBe(false);
    expect(blockedRoles(withLeader(), "lead")).toEqual([]);
  });

  it("리더가 없으면 아무것도 막지 않는다", () => {
    const allMembers: Position[] = [
      { id: "staff", name: "사원", role: AUTHORITY.MEMBER },
      { id: "daeri", name: "대리", role: AUTHORITY.MEMBER },
    ];
    expect(blockedRoles(allMembers, "staff")).toEqual([]);
  });

  it("리더를 지우면 다시 고를 수 있다", () => {
    expect(isLeaderTaken(removePosition(withLeader(), "lead"))).toBe(false);
  });
});

describe("리더는 한 직급뿐이다 — 보관함 복원", () => {
  it("리더가 둘이면 뒤엣것을 멤버로 낮춘다", () => {
    const restored = enforceSingleLeader([
      { id: "p1", name: "팀장", role: AUTHORITY.LEADER },
      { id: "p2", name: "실장", role: AUTHORITY.LEADER },
      { id: "p3", name: "사원", role: AUTHORITY.MEMBER },
    ]);

    expect(restored.map((position) => position.role)).toEqual([
      AUTHORITY.LEADER,
      AUTHORITY.MEMBER,
      AUTHORITY.MEMBER,
    ]);
  });

  it("리더가 하나뿐이면 그대로 둔다", () => {
    const list = [
      { id: "p1", name: "팀장", role: AUTHORITY.LEADER },
      { id: "p2", name: "사원", role: AUTHORITY.MEMBER },
    ];
    expect(enforceSingleLeader(list)).toEqual(list);
  });
});
