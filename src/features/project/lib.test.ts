import {
  DEFAULT_PROJECT_SORT,
  PROJECT_DETAIL_TAB,
  PROJECT_SORT,
  PROJECT_STATUS,
} from "@/constants/domain";

import {
  DEFAULT_PROJECT_STATUS,
  getProgressPercent,
  parseProjectDetailTab,
  parseProjectSort,
  parseProjectStatus,
  sortProjects,
  splitDepartments,
} from "./lib";
import type { ProjectListItem } from "./types";

/** 정렬 검증용 최소 프로젝트 — 이름·마감일만 다르게 둔다. */
function project(overrides: Partial<ProjectListItem>): ProjectListItem {
  return {
    id: 1,
    name: "프로젝트",
    description: "",
    tag: "TAG",
    tagColor: "slate",
    departments: [],
    actionTotal: 0,
    actionDone: 0,
    startDate: "2026-08-01",
    dueDate: "2026-09-01",
    status: PROJECT_STATUS.IN_PROGRESS,
    ...overrides,
  };
}

describe("getProgressPercent", () => {
  it("완료/전체를 반올림한 백분율로 준다", () => {
    expect(getProgressPercent(0, 11)).toBe(0);
    expect(getProgressPercent(3, 4)).toBe(75);
    expect(getProgressPercent(1, 3)).toBe(33);
  });

  it("액션이 없으면 0 — 0으로 나누지 않는다", () => {
    expect(getProgressPercent(0, 0)).toBe(0);
  });
});

describe("splitDepartments", () => {
  it("기본 3개까지 노출하고 나머지는 초과 수로 센다", () => {
    expect(splitDepartments(["개발팀", "마케팅팀", "디자인팀", "전략기획팀"])).toEqual({
      visible: ["개발팀", "마케팅팀", "디자인팀"],
      overflow: 1,
    });
  });

  /* 팀이 셋인 프로젝트는 마지막 팀이 `+1` 뒤에 숨지 않는다 — 표로 바뀌며 자리가 생겼다 */
  it("셋이면 그대로 다 보인다", () => {
    expect(splitDepartments(["개발팀", "마케팅팀", "디자인팀"])).toEqual({
      visible: ["개발팀", "마케팅팀", "디자인팀"],
      overflow: 0,
    });
  });

  it("한도 이하면 초과는 0이다", () => {
    expect(splitDepartments(["마케팅팀", "디자인팀"])).toEqual({
      visible: ["마케팅팀", "디자인팀"],
      overflow: 0,
    });
  });
});

describe("parseProjectStatus", () => {
  it("아는 상태 값은 그대로 통과한다", () => {
    expect(parseProjectStatus("TODO")).toBe(PROJECT_STATUS.TODO);
    expect(parseProjectStatus("DONE")).toBe(PROJECT_STATUS.DONE);
  });

  it("모르는 값·빈 값은 기본 탭(진행중)으로", () => {
    expect(parseProjectStatus("nonsense")).toBe(DEFAULT_PROJECT_STATUS);
    expect(parseProjectStatus(undefined)).toBe(PROJECT_STATUS.IN_PROGRESS);
  });
});

describe("parseProjectSort", () => {
  it("아는 정렬 값은 통과, 모르면 기본(마감 임박순)", () => {
    expect(parseProjectSort("NAME")).toBe(PROJECT_SORT.NAME);
    expect(parseProjectSort("nonsense")).toBe(DEFAULT_PROJECT_SORT);
    expect(parseProjectSort(undefined)).toBe(PROJECT_SORT.DUE_ASC);
  });
});

describe("parseProjectDetailTab", () => {
  it("아는 탭 값은 통과, 모르면 기본(기획)", () => {
    expect(parseProjectDetailTab("timeline")).toBe(PROJECT_DETAIL_TAB.TIMELINE);
    expect(parseProjectDetailTab("nonsense")).toBe(PROJECT_DETAIL_TAB.PLAN);
    expect(parseProjectDetailTab(undefined)).toBe(PROJECT_DETAIL_TAB.PLAN);
  });
});

describe("sortProjects", () => {
  const a = project({ id: 1, name: "가나다", dueDate: "2026-09-05" });
  const b = project({ id: 2, name: "다라마", dueDate: "2026-09-01" });
  const c = project({ id: 3, name: "나다라", dueDate: "2026-09-12" });

  it("마감 임박순은 오름차순", () => {
    expect(sortProjects([a, b, c], PROJECT_SORT.DUE_ASC).map((p) => p.id)).toEqual([2, 1, 3]);
  });

  it("이름순은 한글 가나다", () => {
    expect(sortProjects([a, b, c], PROJECT_SORT.NAME).map((p) => p.id)).toEqual([1, 3, 2]);
  });

  it("입력 배열을 건드리지 않는다(불변)", () => {
    const input = [a, b, c];
    sortProjects(input, PROJECT_SORT.NAME);
    expect(input.map((p) => p.id)).toEqual([1, 2, 3]);
  });
});
