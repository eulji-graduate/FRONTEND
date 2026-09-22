/**
 * 결제 실패 문구 — **원인을 반대로 말하지 않는지**를 잡는다(회귀 방지).
 *
 * ⚠️ `POST /subscription/pay`는 실패도 HTTP 200에 값(`isSuccess:false`, `failureCode`)으로 온다.
 *    그 코드를 문구로 옮기는 표가 이 파일이고, 표에 없는 코드는 기본 문구
 *    (`카드사에서 결제를 처리하지 못했습니다`)로 떨어진다 — 카드사 잘못이 아닌 사유가
 *    기본 문구로 새면 사람이 엉뚱한 곳(카드사)에 전화를 건다(§정직성).
 */

import { toFailureMessage } from "./payment";

describe("결제 실패 문구", () => {
  /*
    ⚠️ 지금 BE가 `pay`에서 실제로 내는 사유는 이 코드 하나뿐이다
       (`BillingCommandService.pay` — 등록된 결제 수단이 없을 때).
  */
  it("결제 수단이 없어서 실패한 것을 카드사 탓으로 적지 않는다", () => {
    expect(toFailureMessage("NO_PAYMENT_METHOD")).toBe("등록된 결제 수단이 없습니다");
    expect(toFailureMessage("NO_PAYMENT_METHOD")).not.toMatch(/카드사/);
  });

  it("아는 카드사 코드는 그 사유로 적는다", () => {
    expect(toFailureMessage("EXCEED_MAX_CARD_LIMIT")).toBe("카드 한도를 초과했습니다");
  });

  /* ⚠️ 모르는 코드는 **지어내지 않고** 기본 문구다 — 코드 원문이 화면에 뜨면 안 된다 */
  it("모르는 코드는 기본 문구이고, 코드 원문을 화면에 내보내지 않는다", () => {
    const message = toFailureMessage("SOME_NEW_PG_CODE");

    expect(message).toBe("카드사에서 결제를 처리하지 못했습니다");
    expect(message).not.toMatch(/SOME_NEW_PG_CODE/);
  });

  it("사유가 없으면 기본 문구다", () => {
    expect(toFailureMessage()).toBe("카드사에서 결제를 처리하지 못했습니다");
  });
});
