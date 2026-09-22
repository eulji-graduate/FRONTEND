import { requestCardAuth } from "./payment-method";

/**
 * `requestCardAuth` — 2026-08-14. PG가 아직 미확정이라 항상 자리표시자 값을 쓴다
 * (파일 주석 참고). 이 테스트는 두 가지만 잠근다:
 * - `customerKey`(기업 id)를 그대로 보존하는가 — BE가 그 값으로 등록 회사를 대조한다
 * - 던지지 않고 값을 돌려주는가 — 던지면 `billing-view.tsx`의 [등록/변경] 버튼이
 *   "결제사가 연결되지 않았습니다" 실패로 영원히 막힌다(이전 상태로의 회귀 방지)
 */
describe("requestCardAuth", () => {
  it("customerKey를 그대로 돌려준다 — BE가 이 값으로 회사를 대조한다", async () => {
    const result = await requestCardAuth("42");

    expect(result.customerKey).toBe("42");
    expect(result.authKey.length).toBeGreaterThan(0);
  });

  it("던지지 않는다", async () => {
    await expect(requestCardAuth("1")).resolves.toBeDefined();
  });
});
