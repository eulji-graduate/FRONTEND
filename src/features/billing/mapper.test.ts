import {
  parseBillingConfig,
  parseBillingOverview,
  parsePaymentAction,
  parsePaymentMethod,
  toBillingConfig,
  toBillingOverview,
  toSubscription,
  toSubscriptionStatus,
} from "./mapper";
import { PAYMENT_STATUS, SUBSCRIPTION_STATUS } from "./subscription";
import { PLAN } from "./types";

/*
  ⚠️ 아래 픽스처는 **BE record를 그대로 옮겨 적은 것**이다(2026-08-13 실코드 대조) —
     `BillingConfigResponse`·`BillingOverviewResponse`·`BillingPaymentActionResult`.
     "그럴듯한 예시"가 아니라 필드 이름·타입·nullable 여부까지 BE를 따른다. BE가 모양을 바꾸면
     여기가 먼저 깨져야 한다 — 그러라고 손으로 옮겨 적는다(§연동 검증).
  ⚠️ 봉투는 여기 없다. `serverApi`가 벗긴 뒤의 알맹이가 매퍼에 온다(`lib/api.ts`).
*/

/** `GET /api/companies/me/billing-config` → `BillingConfigResponse` */
const BE_CONFIG = {
  baseFee: 150_000,
  includedTokens: 1_500_000,
  includedStorageGb: 50,
  overagePerThousandTokens: 20,
  overagePerGbMonth: 500,
  isVatIncluded: false,
};

/** `GET /api/companies/me/billing` → `BillingOverviewResponse` (결제 중인 회사) */
const BE_OVERVIEW = {
  subscription: {
    planCode: "TEAM",
    planName: "Team",
    status: "ACTIVE",
    currentPeriodStart: "2026-08-01",
    currentPeriodEnd: "2026-09-01",
    nextBillingDate: "2026-09-01",
    carriedOverageAmount: 0,
    estimatedAmount: 165_000,
    usage: {
      tokens: 186_000,
      voiceStorageGb: 34.9,
      sttStorageGb: 6.8,
      meetingCount: 6,
    },
  },
  /* ⚠️ `"pm_" + id` — BE가 접두사를 붙여 문자열로 내려준다(`PaymentMethodResponse.from`) */
  method: { id: "pm_1", brand: "MASTER", last4: "4242", expiry: "12/29" },
  payments: [
    {
      id: "pay_7",
      paidAt: "2026-08-01",
      planName: "Team",
      overageAmount: 0,
      amount: 165_000,
      status: "PAID",
    },
    {
      id: "pay_3",
      paidAt: "2026-04-01",
      planName: "Team",
      overageAmount: 22_400,
      amount: 187_400,
      status: "PAID",
    },
  ],
};

describe("요금 설정 매퍼", () => {
  it("BE 응답을 UI 계약으로 옮긴다", () => {
    expect(toBillingConfig(parseBillingConfig(BE_CONFIG))).toEqual({
      baseFee: 150_000,
      includedTokens: 1_500_000,
      includedStorageGb: 50,
      overagePerThousandTokens: 20,
      overagePerGbMonth: 500,
      isVatIncluded: false,
    });
  });

  it("BE 응답 객체를 그대로 흘려보내지 않는다 — 계약에 없는 필드는 안 넘어간다", () => {
    const withExtra = { ...BE_CONFIG, seats: 12, internalNote: "GOODS-01" };
    const mapped = toBillingConfig(parseBillingConfig(withExtra));

    expect(mapped).not.toHaveProperty("seats");
    expect(mapped).not.toHaveProperty("internalNote");
  });

  /*
    ⚠️ **VAT는 조용히 틀리면 안 되는 값이다.** BE가 `@JsonProperty("isVatIncluded")`를 떼면
       잭슨이 `vatIncluded`로 내보내는데, 검사 없이 넘기면 `undefined`가 되어 부가세가
       "포함"으로 읽히고 **금액이 10% 낮게 표시된다** — 막고 알리는 편이 낫다(§정직성).
  */
  it("`isVatIncluded`가 다른 이름으로 오면 막는다", () => {
    const renamed = { ...BE_CONFIG, isVatIncluded: undefined, vatIncluded: false };
    expect(() => parseBillingConfig(renamed)).toThrow(/요금 설정/);
  });

  it("봉투를 잘못 벗겨 undefined가 오면 막는다", () => {
    expect(() => parseBillingConfig(undefined)).toThrow(/요금 설정/);
  });

  it("금액이 숫자가 아니면 막는다 — 화면에 `NaN원`이 뜨느니 여기서 걸린다", () => {
    expect(() => parseBillingConfig({ ...BE_CONFIG, baseFee: "150000" })).toThrow(/요금 설정/);
    expect(() => parseBillingConfig({ ...BE_CONFIG, baseFee: Number.NaN })).toThrow(/요금 설정/);
  });
});

