// server.ts는 "server-only"를 import한다 — jest(기본 조건)에선 그 모듈이 던지므로 비운다.
jest.mock("server-only", () => ({}));

import { getSearchHome, getSearchResults } from "./server";
import { SEARCH_CATEGORY, SEARCH_PERIOD } from "./types";

/** 목 분기만 여기서 확인한다(`isMock` 기본값 = 켜짐). 실서버 분기는 매퍼 테스트가 맡는다. */
describe("검색 결과 — 목 분기", () => {
  it("목은 픽스처 전체를 직접 거른다 — 잘릴 일이 없다", async () => {
    const results = await getSearchResults({
      keyword: "로드맵",
      category: SEARCH_CATEGORY.ALL,
      projectTag: null,
      period: SEARCH_PERIOD.ALL,
    });

    expect(results.items.length).toBeGreaterThan(0);
    expect(results.cap).toBeNull();
  });

  it("목은 프로젝트·기간을 직접 거른다 — '반영 안 됨' 안내를 띄우지 않는다", async () => {
    const results = await getSearchResults({
      keyword: "로드맵",
      category: SEARCH_CATEGORY.ALL,
      projectTag: null,
      period: SEARCH_PERIOD.ALL,
    });

    expect(results.filtersApplied).toBe(true);
  });

  it("검색어가 없으면 아무것도 안 묻는다 — 잘림·필터 안내도 없다", async () => {
    const results = await getSearchResults({
      keyword: "   ",
      category: SEARCH_CATEGORY.ALL,
      projectTag: null,
      period: SEARCH_PERIOD.ALL,
    });

    expect(results.items).toEqual([]);
    expect(results.cap).toBeNull();
    expect(results.filtersApplied).toBe(true);
  });
});

describe("검색 랜딩 — 목 분기", () => {
  it("목은 네 칸을 다 채우므로 '서버가 안 준다'고 말하지 않는다", async () => {
    const home = await getSearchHome();

    expect(home.unavailable).toEqual([]);
    expect(home.projects.length).toBeGreaterThan(0);
    expect(home.people.length).toBeGreaterThan(0);
  });
});
