jest.mock("../actions", () => ({ findCompanyAction: jest.fn() }));
jest.mock("../company-code", () => ({ saveCompany: jest.fn() }));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { findCompanyAction } from "../actions";
import { CompanyCodeStep } from "./company-code-step";

/**
 * 로그인 1단계(기업 코드) — **막혔을 때 이 화면이 살아 있는가**를 지킨다.
 *
 * ⚠️ 여기는 서비스의 첫 문이다. 이 화면이 죽으면 사람은 들어올 방법이 없다 —
 *    "코드를 잘못 쳤다"와 "서버가 안 받는다"를 구분해 말해야 한다(§정직성).
 */

const findMock = findCompanyAction as unknown as jest.Mock;

async function submitCode(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("기업 코드"), "NOVA-7K3D");
  await user.click(screen.getByRole("button", { name: /연결|확인|다음/ }));
}

beforeEach(() => {
  findMock.mockReset();
});

it("코드가 틀리면 그 사유를 필드 아래 남긴다", async () => {
  const user = userEvent.setup();
  findMock.mockResolvedValue({ company: null, error: "기업 코드를 찾을 수 없습니다" });
  render(<CompanyCodeStep />);

  await submitCode(user);

  expect(await screen.findByText("기업 코드를 찾을 수 없습니다")).toBeInTheDocument();
});

/*
  ⚠️ **전송 자체가 거부되는 경우**다(적대적 리뷰 2026-08-12). 액션은 실패를 `error` 문구로
     돌려주지만, 브라우저에서 Next 서버까지 가는 길이 끊기면 `await`가 던진다 — 안 잡으면
     로그인 첫 화면이 통째로 `error.tsx`로 넘어가고, 사람은 자기가 코드를 잘못 친 줄 안다.
*/
it("전송이 거부돼도 화면이 죽지 않고 다른 말로 알린다", async () => {
  const user = userEvent.setup();
  findMock.mockRejectedValue(new TypeError("Failed to fetch"));
  render(<CompanyCodeStep />);

  await submitCode(user);

  expect(
    await screen.findByText("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."),
  ).toBeInTheDocument();
  // 다시 시도할 수 있어야 한다 — 입력칸이 그대로 살아 있다
  expect(screen.getByLabelText("기업 코드")).toBeInTheDocument();
});
