import {
  appendChild,
  countDepartments,
  createDepartment,
  departmentRoles,
  findNode,
  findSiblings,
  flattenDepartments,
  moveNodeTo,
  nextAvailableName,
  removeDepartment,
  renameDepartment,
  rootDepartments,
} from "./tree";
import { demoteNode, promoteNode, shiftNode } from "./tree-keyboard";
import type { DepartmentNode } from "./types";

/**
 * 개발팀
 * ├─ 프론트엔드
 * └─ 백엔드
 * 디자인팀
 * 경영지원
 * └─ 인사
 */
const makeTree = (): DepartmentNode[] => [
  {
    id: "dev",
    name: "개발팀",
    children: [
      { id: "fe", name: "프론트엔드", children: [] },
      { id: "be", name: "백엔드", children: [] },
    ],
  },
  { id: "design", name: "디자인팀", children: [] },
  { id: "ops", name: "경영지원", children: [{ id: "hr", name: "인사", children: [] }] },
];

const names = (nodes: DepartmentNode[]) => flattenDepartments(nodes).map((row) => row.name);
const childrenOf = (nodes: DepartmentNode[], id: string) =>
  (findNode(nodes, id)?.children ?? []).map((node) => node.name);

describe("countDepartments", () => {
  it("하위까지 모두 센다", () => {
    expect(countDepartments(makeTree())).toBe(6);
  });

  it("빈 트리는 0이다", () => {
    expect(countDepartments([])).toBe(0);
  });
});

describe("createDepartment", () => {
  it("이름을 그대로 쓰고 하위 없이 만든다", () => {
    const node = createDepartment("영업팀");
    expect(node.name).toBe("영업팀");
    expect(node.children).toEqual([]);
    expect(node.id).toEqual(expect.any(String));
  });
});

describe("nextAvailableName", () => {
  it("겹치지 않으면 그대로 쓴다", () => {
    expect(nextAvailableName(makeTree(), "새 하위 부서")).toBe("새 하위 부서");
  });

  it("겹치면 2부터 번호를 붙인다", () => {
    const siblings = [createDepartment("새 하위 부서")];
    expect(nextAvailableName(siblings, "새 하위 부서")).toBe("새 하위 부서 2");
  });

  it("이미 쓰인 번호는 건너뛴다", () => {
    const siblings = [createDepartment("새 하위 부서"), createDepartment("새 하위 부서 2")];
    expect(nextAvailableName(siblings, "새 하위 부서")).toBe("새 하위 부서 3");
  });
});

describe("appendChild / renameDepartment / removeDepartment", () => {
  it("하위를 맨 뒤에 붙인다", () => {
    const next = appendChild(makeTree(), "dev", createDepartment("플랫폼"));
    expect(childrenOf(next, "dev")).toEqual(["프론트엔드", "백엔드", "플랫폼"]);
  });

  it("이름만 바꾸고 구조는 그대로 둔다", () => {
    const next = renameDepartment(makeTree(), "fe", "웹프론트");
    expect(findNode(next, "fe")?.name).toBe("웹프론트");
    expect(countDepartments(next)).toBe(6);
  });

  it("지우면 하위도 함께 사라진다", () => {
    const next = removeDepartment(makeTree(), "dev");
    expect(names(next)).toEqual(["디자인팀", "경영지원", "인사"]);
  });

  it("원본을 바꾸지 않는다", () => {
    const original = makeTree();
    removeDepartment(original, "dev");
    expect(countDepartments(original)).toBe(6);
  });
});

describe("findNode / findSiblings", () => {
  it("하위에 있는 것도 찾는다", () => {
    expect(findNode(makeTree(), "hr")?.name).toBe("인사");
  });

  it("없으면 null이다", () => {
    expect(findNode(makeTree(), "없는id")).toBeNull();
  });

  it("부모가 null이면 최상위 목록을 준다", () => {
    expect(findSiblings(makeTree(), null).map((node) => node.name)).toEqual([
      "개발팀",
      "디자인팀",
      "경영지원",
    ]);
  });

  it("부모 id를 주면 그 하위 목록을 준다", () => {
    expect(findSiblings(makeTree(), "dev").map((node) => node.name)).toEqual([
      "프론트엔드",
      "백엔드",
    ]);
  });
});

