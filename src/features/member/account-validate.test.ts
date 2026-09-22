import { AUTHORITY } from "@/constants/authority";

import { isEmailTaken, validateAccount } from "./account-validate";
import type { AccountDraft } from "./manage-types";

/**
 * 계정 발급 검증 — **서버가 마지막으로 보는 곳**이다.
 * 화면이 막는 것들이지만 액션은 주소만 알면 직접 부를 수 있다(§권한).
 */

const VALID: AccountDraft = {
  name: "홍길동",
  email: "gildong@zgroup.co.kr",
  teamName: "개발팀",
  position: "사원",
  authority: AUTHORITY.MEMBER,
  isAdmin: false,
  roleId: null,
};

describe("validateAccount", () => {
  it("다 채운 값은 오류가 없다", () => {
    expect(validateAccount(VALID)).toEqual({});
  });

  it.each(["name", "teamName", "position"] as const)("%s는 공백만 적으면 막는다", (field) => {
    expect(validateAccount({ ...VALID, [field]: "   " })[field]).toBeTruthy();
  });

  it("이메일이 비면 막는다", () => {
    expect(validateAccount({ ...VALID, email: "" }).email).toBe("이메일을 입력해 주세요");
  });

  /*
    ⚠️ 정규식으로 조이지 않는다(신청 화면과 같은 규칙). 회사 메일 형식이 특이한 곳에서
       멀쩡한 주소가 막히면 계정을 못 만든다 — 진짜 검증은 발송이 한다.
  */
  it("@가 없으면 막지만, 특이한 주소는 통과시킨다", () => {
    expect(validateAccount({ ...VALID, email: "gildong" }).email).toBeTruthy();
    expect(validateAccount({ ...VALID, email: "a+b@sub.도메인.한국" }).email).toBeUndefined();
  });

  /*
    ⚠️ **Owner는 발급 대상이 아니다**(WORKFLOW §11). 막지 않으면 대표가 둘인 회사가 생기고,
       그 계정은 기업 설정·최종 승인까지 전부 열린다.
  */
  it("Owner 권한으로는 발급하지 못한다", () => {
    expect(validateAccount({ ...VALID, authority: AUTHORITY.OWNER }).authority).toBeTruthy();
  });

  it("Leader는 발급할 수 있다", () => {
    expect(validateAccount({ ...VALID, authority: AUTHORITY.LEADER })).toEqual({});
  });
});

describe("isEmailTaken", () => {
  const existing = ["ceo@zgroup.co.kr", "Hayun@zgroup.co.kr"];

  it("같은 주소면 잡는다", () => {
    expect(isEmailTaken("ceo@zgroup.co.kr", existing)).toBe(true);
  });

  /* ⚠️ 대소문자를 가리지 않는다 — 두 주소는 같은 사람에게 간다 */
  it("대소문자가 달라도 같은 주소로 본다", () => {
    expect(isEmailTaken("HAYUN@zgroup.co.kr", existing)).toBe(true);
  });

  it("앞뒤 공백은 무시한다", () => {
    expect(isEmailTaken("  ceo@zgroup.co.kr ", existing)).toBe(true);
  });

  it("없는 주소는 통과시킨다", () => {
    expect(isEmailTaken("new@zgroup.co.kr", existing)).toBe(false);
  });
});
