import { render, screen } from "@testing-library/react";

import { ScreenError } from "./screen-error";

/**
 * 오류 화면이 **어디에서 뜨느냐**에 따라 달라지는 두 가지를 묶는다.
 *
 * ⚠️ 겉모습이 아니라 **제목 층위**를 본다. 셸 안에서는 위에 `PageHeader`의 `h1`이 남아 있어서
 *    여기서 또 `h1`을 그리면 한 페이지에 제목이 둘이 된다 — 그러면 이 단언이 깨진다.
 */
describe("ScreenError", () => {
  const noop = () => {};

  it("셸 밖에서는 `h1`이다 — 이 화면이 페이지를 통째로 대체한다", () => {
    render(<ScreenError title="공지를 불러오지 못했습니다" reset={noop} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "공지를 불러오지 못했습니다",
    );
  });

  it("셸 안에서는 `h1`을 쓰지 않는다 — 상단바의 `h1`과 둘이 된다", () => {
    render(<ScreenError title="공지를 불러오지 못했습니다" reset={noop} isInsideShell />);

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "공지를 불러오지 못했습니다",
    );
  });

  it("어느 쪽이든 [다시 시도]는 있다 — 오류에서 빠져나갈 유일한 조작이다", () => {
    render(<ScreenError title="불러오지 못했습니다" reset={noop} isInsideShell />);

    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });
});
