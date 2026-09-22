import { getCalendarHeight } from "./calendar-height";

// 2027-04은 5주, 2027-05는 6주짜리 달로 확인된 고정 픽스처(date-fns+ko 로케일 기준).
describe("캘린더 높이 계산", () => {
  it("5주짜리 달은 5를 곱한다", () => {
    expect(getCalendarHeight(new Date(2027, 3, 1))).toContain("+ 5 *");
  });

  it("6주짜리 달은 6을 곱한다 — 기존 행 높이는 그대로 두고 한 행만 더한다", () => {
    expect(getCalendarHeight(new Date(2027, 4, 1))).toContain("+ 6 *");
  });

  it("두 경우 모두 한 행의 높이 계산식(5주 기준선)은 같다", () => {
    const rowHeightFragment = "(calc(100vh - 216px) - 37px) / 5";
    expect(getCalendarHeight(new Date(2027, 3, 1))).toContain(rowHeightFragment);
    expect(getCalendarHeight(new Date(2027, 4, 1))).toContain(rowHeightFragment);
  });
});
