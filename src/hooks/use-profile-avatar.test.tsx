import { render } from "@testing-library/react";

import { pickPaletteColor } from "@/lib/palette";

import { useProfileAvatar } from "./use-profile-avatar";

/**
 * 아바타가 지키는 것 — **같은 사람은 어느 화면에서든 같은 색**이다.
 *
 * ⚠️ 전에는 부르는 쪽이 두 번째 인자를 마음대로 넘겨서(`name+id` / `name+department`)
 *    같은 사람이 팀 대시보드와 오너 대시보드에서 다른 색으로 나왔다. 그 회귀를 막는다.
 */

function Probe({ id, size }: { id: string | number; size?: number }) {
  return useProfileAvatar(id, size);
}

const circleOf = (id: string | number, size?: number) =>
  render(<Probe id={id} size={size} />).container.firstElementChild as HTMLElement;

describe("useProfileAvatar", () => {
  it("같은 id는 언제나 같은 색이다 — 새로고침해도 그 사람은 그 색이다", () => {
    const first = circleOf(7).style.backgroundColor;
    const second = circleOf(7).style.backgroundColor;

    expect(first).toBe(second);
    expect(first).toBeTruthy();
  });

  it("숫자 id와 문자열 id를 같게 본다 — BE가 어느 쪽을 주든 색이 안 바뀐다", () => {
    expect(circleOf(7).style.backgroundColor).toBe(circleOf("7").style.backgroundColor);
  });

  it("id가 다르면 팔레트에서 고른 값이 각자 나온다", () => {
    // ⚠️ "서로 다르다"고 단언하지 않는다 — 열한 색뿐이라 겹치는 게 정상이다(palette.ts)
    expect(circleOf(1).style.backgroundColor).toBe(pickPaletteColor("1").bgColor);
    expect(circleOf(2).style.backgroundColor).toBe(pickPaletteColor("2").bgColor);
  });

  /*
    ⚠️ 색은 **CSS 변수 이름**이어야 한다. hex가 박히면 다크모드에서 안 따라간다(§디자인 토큰).
  */
  it("색을 hex로 박지 않는다 — 다크모드가 따라와야 한다", () => {
    expect(circleOf(3).style.backgroundColor).toContain("var(--tag-");
  });

  it("크기를 주면 그 지름으로 그린다", () => {
    const circle = circleOf(1, 28);

    expect(circle.style.width).toBe("28px");
    expect(circle.style.height).toBe("28px");
  });

  /*
    ⚠️ 실루엣이 **원 밖으로 삐져나가면 안 된다.** 전에는 어깨가 사다리꼴로 뻗어 양옆이
       뭉텅 잘렸다 — `overflow-hidden`과 `rounded-full`이 같이 있어야 곡선이 다듬는다.
  */
  it("원으로 잘라 낸다 — 실루엣이 모서리로 삐져나가지 않는다", () => {
    const circle = circleOf(1);

    expect(circle.className).toContain("rounded-full");
    expect(circle.className).toContain("overflow-hidden");
  });

  it("장식이라 스크린 리더가 읽지 않는다 — 이름은 옆 글자가 말한다", () => {
    expect(circleOf(1).querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
