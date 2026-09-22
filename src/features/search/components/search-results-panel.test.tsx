jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams("q=로드맵"),
}));

import { render, screen } from "@testing-library/react";

import type { ProjectBrowseItem, SearchQuery, SearchResults } from "../types";
import { SEARCH_CATEGORY, SEARCH_PERIOD } from "../types";
import { SearchResultsPanel } from "./search-results-panel";

/**
 * 결과 화면이 **못 하는 일을 권하지 않는지** 지킨다.
 *
 * 두 문장 다 실제로는 아무것도 안 바뀌는 조작을 시키고 있었다(§정직성 — #455와 같은 결):
 * ① 잘렸을 때 "탭으로 종류를 골라 주세요" — 서버는 늘 `type=ALL` 한 번이고 상한도 종류마다
 *    걸려서, 탭을 바꿔도 같은 줄이 그대로다.
 * ② 결과가 없을 때 "필터를 전체로 바꿔 주세요" — 서버가 `tags`·`from`·`to`를 아직 안 걸러서
 *    (`filtersApplied: false`) 필터를 바꿔도 한 줄도 안 변한다.
 */

const PROJECTS: ProjectBrowseItem[] = [{ id: 3, name: "굿즈 앱", tag: "GOODS", meetingCount: 7 }];

const QUERY: SearchQuery = {
  keyword: "로드맵",
  category: SEARCH_CATEGORY.ALL,
  projectTag: null,
  period: SEARCH_PERIOD.ALL,
};

function renderPanel(results: Partial<SearchResults>) {
  render(
    <SearchResultsPanel
      results={{
        keyword: "로드맵",
        counts: { total: 65, meeting: 60, action: 5, project: 0, person: 0 },
        items: [],
        cap: null,
        filtersApplied: true,
        ...results,
      }}
      query={QUERY}
      projects={PROJECTS}
      baseParams={new URLSearchParams("q=로드맵")}
    />,
  );
}

describe("SearchResultsPanel — 상한 안내", () => {
  it("잘렸으면 검색어를 좁히라고만 한다 — 탭을 바꿔도 더 나오지 않는다", () => {
    renderPanel({
      items: [
        {
          kind: "MEETING",
          id: 11,
          title: "로드맵 점검",
          snippet: null,
          project: "GOODS",
          date: null,
          role: null,
        },
      ],
      cap: { total: 65, shown: 55 },
    });

    expect(screen.getByText(/나머지를 보려면 검색어를 좁혀 주세요/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/탭으로 종류를 골라/);
  });

  it("잘렸으면 몇 건 중 몇 건인지 머리에 적는다", () => {
    renderPanel({ cap: { total: 65, shown: 55 } });

    expect(screen.getByText("전체 65건 중 55건")).toBeInTheDocument();
  });
});

describe("SearchResultsPanel — 결과 없음", () => {
  it("서버가 필터를 안 걸면 필터를 바꾸라고 하지 않는다", () => {
    renderPanel({ items: [], filtersApplied: false });

    expect(screen.getByText("다른 검색어로 찾아 주세요.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/필터를 전체로/);
  });

  it("서버가 필터를 걸면(목) 필터를 되돌리는 길을 알려 준다", () => {
    renderPanel({ items: [], filtersApplied: true });

    expect(screen.getByText("다른 검색어로 찾거나 필터를 전체로 바꿔 주세요.")).toBeInTheDocument();
  });
});
