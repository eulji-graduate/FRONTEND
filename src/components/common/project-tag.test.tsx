/**
 * `ProjectTag` — 색 소스가 두 갈래인 것을 못박는다.
 *
 * ⚠️ 프로젝트 목록·상세는 저장된 팔레트 이름(`color` prop)을 넘긴다 — 해시로 다시 뽑지 않는다.
 * ⚠️ 회의·액션 응답에는 프로젝트 색이 없어 `color`를 안 넘긴다 — 그때는 태그 이름 해시로
 *    떨어진다(같은 태그가 같은 색이라 화면끼리는 여전히 일관된다).
 */
import { render, screen } from "@testing-library/react";

import { ProjectTag } from "./project-tag";

describe("ProjectTag — color prop 유무", () => {
  it("color를 넘기면 그 팔레트 이름의 CSS 변수를 그대로 쓴다", () => {
    render(<ProjectTag tag="아무거나" color="pink" />);
    const el = screen.getByText("아무거나");
    /*
      ⚠️ 인라인 스타일 문자열 안에 `var(--tag-pink-bg)`가 있으면 된다 —
         jsdom은 `getComputedStyle`이 CSS 변수를 풀어내지 못하므로 문자열 자체를 본다.
    */
    expect(el.getAttribute("style") ?? "").toContain("var(--tag-pink-bg)");
    expect(el.getAttribute("style") ?? "").toContain("var(--tag-pink-fg)");
  });

  it("color를 안 넘기면 해시 경로로 떨어진다 — `var(--tag-*)` 어느 하나가 붙는다", () => {
    render(<ProjectTag tag="아무거나" />);
    const el = screen.getByText("아무거나");
    const style = el.getAttribute("style") ?? "";
    /*
      ⚠️ 어떤 이름이 뽑히는지는 해시 함수가 정하므로 특정 색을 못박지 않는다 — 팔레트 밖으로
         새지 않는지, 즉 `var(--tag-*)` 형식으로 온다는 사실만 지킨다.
    */
    expect(style).toMatch(/var\(--tag-[a-z]+-bg\)/);
    expect(style).toMatch(/var\(--tag-[a-z]+-fg\)/);
  });
});
