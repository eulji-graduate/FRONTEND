import { type Credentials, validateCredentials } from "./credentials";

const FILLED: Credentials = { email: "owner@nova.com", password: "hunter2" };

describe("validateCredentials", () => {
  it("다 채우면 오류가 없다", () => {
    expect(validateCredentials(FILLED)).toEqual({});
  });

  it("빈 입력은 두 칸 다 잡아낸다", () => {
    expect(validateCredentials({ email: "", password: "" })).toEqual({
      email: "이메일을 입력해 주세요",
      password: "비밀번호를 입력해 주세요",
    });
  });

  it("공백만 넣은 이메일은 빈 것으로 본다", () => {
    expect(validateCredentials({ ...FILLED, email: "   " }).email).toBe("이메일을 입력해 주세요");
  });

  it("이메일은 @가 있어야 한다", () => {
    expect(validateCredentials({ ...FILLED, email: "owner" }).email).toBe(
      "이메일 주소를 다시 확인해 주세요",
    );
  });

  // ⚠️ 비밀번호 **규칙**은 검사하지 않는다 — BE 정책을 모르는 채로 막으면 멀쩡한 계정이 걸린다
  it("짧은 비밀번호도 통과시킨다", () => {
    expect(validateCredentials({ ...FILLED, password: "a" }).password).toBeUndefined();
  });
});
