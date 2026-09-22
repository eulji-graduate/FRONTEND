import { render } from "@testing-library/react";

import { AUTHORITY } from "@/constants/authority";

import { SUBSCRIPTION_STATUS, type SubscriptionStatus } from "../subscription";
import { SubscriptionGate } from "./subscription-gate";

/*
  ⚠️ `next/cache`를 막는다. 이 화면은 결제 칸(`SubscribeCard`)을 거쳐 서버 액션을 import하는데,
     `next/cache`가 모듈을 읽는 순간 엣지 런타임 전역(`Request`·`TextEncoder`)을 찾아
     jsdom에서 터진다. **여기서 보는 건 권한 없는 경로라 결제 칸을 아예 안 그린다** —
     화면을 테스트에 맞춰 고치는 대신 못 도는 모듈만 막는다.
*/
jest.mock("next/cache", () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn() }));

/**
 * 결제 권한이 **없는** 사람이 보는 쪽을 지킨다.
 *
 * ⚠️ 안내가 창에만 있으면 안 된다. 창은 포털이라 **서버가 그린 HTML에 한 글자도 안 들어간다** —
 *    하이드레이션 전까지, 그리고 번들이 늦거나 실패하면 영영 로고 한 줄만 남는다.
 *    창 뒤에 같은 말을 남겨 두면 JS 없이도 왜 막혔는지 읽힌다.
 * ⚠️ **`getByRole`로 찾지 않는다.** 창이 열려 있는 동안 Base UI가 배경을 `aria-hidden`으로
 *    덮어서 접근성 트리에서 빠지는데, 그건 모달의 정상 동작이다(그때는 창 제목이 화면 제목
 *    노릇을 한다). 여기서 지키려는 건 **DOM에 남아 있는지**라 마크업을 직접 본다.
 */

const config = {
  currency: "KRW",
  monthlyPrice: 50000,
  includedSeats: 10,
  extraSeatPrice: 5000,
  includedStorageGb: 100,
  extraStoragePrice: 1000,
} as never;

const blocked = (status: SubscriptionStatus = SUBSCRIPTION_STATUS.EXPIRED) =>
  render(
    <SubscriptionGate config={config} status={status} role={AUTHORITY.MEMBER} canManage={false} />,
  ).container;

describe("결제 권한이 없는 사람", () => {
  it("창 밖 본문에도 안내가 남는다 — JS 없이도 왜 막혔는지 읽힌다", () => {
    const main = blocked().querySelector("main");

    expect(main?.textContent).toContain("결제가 끝나야 워크스페이스가 열립니다");
    expect(main?.textContent).toContain("대표 또는 Admin 권한을 가진 분만");
  });

  it("페이지 제목(`h1`)이 있다 — 권한 있는 사람에게만 제목이 있으면 안 된다", () => {
    const headings = blocked().querySelectorAll("h1");

    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe("구독이 종료되었습니다");
  });

  it("미납이면 제목이 달라진다 — 종료와 미납은 다른 상황이다", () => {
    expect(blocked(SUBSCRIPTION_STATUS.UNPAID).querySelector("h1")?.textContent).toBe(
      "결제가 확인되지 않았습니다",
    );
  });

  /*
    ⚠️ 눌러도 못 하는 결제 칸을 주는 건 안내가 아니라 막다른 길이다 —
       말만 남기고 나가는 길(로그인 화면으로)은 창이 준다.
  */
  it("결제 버튼은 주지 않는다", () => {
    const buttons = [...blocked().querySelectorAll("button")].map((b) => b.textContent ?? "");

    expect(buttons.some((text) => /결제하기|구독하기/.test(text))).toBe(false);
  });
});
