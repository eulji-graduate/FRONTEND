import { render } from "@testing-library/react";

import { AUTHORITY } from "@/constants/authority";
import { MEMBER_STATUS } from "@/constants/member";

import type { OrgMember } from "../org-types";
import { OrgMemberNode } from "./org-member-node";

/**
 * 직급·역할 줄 회귀 테스트.
 *
 * ⚠️ **`없음`은 화면에 안 그린다**(2026-08-19, 사용자 판단 — 카드형 자리에서 대부분의
 *    카드에 반복돼 거슬린다는 이유). 매퍼는 여전히 `roleLabel: "없음"`을 채워 주지만
 *    (§org-types), 이 컴포넌트가 그 값을 숨긴다 — 값 자체가 없다는 뜻이 아니다.
 */

function makeMember(overrides: Partial<OrgMember> = {}): OrgMember {
  return {
    id: 1,
    name: "안현",
    position: "",
    roleLabel: "없음",
    authority: AUTHORITY.OWNER,
    status: MEMBER_STATUS.ACTIVE,
    ...overrides,
  };
}

describe("OrgMemberNode — 직급·역할 줄", () => {
  it("직급도 역할도 없으면(Owner) 둘째 줄 자체를 안 그린다", () => {
    const { container } = render(<OrgMemberNode member={makeMember()} keyword="" />);

    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("직급만 있고 역할이 '없음'이면(Leader) 직급만 적고 가운뎃점·'없음'은 안 그린다", () => {
    const { container } = render(
      <OrgMemberNode
        member={makeMember({ position: "팀장", authority: AUTHORITY.LEADER })}
        keyword=""
      />,
    );

    const p = container.querySelector("p");
    expect(p).toHaveTextContent("팀장");
    expect(p?.textContent?.trim()).toBe("팀장");
  });

  it("직급·역할이 둘 다 있으면(Member) '직급 · 역할'을 그대로 적는다", () => {
    const { container } = render(
      <OrgMemberNode
        member={makeMember({
          position: "선임",
          roleLabel: "프론트엔드",
          authority: AUTHORITY.MEMBER,
        })}
        keyword=""
      />,
    );

    expect(container.querySelector("p")).toHaveTextContent("선임 · 프론트엔드");
  });

  it("직급 없이 역할만 있으면 가운뎃점 없이 역할만 적는다", () => {
    const { container } = render(
      <OrgMemberNode
        member={makeMember({ position: "", roleLabel: "프론트엔드", authority: AUTHORITY.MEMBER })}
        keyword=""
      />,
    );

    const p = container.querySelector("p");
    expect(p?.textContent?.trim()).toBe("프론트엔드");
  });
});