describe("shiftNode", () => {
  it("최상위끼리 순서를 바꾼다", () => {
    const next = shiftNode(makeTree(), "design", -1);
    expect(next.map((node) => node.name)).toEqual(["디자인팀", "개발팀", "경영지원"]);
  });

  it("하위끼리도 순서를 바꾼다", () => {
    const next = shiftNode(makeTree(), "be", -1);
    expect(childrenOf(next, "dev")).toEqual(["백엔드", "프론트엔드"]);
  });

  it("끝에서 더 나가면 그대로 둔다", () => {
    const tree = makeTree();
    expect(shiftNode(tree, "dev", -1)).toEqual(tree);
    expect(shiftNode(tree, "ops", 1)).toEqual(tree);
  });
});

describe("moveNodeTo", () => {
  it("다른 상위 부서의 하위로 옮긴다", () => {
    const next = moveNodeTo(makeTree(), "hr", "dev", "inside");
    expect(childrenOf(next, "dev")).toEqual(["프론트엔드", "백엔드", "인사"]);
    expect(childrenOf(next, "ops")).toEqual([]);
  });

  it("대상 앞/뒤에 형제로 끼운다", () => {
    const before = moveNodeTo(makeTree(), "hr", "design", "before");
    expect(before.map((node) => node.name)).toEqual(["개발팀", "인사", "디자인팀", "경영지원"]);

    const after = moveNodeTo(makeTree(), "hr", "design", "after");
    expect(after.map((node) => node.name)).toEqual(["개발팀", "디자인팀", "인사", "경영지원"]);
  });

  it("자기 자신으로는 옮기지 않는다", () => {
    const tree = makeTree();
    expect(moveNodeTo(tree, "dev", "dev", "inside")).toEqual(tree);
  });

  it("자기 하위로는 옮기지 않는다 — 트리가 끊긴다", () => {
    const tree = makeTree();
    expect(moveNodeTo(tree, "dev", "fe", "inside")).toEqual(tree);
  });

  it("옮겨도 전체 개수는 그대로다", () => {
    expect(countDepartments(moveNodeTo(makeTree(), "hr", "dev", "inside"))).toBe(6);
  });
});

describe("promoteNode", () => {
  it("하위를 최상위로 빼내고 원래 부모 바로 뒤에 둔다", () => {
    const next = promoteNode(makeTree(), "fe");
    expect(next.map((node) => node.name)).toEqual(["개발팀", "프론트엔드", "디자인팀", "경영지원"]);
    expect(childrenOf(next, "dev")).toEqual(["백엔드"]);
  });

  it("이미 최상위면 그대로 둔다", () => {
    const tree = makeTree();
    expect(promoteNode(tree, "dev")).toEqual(tree);
  });
});

describe("demoteNode", () => {
  it("바로 위 형제의 하위로 넣는다", () => {
    const next = demoteNode(makeTree(), "design");
    expect(next.map((node) => node.name)).toEqual(["개발팀", "경영지원"]);
    expect(childrenOf(next, "dev")).toEqual(["프론트엔드", "백엔드", "디자인팀"]);
  });

  it("맨 앞이면 내려갈 곳이 없다", () => {
    const tree = makeTree();
    expect(demoteNode(tree, "dev")).toEqual(tree);
  });

  it("하위를 가진 부서는 내리지 않는다 — 3계층이 된다", () => {
    const tree = makeTree();
    expect(demoteNode(tree, "ops")).toEqual(tree);
  });
});

describe("flattenDepartments", () => {
  it("깊이를 붙여 평탄화한다", () => {
    expect(flattenDepartments(makeTree())).toEqual([
      { id: "dev", name: "개발팀", depth: 0 },
      { id: "fe", name: "프론트엔드", depth: 1 },
      { id: "be", name: "백엔드", depth: 1 },
      { id: "design", name: "디자인팀", depth: 0 },
      { id: "ops", name: "경영지원", depth: 0 },
      { id: "hr", name: "인사", depth: 1 },
    ]);
  });
});

describe("rootDepartments / departmentRoles", () => {
  it("부서는 트리 윗단만 준다", () => {
    expect(rootDepartments(makeTree()).map((option) => option.name)).toEqual([
      "개발팀",
      "디자인팀",
      "경영지원",
    ]);
  });

  it("그 부서 안의 역할을 준다", () => {
    expect(departmentRoles(makeTree(), "dev").map((option) => option.name)).toEqual([
      "프론트엔드",
      "백엔드",
    ]);
  });

  it("역할이 없는 부서는 빈 목록이다 — 화면에서 '없음'만 고를 수 있다", () => {
    expect(departmentRoles(makeTree(), "design")).toEqual([]);
  });

  it("없는 부서를 물으면 빈 목록이다", () => {
    expect(departmentRoles(makeTree(), "없는id")).toEqual([]);
  });
});
