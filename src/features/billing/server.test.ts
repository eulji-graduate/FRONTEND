/**
 * `server.ts` — **2026-08-14 이 도메인은 항상 더미다**(파일 주석 참고).
 * 실 연동을 걸었더니 결제 수단 미등록으로 구조적 교착이 드러나서, 분기 없이 더미만
 * 돌려준다 — 그래서 이 테스트는 "분기를 타는가"가 아니라 "그 더미가 계약을 채우는가"만 본다.
 */
import { getBillingConfig, getBillingOverview, getOnboardingSubscription } from "./server";
import { SUBSCRIPTION_STATUS } from "./subscription";

describe("getBillingConfig", () => {
  it("v0 가정값을 그대로 돌려준다", async () => {
    const config = await getBillingConfig();

    expect(config).toEqual({
      baseFee: 150_000,
      includedTokens: 1_500_000,
      includedStorageGb: 50,
      overagePerThousandTokens: 20,
      overagePerGbMonth: 500,
      isVatIncluded: false,
    });
  });
});

describe("getOnboardingSubscription", () => {
  it("결제 전(UNPAID) 상태다 — 온보딩 4단계·구독 재개 화면이 이 값을 읽는다", async () => {
    const subscription = await getOnboardingSubscription();

    expect(subscription.status).toBe(SUBSCRIPTION_STATUS.UNPAID);
    expect(subscription.usage).toEqual({
      tokens: 0,
      voiceStorageGb: 0,
      sttStorageGb: 0,
      meetingCount: 0,
    });
  });
});

describe("getBillingOverview", () => {
  it("이미 결제 중인 상태(ACTIVE)와 결제 수단·내역을 함께 돌려준다", async () => {
    const overview = await getBillingOverview();

    expect(overview.subscription.status).toBe(SUBSCRIPTION_STATUS.ACTIVE);
    expect(overview.method).not.toBeNull();
    expect(overview.payments.length).toBeGreaterThan(0);
  });
});
