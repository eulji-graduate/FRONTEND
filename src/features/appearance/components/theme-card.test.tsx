import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeCard } from "./theme-card";

/**
 * `next-themes`의 `useTheme`을 실제 `useState`로 흉내 낸다 — `setTheme`을 부르면 진짜로
 * 다시 렌더되어야 클릭·방향키 선택이 반영되는지 검증할 수 있다(`screen-scale-card.test.tsx`와
 * 같은 취지 — 라디오 그룹의 키보드 계약을 지키는지 본다).
 */
jest.mock("next-themes", () => {
  const React = jest.requireActual("react");
  return {
    useTheme: () => {
      const [theme, setTheme] = React.useState("light");
      return { theme, setTheme };
    },
  };
});

describe("ThemeCard 키보드", () => {
  const checked = () => screen.getByRole("radio", { checked: true });

  it("초기값(라이트)이 선택돼 있다", () => {
    render(<ThemeCard />);

    expect(checked()).toHaveTextContent("라이트");
  });

  it("클릭으로 고를 수 있다", async () => {
    const user = userEvent.setup();
    render(<ThemeCard />);

    await user.click(screen.getByRole("radio", { name: /시스템/ }));

    expect(checked()).toHaveTextContent("시스템");
  });

  it("오른쪽 방향키로 다음 옵션을 고르고 포커스도 옮겨간다", async () => {
    const user = userEvent.setup();
    render(<ThemeCard />);

    checked().focus();
    await user.keyboard("{ArrowRight}");

    expect(checked()).toHaveTextContent("다크");
    expect(checked()).toHaveFocus();
  });

  it("왼쪽 방향키는 처음 칸에서 마지막 옵션으로 돈다", async () => {
    const user = userEvent.setup();
    render(<ThemeCard />);

    checked().focus();
    await user.keyboard("{ArrowLeft}");

    expect(checked()).toHaveTextContent("시스템");
  });
});
