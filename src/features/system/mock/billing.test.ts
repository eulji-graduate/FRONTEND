import { COMPANY_STATUS, PAYMENT_STATUS } from "@/constants/domain";
import { calculatePrice } from "@/features/billing/pricing";
import { MOCK_CONFIG } from "@/features/billing/server";

import { MOCK_BILLING_OVERVIEW } from "./billing";
import { listMockCompanies } from "./companies";

const { subscriptions, summary } = MOCK_BILLING_OVERVIEW;
const unpaidCompanyCount = listMockCompanies().filter(
  (company) => company.status === COMPANY_STATUS.UNPAID,
).length;

describe("구독 목록은 기업 관리 데이터에서 파생한다", () => {
  // ⚠️ 화면 명세: 항상 5건만 보여준다.
  it("항상 5건이다", () => {
    expect(subscriptions).toHaveLength(5);
  });

  // ⚠️ 요약 카드("미납 N건")와 목록(미납 우선 채움)이 같은 소스를 세야 어긋나지 않는다.
  it("요약의 미납 건수는 기업 목록의 미납 수와 같다", () => {
    expect(summary.unpaidCount).toBe(unpaidCompanyCount);
  });

  // ⚠️ 미납을 먼저 채우고 모자라면 최신 가입순으로 보충한다.
  it("미납 기업이 목록 맨 앞에 온다", () => {
    const leading = subscriptions.slice(0, Math.min(unpaidCompanyCount, 5));

    expect(leading.every((record) => record.paymentStatus === PAYMENT_STATUS.UNPAID)).toBe(true);
  });

  it("미납으로 다 못 채우면 나머지는 최신 가입순으로 붙는다", () => {
    const rest = subscriptions.slice(unpaidCompanyCount);

    for (let i = 1; i < rest.length; i++) {
      expect(rest[i - 1]!.joinedAt.localeCompare(rest[i]!.joinedAt)).toBeGreaterThanOrEqual(0);
    }
  });

  /*
    ⚠️ **좌석 과금이 아니다**(2026-08-04 팀 확정, FE 감사 #243). 인원은 금액과 무관하고
       모든 기업이 같은 기본료를 낸다 — `BillingConfig`(정본, `billing/server.ts`)에서
       파생한 값과 같아야 한다. 회사마다 인원이 달라도 금액은 전부 같다.
  */
  it("모든 기업이 인원과 무관하게 같은 기본료로 결제된다 — 0원도 결제일 없는 건도 없다", () => {
    const expectedAmount = calculatePrice(MOCK_CONFIG).total;

    for (const record of subscriptions) {
      expect(record.amount).toBe(expectedAmount);
      expect(record.billingDate).not.toBeNull();
    }

    // 인원이 서로 다른데도 금액이 같다는 사실 자체를 확인한다 — 좌석 과금이 아니라는 증거.
    const memberCounts = new Set(subscriptions.map((record) => record.memberCount));
    expect(memberCounts.size).toBeGreaterThan(1);
  });
});