describe("구독 현황 매퍼", () => {
  it("BE 응답을 UI 계약으로 옮긴다", () => {
    const overview = toBillingOverview(parseBillingOverview(BE_OVERVIEW));

    expect(overview.subscription).toEqual({
      planCode: PLAN.TEAM,
      planName: "Team",
      status: SUBSCRIPTION_STATUS.ACTIVE,
      carriedOverageAmount: 0,
      currentPeriodStart: "2026-08-01",
      nextBillingDate: "2026-09-01",
      estimatedAmount: 165_000,
      currentPeriodEnd: "2026-09-01",
      usage: { tokens: 186_000, voiceStorageGb: 34.9, sttStorageGb: 6.8, meetingCount: 6 },
    });
    expect(overview.method).toEqual({
      id: "pm_1",
      brand: "MASTER",
      last4: "4242",
      expiry: "12/29",
    });
    expect(overview.payments).toHaveLength(2);
    expect(overview.payments[1]).toEqual({
      id: "pay_3",
      paidAt: "2026-04-01",
      planName: "Team",
      overageAmount: 22_400,
      amount: 187_400,
      status: PAYMENT_STATUS.PAID,
    });
  });

  /* ⚠️ 카드를 안 걸었으면 BE가 `null`을 넣는다(`BillingOverviewResponse.from`) — 정상 갈래다 */
  it("카드가 없으면 `method`가 null이다", () => {
    const noCard = { ...BE_OVERVIEW, method: null, payments: [] };
    const overview = toBillingOverview(parseBillingOverview(noCard));

    expect(overview.method).toBeNull();
    expect(overview.payments).toEqual([]);
  });

  /*
    ⚠️ BE가 `UNPAID`·`EXPIRED`면 `nextBillingDate`를 일부러 `null`로 내린다
       (`BillingOverviewService.nextBillingDate`). 우리 계약도 `string | null`이라 그대로 간다.
  */
  it("결제 전이면 다음 결제일이 null이다", () => {
    const unpaid = {
      ...BE_OVERVIEW,
      subscription: { ...BE_OVERVIEW.subscription, status: "UNPAID", nextBillingDate: null },
    };
    const { subscription } = toBillingOverview(parseBillingOverview(unpaid));

    expect(subscription.status).toBe(SUBSCRIPTION_STATUS.UNPAID);
    expect(subscription.nextBillingDate).toBeNull();
  });

  /*
    ⚠️ `currentPeriodEnd`는 BE에서 nullable인데(결제된 적 없는 행) 우리 계약은 `string`이다 —
       계약을 넓히면 컴포넌트를 고쳐야 해서, 매퍼가 빈 문자열로 낮춘다. 화면은 그걸 `—`로 그린다
       (`usage-panel`의 `periodLabel` → `isReadableDate`).
  */
  it("주기 종료일이 null이면 빈 문자열로 낮춘다 — 날짜를 지어내지 않는다", () => {
    const noEnd = {
      ...BE_OVERVIEW,
      subscription: { ...BE_OVERVIEW.subscription, currentPeriodEnd: null },
    };
    const { subscription } = toBillingOverview(parseBillingOverview(noEnd));

    expect(subscription.currentPeriodEnd).toBe("");
  });

  /*
    ⚠️ BE `BillingPaymentStatus`에는 `FREE`가 있고 지금은 BE가 걸러서 안 보낸다. 그래도 오면
       우리 표엔 라벨이 없어 상태 칸이 빈 채로 그려진다 — 그 줄만 버린다(구독 상태와 달리 안 던진다).
  */
  it("모르는 결제 상태(`FREE`)는 그 줄만 버린다", () => {
    const withFree = {
      ...BE_OVERVIEW,
      payments: [
        ...BE_OVERVIEW.payments,
        { ...BE_OVERVIEW.payments[0], id: "pay_1", status: "FREE" },
      ],
    };
    const overview = toBillingOverview(parseBillingOverview(withFree));

    expect(overview.payments).toHaveLength(2);
    expect(overview.payments.map((payment) => payment.id)).not.toContain("pay_1");
  });

  it("결제 내역 한 줄이 모양을 어기면 막는다 — 표를 그릴 때 터지느니 여기서 걸린다", () => {
    const broken = { ...BE_OVERVIEW, payments: [null] };
    expect(() => parseBillingOverview(broken)).toThrow(/구독 현황/);
  });

  it("사용량이 통째로 빠지면 막는다", () => {
    const noUsage = {
      ...BE_OVERVIEW,
      subscription: { ...BE_OVERVIEW.subscription, usage: undefined },
    };
    expect(() => parseBillingOverview(noUsage)).toThrow(/구독 현황/);
  });
});

