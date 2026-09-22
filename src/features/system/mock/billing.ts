import { COMPANY_STATUS, PAYMENT_STATUS } from "@/constants/domain";
import { calculatePrice } from "@/features/billing/pricing";
import { MOCK_CONFIG } from "@/features/billing/server";

import type { BillingOverview, ManagedCompany, SubscriptionRecord } from "../types";
import { listMockCompanies } from "./companies";

/** 화면에 보여줄 구독 목록 수 — 화면 명세: 미납 우선, 모자라면 최신 가입순으로 채운다. */
const SUBSCRIPTION_DISPLAY_COUNT = 5;

/** ⚠️ 목 데이터 — BE 연동 전. SYSTEM 구독·매출 진입 시 보여줄 예시 값이다. */
export const MOCK_BILLING_OVERVIEW: BillingOverview = {
  summary: {
    mrr: 8_400_000,
    mrrDeltaPercent: 11.8,
    paidCount: 37,
    paidAmount: 8_400_000,
    // ⚠️ 하드코딩하지 않는다 — "기업 관리" mock(`mock/companies.ts`)에서 실제로 몇 곳이
    //    미납인지 세어서 쓴다. 하드코딩된 값과 실제 목록이 어긋나면 요약 카드("미납 N건")와
    //    아래 구독 목록(미납 우선 채움)이 서로 다른 숫자를 말하게 된다.
    unpaidCount: countMockUnpaidCompanies(),
    canceledCountThisMonth: 2,
  },
  monthlyMrr: [
    { month: "2월", amount: 4_200_000 },
    { month: "3월", amount: 5_100_000 },
    { month: "4월", amount: 6_300_000 },
    { month: "5월", amount: 7_000_000 },
    { month: "6월", amount: 7_600_000 },
    { month: "7월", amount: 8_400_000 },
  ],
  subscriptions: buildMockSubscriptions(),
};

/** 요약 카드의 "미납" 건수 — 목록과 항상 같은 소스(`listMockCompanies`)에서 센다. */
function countMockUnpaidCompanies(): number {
  return listMockCompanies().filter((company) => company.status === COMPANY_STATUS.UNPAID).length;
}

/**
 * 구독 목록 = 기업 관리 목 데이터에서 파생한다 — 두 화면이 같은 기업을 다르게 보여줄 뿐이라
 * 별도 배열을 또 손으로 채우면 언젠가 서로 어긋난다(CLAUDE.md §도메인 상수: 값 목록은 한 곳에서).
 * ⚠️ 화면 명세: **항상 5건만** — 미납 기업을 먼저 채우고, 모자라면 `joinedAt` 최신순으로 채운다.
 */
function buildMockSubscriptions(): SubscriptionRecord[] {
  /*
    ⚠️ **좌석 과금이 아니다**(2026-08-04 팀 확정, `billing/pricing.ts`와 같은 규칙). 인원은
       금액과 무관하고, 모든 회사가 같은 기본료를 낸다 — 이 목엔 회사별 AI 토큰·스토리지
       사용량이 없어(그 화면 것과 다른, 운영자용 요약 목이라) 초과분은 계산하지 않는다.
       실제로도 초과분은 회사별로 다른데, 이건 그 사실을 지어내지 않고 기본료까지만 보여준다.
  */
  const baseAmount = calculatePrice(MOCK_CONFIG).total;

  const toRecord = (company: ManagedCompany): SubscriptionRecord => ({
    companyId: company.id,
    companyName: company.name,
    memberCount: company.memberCount,
    /*
      ⚠️ 플랜으로 가르지 않는다 — 요금제가 하나뿐이라 **모든 기업이 결제 대상**이다
         (CLAUDE.md §요금제). 예전엔 `plan === TEAM`이 아니면 0원·결제일 없음으로 쳤는데,
         그건 없는 무료 요금제를 전제한 계산이었다.
    */
    amount: baseAmount,
    billingDate: "2025-07-01",
    paymentStatus:
      company.status === COMPANY_STATUS.SUSPENDED
        ? PAYMENT_STATUS.CANCELED
        : company.status === COMPANY_STATUS.UNPAID
          ? PAYMENT_STATUS.UNPAID
          : PAYMENT_STATUS.PAID,
    ownerEmail: company.ownerEmail,
    joinedAt: company.joinedAt,
  });

  const companies = listMockCompanies();
  const unpaid = companies.filter((company) => company.status === COMPANY_STATUS.UNPAID);
  const rest = companies
    .filter((company) => company.status !== COMPANY_STATUS.UNPAID)
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));

  return [...unpaid, ...rest].slice(0, SUBSCRIPTION_DISPLAY_COUNT).map(toRecord);
}
