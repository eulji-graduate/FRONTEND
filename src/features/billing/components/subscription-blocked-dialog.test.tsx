jest.mock("@/features/auth/actions", () => ({ logoutAction: jest.fn() }));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { logoutAction } from "@/features/auth/actions";

import { SUBSCRIPTION_STATUS } from "../subscription";
import { SubscriptionBlockedDialog } from "./subscription-blocked-dialog";

/**
 * 구독 차단 창 — **나가는 길이 로그아웃으로 바뀐 뒤 회귀 테스트.**
 *
 * ⚠️ 예전엔 `/login`으로 보내는 `<Link>`였는데, 세션 쿠키가 살아있는 채로 로그인 화면에
 *    가면 그대로 이 회사로 되돌아온다 — `logoutAction`(쿠키를 지우고 `/login`으로
 *    리다이렉트)을 실제로 부르는지 확인한다.
 */

const logoutActionMock = logoutAction as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

it("UNPAID 상태에서 버튼을 누르면 logoutAction을 부른다", async () => {
  const user = userEvent.setup();
  render(<SubscriptionBlockedDialog status={SUBSCRIPTION_STATUS.UNPAID} />);

  await user.click(screen.getByRole("button", { name: "로그인 화면으로" }));

  expect(logoutActionMock).toHaveBeenCalledTimes(1);
});

it("EXPIRED 상태에서도 같은 버튼으로 로그아웃한다", async () => {
  const user = userEvent.setup();
  render(<SubscriptionBlockedDialog status={SUBSCRIPTION_STATUS.EXPIRED} />);

  await user.click(screen.getByRole("button", { name: "로그인 화면으로" }));

  expect(logoutActionMock).toHaveBeenCalledTimes(1);
});
