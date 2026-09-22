import { paginate } from "./paginate";

describe("배열 페이지 자르기", () => {
  const items = Array.from({ length: 23 }, (_, index) => index + 1);

  it("페이지 크기만큼 잘라낸다 — page=0이 첫 페이지다", () => {
    const result = paginate(items, 0, 5);
    expect(result.items).toEqual([1, 2, 3, 4, 5]);
    expect(result.totalCount).toBe(23);
    expect(result.totalPages).toBe(5);
  });

  it("마지막 페이지는 남은 만큼만 담는다", () => {
    const result = paginate(items, 4, 5);
    expect(result.items).toEqual([21, 22, 23]);
  });

  it("범위를 넘는 페이지 요청은 마지막 페이지로 당긴다", () => {
    const result = paginate(items, 999, 5);
    expect(result.page).toBe(4);
    expect(result.items).toEqual([21, 22, 23]);
  });

  it("음수 페이지 요청은 0페이지로 당긴다 — 빈 화면이 뜨면 안 된다", () => {
    expect(paginate(items, -1, 5).page).toBe(0);
    expect(paginate(items, -3, 5).page).toBe(0);
  });

  it("빈 배열이어도 최소 1페이지다", () => {
    const result = paginate([], 0, 5);
    expect(result.totalPages).toBe(1);
    expect(result.items).toEqual([]);
  });
});