describe("구독 상태 옮기기", () => {
  it.each(["ACTIVE", "CANCELING", "UNPAID", "EXPIRED", "CANCELED"])("BE 값 %s를 받는다", (raw) => {
    expect(toSubscriptionStatus(raw)).toBe(raw);
  });

  /*
    ⚠️ `CANCELED`는 **지금 BE가 안 내보낸다**(`displayStatus`가 `EXPIRED`로 바꾼다). 그래도 받아
       두는 이유는 `subscription.ts`의 주석에 있다 — 옛 `CANCELED` 행이 DB에 남아 있어서다.
  */
  it("`CANCELING`(해지 예정)과 `CANCELED`(해지 완료)를 섞지 않는다", () => {
    expect(toSubscriptionStatus("CANCELING")).toBe(SUBSCRIPTION_STATUS.CANCELING);
    expect(toSubscriptionStatus("CANCELED")).toBe(SUBSCRIPTION_STATUS.CANCELED);
    expect(SUBSCRIPTION_STATUS.CANCELING).not.toBe(SUBSCRIPTION_STATUS.CANCELED);
  });

  /*
    ⚠️ 기본값으로 흘려보내지 않는다. `ACTIVE`로 떨어뜨리면 못 쓰는 회사에 워크스페이스가 열리고,
       `EXPIRED`로 떨어뜨리면 멀쩡히 낸 회사가 잠긴다 — 둘 다 돈이 걸린 거짓말이다.
  */
  it("모르는 상태는 던진다", () => {
    expect(() => toSubscriptionStatus("TRIAL")).toThrow(/알 수 없는 구독 상태/);
  });

  it("소문자로 와도 받지 않는다 — BE는 대문자 enum 이름을 준다", () => {
    expect(() => toSubscriptionStatus("active")).toThrow(/알 수 없는 구독 상태/);
  });

  it("plan 코드는 BE 문자열이 아니라 우리 상수로 고정한다", () => {
    const odd = { ...BE_OVERVIEW.subscription, planCode: "ENTERPRISE" };
    expect(
      toSubscription(parseBillingOverview({ ...BE_OVERVIEW, subscription: odd }).subscription)
        .planCode,
    ).toBe(PLAN.TEAM);
  });
});

