import { type ChangePasswordDraft, validateChangePassword } from "./password";

const FILLED: ChangePasswordDraft = {
  currentPassword: "oldPass1!",
  newPassword: "newPass1!",
  newPasswordConfirm: "newPass1!",
};

describe("validateChangePassword", () => {
  it("다 채우고 정책을 지키면 오류가 없다", () => {
    expect(validateChangePassword(FILLED)).toEqual({});
  });

  it("현재 비밀번호가 비면 잡아낸다", () => {
    expect(validateChangePassword({ ...FILLED, currentPassword: "" }).currentPassword).toBe(
      "현재 비밀번호를 입력해 주세요",
    );
  });

  it("길이가 8자 미만이면 잡아낸다", () => {
    expect(
      validateChangePassword({ ...FILLED, newPassword: "ab1!", newPasswordConfirm: "ab1!" })
        .newPassword,
    ).toBe("비밀번호는 8~16자이며 영문, 숫자, 특수문자를 모두 포함해야 합니다");
  });

  it("길이가 16자를 넘으면 잡아낸다", () => {
    const tooLong = "aB1!aB1!aB1!aB1!a";
    expect(
      validateChangePassword({ ...FILLED, newPassword: tooLong, newPasswordConfirm: tooLong })
        .newPassword,
    ).toBe("비밀번호는 8~16자이며 영문, 숫자, 특수문자를 모두 포함해야 합니다");
  });

  it("특수문자가 없으면 잡아낸다", () => {
    expect(
      validateChangePassword({ ...FILLED, newPassword: "abcd1234", newPasswordConfirm: "abcd1234" })
        .newPassword,
    ).toBe("비밀번호는 8~16자이며 영문, 숫자, 특수문자를 모두 포함해야 합니다");
  });

  it("공백이 있으면 잡아낸다", () => {
    const withSpace = "ab 1234!";
    expect(
      validateChangePassword({ ...FILLED, newPassword: withSpace, newPasswordConfirm: withSpace })
        .newPassword,
    ).toBe("비밀번호는 8~16자이며 영문, 숫자, 특수문자를 모두 포함해야 합니다");
  });

  it("대문자·소문자를 가리지 않는다", () => {
    expect(
      validateChangePassword({
        ...FILLED,
        newPassword: "abcd1234!",
        newPasswordConfirm: "abcd1234!",
      }).newPassword,
    ).toBeUndefined();
  });

  it("새 비밀번호와 확인이 다르면 확인 칸에 오류를 매긴다", () => {
    const errors = validateChangePassword({ ...FILLED, newPasswordConfirm: "different1!" });
    expect(errors.newPasswordConfirm).toBe("새 비밀번호가 일치하지 않습니다");
    expect(errors.newPassword).toBeUndefined();
  });
});
