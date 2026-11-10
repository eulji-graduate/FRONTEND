import { AUTHORITY } from "@/constants/authority";

import { pickDefaultPositionName } from "./default-position";

/* #30 — 발급 창이 `팀장`을 기본으로 골라 권한과 직급이 어긋난 계정이 생기던 문제 */
describe("pickDefaultPositionName", () => {
  it("높은 순 목록에서 Member 직급 중 가장 낮은 것(사원)을 고른다", () => {
    expect(
      pickDefaultPositionName([
        { name: "팀장", role: AUTHORITY.LEADER },
        { name: "과장", role: AUTHORITY.MEMBER },
        { name: "대리", role: AUTHORITY.MEMBER },
        { name: "사원", role: AUTHORITY.MEMBER },
      ]),
    ).toBe("사원");
  });

  it("팀장 직급은 기본값이 되지 않는다", () => {
    expect(
      pickDefaultPositionName([
        { name: "팀장", role: AUTHORITY.LEADER },
        { name: "사원", role: AUTHORITY.MEMBER },
      ]),
    ).not.toBe("팀장");
  });

  it("Member 직급이 없으면 마지막 직급, 목록이 비면 빈 값이다", () => {
    expect(pickDefaultPositionName([{ name: "팀장", role: AUTHORITY.LEADER }])).toBe("팀장");
    expect(pickDefaultPositionName([])).toBe("");
  });
});
