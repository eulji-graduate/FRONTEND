import { type FindPasswordDraft, validateFindPassword } from "./find-password";

const FILLED: FindPasswordDraft = { companyCode: "NOVA-7K3D", email: "hayun@zgroup.co.kr" };

describe("validateFindPassword", () => {
  it("다 채우면 오류가 없다", () => {
    expect(validateFindPassword(FILLED)).toEqual({});
  });

  it("기업 코드가 비면 잡아낸다", () => {
    expect(validateFindPassword({ ...FILLED, companyCode: "" }).companyCode).toBe(
      "기업 코드를 입력해 주세요",
    );
  });

  it("이메일이 비면 잡아낸다", () => {
    expect(validateFindPassword({ ...FILLED, email: "" }).email).toBe("이메일을 입력해 주세요");
  });

  it("@가 없으면 잡아낸다", () => {
    expect(validateFindPassword({ ...FILLED, email: "hayun" }).email).toBe(
      "이메일 주소를 다시 확인해 주세요",
    );
  });
});