/*
  ⚠️ 여기가 이번 연동에서 **가장 잘 깨지는 자리**다. `pay`·`payment-methods`는 봉투가
     **과도기**다 — 지금 배포본은 DTO 맨몸, **BE PR #461**부터 `ApiResponse<T>` 봉투.
     호출부는 `isEnveloped: false`로 원문을 받고 매퍼(`unwrapTransitionalEnvelope`)가
     감지해 가른다. 어느 배포본과 만나도(맨몸·봉투) 같은 결과가 나와야 하고, 감지가
     어긋나 `undefined`가 흐르면 결제 실패가 성공으로 읽힌다 — 그 사고를 매퍼가 잡는지
     확인한다. BE #461 배포 확정 후 감지를 걷어내면 봉투 갈래 테스트도 같이 지운다.
*/
describe("결제 결과 매퍼 — 과도기 봉투 감지(BE PR #461)", () => {
  it("성공이면 `failureCode`가 아예 없다(`@JsonInclude(NON_NULL)`)", () => {
    expect(parsePaymentAction({ isSuccess: true })).toEqual({ isSuccess: true });
  });

  it("실패는 HTTP 200에 값으로 온다 — 코드를 그대로 넘긴다", () => {
    expect(parsePaymentAction({ isSuccess: false, failureCode: "NO_PAYMENT_METHOD" })).toEqual({
      isSuccess: false,
      failureCode: "NO_PAYMENT_METHOD",
    });
  });

  /* ⚠️ BE #461 배포 후의 모양 — 봉투를 감지해 `data`를 꺼낸다(성공·실패 둘 다) */
  it("봉투째 와도 알맹이를 꺼낸다 — BE #461 배포 후 모양", () => {
    expect(
      parsePaymentAction({
        httpStatus: 200,
        message: "Billing payment processed.",
        data: { isSuccess: true },
      }),
    ).toEqual({ isSuccess: true });

    expect(
      parsePaymentAction({
        httpStatus: 200,
        message: "Billing payment processed.",
        data: { isSuccess: false, failureCode: "NO_PAYMENT_METHOD" },
      }),
    ).toEqual({ isSuccess: false, failureCode: "NO_PAYMENT_METHOD" });
  });

  it("봉투를 잘못 벗겨 `undefined`가 오면 막는다 — 성공으로 읽히면 안 된다", () => {
    expect(() => parsePaymentAction(undefined)).toThrow(/결제 결과/);
  });

  it("봉투 안이 비어 있으면 막는다 — `data: null`을 성공으로 읽지 않는다", () => {
    const empty = { httpStatus: 200, message: "ok", data: null };
    expect(() => parsePaymentAction(empty)).toThrow(/결제 결과/);
  });
});

describe("결제 수단 매퍼 — 과도기 봉투 감지(BE PR #461)", () => {
  it("맨몸 응답(BE #461 배포 전)을 UI 계약으로 옮긴다", () => {
    const be = { id: "pm_9", brand: "MASTER", last4: "1234", expiry: "12/29" };
    expect(parsePaymentMethod(be)).toEqual(be);
  });

  it("봉투째 와도 알맹이를 꺼낸다 — BE #461 배포 후 모양", () => {
    const be = { id: "pm_9", brand: "MASTER", last4: "1234", expiry: "12/29" };
    expect(
      parsePaymentMethod({ httpStatus: 200, message: "Payment method registered.", data: be }),
    ).toEqual(be);
  });

  it("봉투를 잘못 벗겨 `undefined`가 오면 막는다", () => {
    expect(() => parsePaymentMethod(undefined)).toThrow(/결제 수단/);
  });

  /* ⚠️ `id`는 `"pm_" + id` 문자열이다 — 숫자로 오면 BE가 접두사 규칙을 바꾼 것이다 */
  it("`id`가 숫자로 오면 막는다", () => {
    expect(() =>
      parsePaymentMethod({ id: 9, brand: "MASTER", last4: "1234", expiry: "12/29" }),
    ).toThrow(/결제 수단/);
  });
});
