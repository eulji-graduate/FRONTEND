/**
 * 프로젝트 목록 서버 페이지네이션 — mock 분기(§목록·페이지네이션).
 *
 * ⚠️ 실서버 분기는 여기서 못 돈다(세션·BE 필요) — 쿼리 파라미터와 봉투 필드명은 `server.ts`의
 *    [확인] 주석이 BE `ProjectController.list`·`global/response/PageResponse.java`와 대조한다.
 *    여기서는 mock이 실서버와 **같은 계약**(0-base page · 서버가 자른다 · 전체 건수는 화면에
 *    그린 줄 수가 아니다)으로 도는지를 못박는다.
 * ⚠️ `action/server.test.ts`와 같은 결로 쓴다 — 두 목록이 같은 훅을 쓰므로 계약이 갈리면
 *    한쪽 화면만 조용히 어긋난다.
 */
import { PROJECT_SORT, PROJECT_STATUS } from "@/constants/domain";

import { getProjectsPage, getProjectStatusCounts } from "./server";

const IN_PROGRESS = { status: PROJECT_STATUS.IN_PROGRESS } as const;

describe("프로젝트 목록 한 페이지 (getProjectsPage)", () => {
  it("고른 상태만 돌려준다 — 탭이 거르는 축이다", async () => {
    const result = await getProjectsPage(IN_PROGRESS, 0, 9999);

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((project) => project.status === PROJECT_STATUS.IN_PROGRESS)).toBe(
      true,
    );
  });

  it("기본 정렬은 마감 임박순 — 서버 정렬(sort=dueDate&order=asc)과 같은 차례다", async () => {
    const result = await getProjectsPage(IN_PROGRESS, 0, 9999);
    const dueDates = result.items.map((project) => project.dueDate);

    expect(dueDates).toEqual([...dueDates].sort((a, b) => a.localeCompare(b)));
  });

  /*
    ⚠️ 이름순은 **2026-08-13에야 서버가 할 수 있게 됐다**(BE `sort=name`, 커밋 `9bd9c010`).
       그 전엔 이것 때문에 전량을 받아 화면에서 정렬했다 — 목도 같은 차례로 굳혀 둬야
       연동하는 날 화면이 안 바뀐다.
  */
  it("이름순을 고르면 이름 차례로 온다", async () => {
    const result = await getProjectsPage({ ...IN_PROGRESS, sort: PROJECT_SORT.NAME }, 0, 9999);
    const names = result.items.map((project) => project.name);

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "ko")));
  });

  it("페이지 크기대로 자르고, totalCount는 화면에 그린 줄 수가 아니라 전체를 센다", async () => {
    const whole = await getProjectsPage(IN_PROGRESS, 0, 9999);
    const first = await getProjectsPage(IN_PROGRESS, 0, 1);

    expect(first.page).toBe(0); // 0-base(BE 표준 확정, 2026-08-10)
    expect(first.items).toHaveLength(1);
    expect(first.totalCount).toBe(whole.totalCount); // 자른다고 전체 건수가 줄지 않는다
    expect(first.totalPages).toBe(whole.totalCount);
  });

  // 이어 붙일 때 같은 줄이 두 번 나오면 안 된다(§목록·페이지네이션: id로 거른다).
  it("다음 페이지는 앞 페이지와 id가 겹치지 않는다", async () => {
    const first = await getProjectsPage(IN_PROGRESS, 0, 1);
    const second = await getProjectsPage(IN_PROGRESS, 1, 1);

    expect(second.page).toBe(1);
    const firstIds = first.items.map((project) => project.id);
    expect(second.items.every((project) => !firstIds.includes(project.id))).toBe(true);
  });

  it("검색어는 이름 부분일치로 좁힌다(대소문자 무시) — BE `keyword`와 같은 뜻", async () => {
    const all = await getProjectsPage(IN_PROGRESS, 0, 9999);
    const target = all.items[0];
    expect(target).toBeDefined();

    const found = await getProjectsPage(
      { ...IN_PROGRESS, keyword: target!.name.slice(0, 2).toUpperCase() },
      0,
      9999,
    );

    expect(found.items.some((project) => project.id === target!.id)).toBe(true);
  });

  it("찾는 게 없으면 빈 목록 — 전체 건수도 0이다", async () => {
    const result = await getProjectsPage({ ...IN_PROGRESS, keyword: "존재하지않는이름zzz" }, 0);

    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
  });
});

describe("상태별 건수 (getProjectStatusCounts)", () => {
  /*
    ⚠️ 배지와 목록이 **같은 조건**을 봐야 한다. 한쪽만 검색어를 빼면 `진행중 4`라고 적힌 탭을
       눌렀는데 2건이 나온다(2026-08-11에 한 번 겪은 자리).
  */
  it("상태별 건수가 그 상태의 목록 전체 건수와 같다", async () => {
    const counts = await getProjectStatusCounts();

    for (const status of [PROJECT_STATUS.TODO, PROJECT_STATUS.IN_PROGRESS, PROJECT_STATUS.DONE]) {
      const page = await getProjectsPage({ status }, 0, 1);
      expect(counts[status]).toBe(page.totalCount);
    }
  });

  it("검색어가 있으면 그 결과 안에서 센다", async () => {
    const counts = await getProjectStatusCounts("존재하지않는이름zzz");

    expect(counts).toEqual({ TODO: 0, IN_PROGRESS: 0, DONE: 0 });
  });
});
