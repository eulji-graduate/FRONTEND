import { formatBusinessNumber } from "./business-number";

/**
 * 사업자등록번호 굳히기 — **기업 등록 신청과 기업 설정이 같은 함수를 쓴다.**
 * 한쪽만 하이픈을 넣으면 같은 회사의 같은 번호가 화면마다 다르게 보이고, 검증 정규식
 * (`^\d{3}-\d{2}-\d{5}$`)에도 한쪽만 걸린다.
 */
describe("formatBusinessNumber", () => {
  it("열 자리를 000-00-00000 꼴로 굳힌다", () => {
    expect(formatBusinessNumber("1234567890")).toBe("123-45-67890");
  });

  it("적는 도중에도 자리마다 하이픈을 붙인다", () => {
    expect(formatBusinessNumber("12")).toBe("12");
    expect(formatBusinessNumber("123")).toBe("123");
    expect(formatBusinessNumber("1234")).toBe("123-4");
    expect(formatBusinessNumber("123456")).toBe("123-45-6");
  });

  /* ⚠️ 사람은 하이픈·공백·괄호를 섞어 적는다 — 숫자만 남기고 다시 굳힌다 */
  it.each(["123-45-67890", "123 45 67890", "123.45.67890", "(123)45-67890"])(
    "%s처럼 섞어 적어도 같은 값이 된다",
    (input) => {
      expect(formatBusinessNumber(input)).toBe("123-45-67890");
    },
  );

  /* ⚠️ 열 자리에서 멈춘다. 더 적어도 안 늘어나야 검증 정규식에 걸리지 않는다 */
  it("열한 자리째부터는 무시한다", () => {
    expect(formatBusinessNumber("12345678901234")).toBe("123-45-67890");
  });

  it("숫자가 하나도 없으면 빈 값이다", () => {
    expect(formatBusinessNumber("사업자번호")).toBe("");
  });
});
