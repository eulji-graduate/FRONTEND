import "server-only";

import {
  type BillingOverview,
  PAYMENT_STATUS,
  type Subscription,
  SUBSCRIPTION_STATUS,
} from "./subscription";
import type { BillingConfig } from "./types";
import { PLAN } from "./types";

/**
 * 구독 현황 조회 — **격리막**.
 *
 * ⚠️⚠️ **2026-08-14 팀 결정 — 이 도메인은 항상 더미다.** 실 연동을 걸어 봤더니 BE `pay`가
 *    등록된 결제 수단을 요구하는데(`NO_PAYMENT_METHOD`) 온보딩 4단계·구독 재개 화면은 카드를
 *    등록할 길이 없는 자리라 결제가 항상 막혔고, 그 상태 확인마저 안정적이지 않아 "결제를
 *    마쳐도 구독 화면에 갈 때마다 다시 결제 화면으로 튕기는" 사고로 번졌다. PG(Toss)·BE 쪽이
 *    안정되기 전까지 이 파일은 **분기 없이** 아래 더미 값만 돌려준다 — 실호출 코드는
 *    지운다(CLAUDE.md ⛔주석코드 금지, 되돌릴 코드는 git 기록에 남아 있다).
 * ⚠️ 컴포넌트는 이 함수들의 반환 타입만 본다 — 되돌릴 때도 화면은 안 바뀐다.
 * ⚠️ **화면에는 더미라고 밝힌다**(`BillingView`) — 베타 서버라는 사실을 감추지 않는다(§정직성).
 */

/** 더미 — 12명이 Team을 쓰는 회사 */
const MOCK: BillingOverview = {
  subscription: {
    planCode: PLAN.TEAM,
    planName: "Team",
    status: SUBSCRIPTION_STATUS.ACTIVE,
    /*
      ⚠️ `currentPeriodEnd`는 **갱신일과 같은 날**이다(그날 다음 주기가 시작된다).
         하루 앞으로 적어 두면 일할계산의 주기 일수가 하루 모자라 금액이 어긋난다.
    */
    currentPeriodStart: "2026-08-01",
    currentPeriodEnd: "2026-09-01",
    nextBillingDate: "2026-09-01",
    estimatedAmount: 165_000,
    carriedOverageAmount: 0,
    /*
      ⚠️ **청구 지표는 AI 사용량과 저장 공간 둘뿐이다.** 회의 건수는 참고용으로만 둔다 —
         과금과 무관한 숫자를 같은 자리에 크게 놓으면 무엇 때문에 돈이 나가는지 흐려진다.
      ⚠️ 저장 공간을 **음성과 자막으로 나눠** 담는다. 둘 다 과금 대상이고, 지울 때
         음성은 권장·자막은 비권장이라 화면에서 갈라 보여야 한다(팀 결정).
    */
    usage: {
      // ⚠️ **스토리지는 쌓인 총량**이다. 지난 달까지 쌓인 게 대부분이다.
      tokens: 186_000,
      voiceStorageGb: 34.9,
      sttStorageGb: 6.8,
      meetingCount: 6,
    },
  },
  method: { id: "pm_1", brand: "VISA", last4: "4242", expiry: "09/27" },
  payments: [
    {
      id: "pay_7",
      paidAt: "2026-08-01",
      planName: "Team",
      overageAmount: 0,
      amount: 165_000,
      status: PAYMENT_STATUS.PAID,
    },
    {
      id: "pay_6",
      paidAt: "2026-07-01",
      planName: "Team",
      overageAmount: 0,
      amount: 165_000,
      status: PAYMENT_STATUS.PAID,
    },
    {
      id: "pay_5",
      paidAt: "2026-06-01",
      planName: "Team",
      overageAmount: 0,
      amount: 165_000,
      status: PAYMENT_STATUS.PAID,
    },
    {
      id: "pay_4",
      paidAt: "2026-05-01",
      planName: "Team",
      overageAmount: 0,
      amount: 165_000,
      status: PAYMENT_STATUS.PAID,
    },
    {
      id: "pay_3",
      paidAt: "2026-04-01",
      planName: "Team",
      // 초과가 난 달 — 기본료에 얹혀 한 번에 청구됐다
      overageAmount: 22_400,
      amount: 187_400,
      status: PAYMENT_STATUS.PAID,
    },
  ],
};

/**
 * 온보딩 4단계·구독 재개 화면(`/subscription`)이 보는 구독 — **아직 결제 전**이다.
 *
 * ⚠️ 구독 관리 화면과 **같은 더미를 쓰면 안 된다.** 저건 이미 결제 중인 회사라
 *    온보딩에서 열면 "변경 사항 없음 · ₩0"이 떠서 결제를 할 수가 없다.
 * ⚠️ 사용량이 전부 0이다. 아직 아무것도 안 썼다 — 결제 화면은 **포함량만** 보여준다.
 */
const MOCK_PENDING: Subscription = {
  ...MOCK.subscription,
  status: SUBSCRIPTION_STATUS.UNPAID,
  nextBillingDate: null,
  estimatedAmount: 0,
  usage: {
    tokens: 0,
    voiceStorageGb: 0,
    sttStorageGb: 0,
    meetingCount: 0,
  },
};

/**
 * 요금 설정 — **BE가 내려주는 값**이다(팀 확정: 하드코딩 금지).
 *
 * ⚠️ 아래 숫자는 **실측 전 v0 가정값**이다. 실측이 나오면 이 값만 바꾼다.
 * ⚠️ **export한다** — SYSTEM 대시보드의 구독 목 데이터(`system/mock/billing.ts`)도 같은
 *    값을 써야 한다(CLAUDE.md §요금제: "금액·포함량·단가의 정본은 BillingConfig 하나").
 *    거기서 따로 단가를 만들면 두 화면이 같은 회사를 다른 금액으로 보여준다.
 */
export const MOCK_CONFIG: BillingConfig = {
  baseFee: 150_000,
  includedTokens: 1_500_000,
  includedStorageGb: 50,
  overagePerThousandTokens: 20,
  overagePerGbMonth: 500,
  isVatIncluded: false,
};

/**
 * 요금 설정. 로그인 여부와 무관하게 같은 값이다 — 공개 요금제(`/plans`)도 이 함수를 쓴다.
 */
export async function getBillingConfig(): Promise<BillingConfig> {
  return MOCK_CONFIG;
}

/**
 * 온보딩 4단계·구독 재개 화면이 보는 구독 — **아직 결제 전**이다.
 */
export async function getOnboardingSubscription(): Promise<Subscription> {
  return MOCK_PENDING;
}

/**
 * 구독 현황 화면(`/manage/billing`) 한 벌.
 */
export async function getBillingOverview(): Promise<BillingOverview> {
  return MOCK;
}
