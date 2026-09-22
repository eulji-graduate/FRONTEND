import { render, screen } from "@testing-library/react";

import { AccessDenied } from "./access-denied";

/**
 * 403 화면이 **404와 다른 말을 하는지**를 본다.
 *
 * ⚠️ 겉모습이 아니라 두 가지를 단언한다: ① 없는 화면이 아니라 **권한**이 없다고 말하는가,
 *    ② 막다른 길에서 **나갈 문**이 있는가(§404 화면과 같은 판단).
 */
describe("AccessDenied", () => {
  it("없는 화면이 아니라 권한이 없다고 말한다", () => {
    render(<AccessDenied homeHref="/my" />);

    expect(screen.getByText("접근 권한이 없습니다")).toBeInTheDocument();
    // 404 문구가 섞여 들면 화면이 두 말을 한다
    expect(screen.queryByText(/찾을 수 없습니다/)).not.toBeInTheDocument();
  });

  it("돌아갈 곳을 준다 — 권한마다 집이 다르다", () => {
    render(<AccessDenied homeHref="/team" />);

    expect(screen.getByRole("link", { name: "내 대시보드로 가기" })).toHaveAttribute(
      "href",
      "/team",
    );
  });
});
