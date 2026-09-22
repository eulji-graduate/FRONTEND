import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ScreenScaleCard } from "./screen-scale-card";

/**
 * 배율 라디오 그룹의 **키보드 계약**을 지킨다.
 *
 * ⚠️ `role="radiogroup"`이라고만 하고 방향키를 안 붙이면 스크린 리더 사용자가 배율을
 *    못 바꾼다. 탭은 선택된 칸 하나에만 멈추고(roving tabindex), 방향키로 옮긴다.
 */
describe("ScreenScaleCard 키보드", () => {
  beforeEach(() => localStorage.clear());

  const radios = () => screen.getAllByRole("radio");
  const checked = () => radios().find((r) => r.getAttribute("aria-checked") === "true");

  it("선택된 칸만 탭에 걸린다(roving tabindex)", async () => {
    render(<ScreenScaleCard />);

    // 구독이 microtask로 초기값을 알린 뒤에 본다
    await waitFor(() => expect(checked()).toBeInTheDocument());

    for (const radio of radios()) {
      const expected = radio.getAttribute("aria-checked") === "true" ? "0" : "-1";
      expect(radio).toHaveAttribute("tabindex", expected);
    }
  });

  /*
    ⚠️ **100%에서 시작하면 안 된다.** 100%가 목록의 마지막이라 오른쪽을 눌러도 제자리다 —
       전후를 둘 다 `100%`로 적어 두면 아무것도 확인하지 못한다(적대적 검토에서 잡혔다).
       한 칸 내려가서 눌러야 "다음으로 간다"가 검증된다.
  */
  it("오른쪽 방향키로 다음 배율을 고른다", async () => {
    const user = userEvent.setup();
    render(<ScreenScaleCard />);

    await user.click(screen.getByRole("radio", { name: "90%" }));
    await user.keyboard("{ArrowRight}");

    expect(checked()).toHaveTextContent("100%");
    // 포커스도 새 칸으로 옮겨 간다 — 안 그러면 다음 방향키가 안 먹는다
    expect(checked()).toHaveFocus();
  });

  /* ⚠️ 끝에서 돌지 않는다(clamp) — 가장 큰 값의 다음이 가장 작은 값이 되면 방향 감각이 깨진다 */
  it("마지막 배율에서 오른쪽을 눌러도 제자리다", async () => {
    const user = userEvent.setup();
    render(<ScreenScaleCard />);

    checked()?.focus();
    await user.keyboard("{ArrowRight}");

    expect(checked()).toHaveTextContent("100%");
  });

  it("왼쪽 방향키로 이전 배율을 고른다", async () => {
    const user = userEvent.setup();
    render(<ScreenScaleCard />);

    checked()?.focus();
    await user.keyboard("{ArrowLeft}");

    expect(checked()).toHaveTextContent("90%");
  });

  it("클릭으로도 고를 수 있다 — 방향키는 대체 경로다", async () => {
    const user = userEvent.setup();
    render(<ScreenScaleCard />);

    await user.click(screen.getByRole("radio", { name: "80%" }));

    expect(checked()).toHaveTextContent("80%");
  });
});
