jest.mock("../actions", () => ({ submitRegistrationAction: jest.fn() }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RegisterForm } from "./register-form";

/**
 * 기업 등록 신청 — **약관을 읽는 동안 쓰던 값이 살아 있어야 한다.**
 *
 * ⚠️ 이 화면은 이 서비스에서 가장 긴 폼이다(회사명·사업자번호·주소·담당자…). 약관을 페이지로
 *    열면 적던 값이 통째로 날아간다 — `LegalDialog`가 있는 이유가 정확히 이것이다.
 */

it("이용약관을 누르면 모달로 열린다 — 화면을 떠나지 않는다", async () => {
  const user = userEvent.setup();
  render(<RegisterForm />);

  await user.click(screen.getByRole("button", { name: "이용약관" }));

  expect(await screen.findByRole("dialog")).toHaveTextContent("이용약관");
});

/*
  ⚠️ **누르는 곳이 체크박스 라벨 안이다.** 모달을 여는 글자가 `<label>` 안에 있어서, 잘못 두면
     약관을 **읽어 보려고 누른 것만으로 동의가 켜진다** — 동의는 사람이 스스로 눌러야 하는 값이다.
*/
it("약관을 읽으려 눌러도 동의가 켜지지 않는다", async () => {
  const user = userEvent.setup();
  render(<RegisterForm />);

  const consent = screen.getByRole("checkbox", { name: /이용약관/ });
  expect(consent).not.toBeChecked();

  await user.click(screen.getByRole("button", { name: "이용약관" }));

  expect(consent).not.toBeChecked();
});
