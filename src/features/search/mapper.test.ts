import type { BeProjectSummary } from "@/features/project/mapper";

import type { BeSearchResponse } from "./mapper";
import { toProjectFilterOption, toResultCap, toSearchResults } from "./mapper";
import type { SearchCategoryCounts } from "./types";

/** `GET /api/v1/search` 응답 그대로 — 필드 이름·중첩을 BE 실코드(`SearchResponse.java`)에 맞춰 둔다 */
function response(overrides: Partial<BeSearchResponse> = {}): BeSearchResponse {
  return {
    query: "로드맵",
    counts: { all: 3, meeting: 1, action: 1, project: 1, person: 0 },
    results: [
      {
        type: "MEETING",
        id: 11,
        title: "로드맵 점검",
        snippet: "8월 로드맵을 확정했습니다.",
        project: { id: 3, tag: "GOODS", name: "굿즈 앱", color: "#3B82F6" },
        date: "2026-08-10",
        role: null,
        score: 80,
      },
      {
        type: "ACTION",
        id: 21,
        title: "로드맵 문서 정리",
        snippet: null,
        project: { id: 3, tag: "GOODS", name: "굿즈 앱", color: null },
        date: "2026-08-14",
        role: null,
        score: 30,
      },
      {
        type: "PROJECT",
        id: 3,
        title: "굿즈 앱",
        snippet: null,
        project: null,
        date: null,
        role: null,
        score: 20,
      },
    ],
    ...overrides,
  };
}

describe("toSearchResults", () => {
  it("프로젝트 객체에서 태그만 꺼내 쓴다 — 화면 계약은 문구 하나다", () => {
    const results = toSearchResults(response(), "all");

    expect(results.items.map((item) => item.project)).toEqual(["GOODS", "GOODS", null]);
  });

  it("탭을 고르면 그 종류만 남긴다 — 서버는 늘 ALL로 부른다", () => {
    const results = toSearchResults(response(), "action");

    expect(results.items.map((item) => item.id)).toEqual([21]);
  });

  it("탭을 골라도 숫자는 안 흔들린다 — counts는 그대로 넘긴다", () => {
    const results = toSearchResults(response(), "action");

    expect(results.counts).toEqual({ total: 3, meeting: 1, action: 1, project: 1, person: 0 });
  });

  it("모르는 종류는 버린다 — 화면이 못 그리는 값을 흘리지 않는다", () => {
    const be = response();
    const withUnknown: BeSearchResponse = {
      ...be,
      results: [
        ...be.results,
        {
          type: "DOCUMENT",
          id: 99,
          title: "우리가 모르는 종류",
          snippet: null,
          project: null,
          date: null,
          role: null,
          score: 10,
        },
      ],
    };

    expect(toSearchResults(withUnknown, "all").items.map((item) => item.id)).toEqual([11, 21, 3]);
  });

  it("BE 정렬을 그대로 지킨다 — 여기서 다시 정렬하지 않는다", () => {
    const be = response();
    const reversed: BeSearchResponse = { ...be, results: [...be.results].reverse() };

    expect(toSearchResults(reversed, "all").items.map((item) => item.id)).toEqual([3, 21, 11]);
  });

  it("서버가 안 걸러 주는 필터는 걸렀다고 하지 않는다(SR-1)", () => {
    expect(toSearchResults(response(), "all").filtersApplied).toBe(false);
  });

  it("다 받았으면 잘렸다고 하지 않는다", () => {
    expect(toSearchResults(response(), "all").cap).toBeNull();
  });

  it("센 것보다 적게 왔으면 몇 건 중 몇 건인지 알린다(상한에 걸린 경우)", () => {
    const capped = toSearchResults(
      response({ counts: { all: 128, meeting: 60, action: 60, project: 8, person: 0 } }),
      "all",
    );

    expect(capped.cap).toEqual({ total: 128, shown: 3 });
  });

  it("잘림 판정은 지금 탭 기준이다 — 다른 종류가 많아도 그 탭이 다 왔으면 안 알린다", () => {
    const results = toSearchResults(
      response({ counts: { all: 128, meeting: 60, action: 1, project: 67, person: 0 } }),
      "action",
    );

    expect(results.cap).toBeNull();
  });
});

describe("toResultCap", () => {
  const counts: SearchCategoryCounts = {
    total: 70,
    meeting: 50,
    action: 20,
    project: 0,
    person: 0,
  };

  it("전체 탭은 4종 합계와 견준다", () => {
    expect(toResultCap(counts, "all", 60)).toEqual({ total: 70, shown: 60 });
  });

  it("종류 탭은 그 종류 건수와 견준다", () => {
    expect(toResultCap(counts, "meeting", 50)).toBeNull();
    expect(toResultCap(counts, "meeting", 40)).toEqual({ total: 50, shown: 40 });
  });

  it("결과가 아예 없으면 잘린 것이 아니다 — 빈 목록과 잘린 목록은 다르다", () => {
    expect(toResultCap({ total: 0, meeting: 0, action: 0, project: 0, person: 0 }, "all", 0)).toBe(
      null,
    );
  });
});

describe("toProjectFilterOption", () => {
  /** `GET /api/projects`의 `PageResponse.content[]` 한 줄 — 필터가 쓰는 값만 확인한다 */
  const project: BeProjectSummary = {
    id: 3,
    tag: "GOODS",
    color: "#3B82F6",
    name: "굿즈 앱",
    description: "굿즈 커머스",
    status: "IN_PROGRESS",
    startDate: "2026-07-01",
    dueDate: "2026-09-30",
    teamCount: 2,
    actionCount: 10,
    completedActionCount: 4,
    meetingCount: 7,
    progressPct: 40,
    teamNames: ["개발팀", "디자인팀"],
  };

  it("필터·둘러보기가 쓰는 값만 옮긴다", () => {
    expect(toProjectFilterOption(project)).toEqual({
      id: 3,
      tag: "GOODS",
      name: "굿즈 앱",
      meetingCount: 7,
    });
  });
});
