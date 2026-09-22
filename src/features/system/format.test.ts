import { formatCompactKrw } from "./format";

describe("금액 축약 표기", () => {
  it("백만 단위는 M로 줄인다", () => {
    expect(formatCompactKrw(8_400_000)).toBe("₩8.4M");
  });

  it("소수점이 0이면 떼어낸다", () => {
    expect(formatCompactKrw(8_000_000)).toBe("₩8M");
  });

  it("억 단위는 억으로 줄인다", () => {
    expect(formatCompactKrw(120_000_000)).toBe("₩1.2억");
  });

  it("천 단위는 K로 줄인다", () => {
    expect(formatCompactKrw(8_400)).toBe("₩8.4K");
  });

  it("천 미만은 그대로 자릿점만 붙인다", () => {
    expect(formatCompactKrw(0)).toBe("₩0");
  });
});
