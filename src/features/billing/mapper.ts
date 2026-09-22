/**
 * BE shape → UI 계약(CLAUDE.md §Mock → Live 격리막). 컴포넌트는 이 파일을 모른다 —
 * `server.ts`·`actions.ts`만 쓴다.
 *
 * [확인] BE 실코드 대조(2026-08-13) — `metering/presentation/api/BillingController.java`,
 *   `.../dto/response/{BillingConfigResponse,BillingOverviewResponse}.java`,
 *   `.../dto/request/{RegisterPaymentMethodRequest,ToggleSubscriptionCancelRequest}.java`,
 *   `application/result/BillingPaymentActionResult.java`,
 *   `application/service/{BillingOverviewService,BillingCommandService}.java`,
 *   `domain/model/{BillingSubscriptionStatus,BillingPaymentStatus}.java`
 *
 * ⚠️ **봉투는 여기서 안 벗긴다.** `serverApi`가 벗기고(`lib/api.ts`), 이 파일은 벗겨진
 *    알맹이만 본다 — 다만 `pay`·`payment-methods`는 **과도기**라 호출부가 `isEnveloped: false`로
 *    원문을 받고, 이 파일의 `unwrapTransitionalEnvelope`가 봉투 유무를 감지해 가른다
 *    (BE PR #461 — 아래 주석).
 * ⚠️ **금액은 숫자, 날짜는 ISO 문자열**로 넘긴다(`subscription.ts` 계약 주석). BE가
 *    `BigDecimal`로 들고 있는 값(`amount`·`overageAmount`)도 JSON에선 number라 그대로 받는다 —
 *    ⚠️ 단 자바 `BigDecimal`은 자릿수가 크면 **문자열로 직렬화되는 설정**도 있어서,
 *    숫자인지 여기서 확인하고 아니면 막는다(아래 `isMoney`).
 */

import {
  type BillingOverview,
  PAYMENT_STATUS,
  type PaymentMethod,
  type PaymentRecord,
  type PaymentStatus,
  type Subscription,
  SUBSCRIPTION_STATUS,
  type SubscriptionStatus,
  type UsageCounters,
} from "./subscription";
import { type BillingConfig, PLAN } from "./types";

/* ───────── BE 응답 shape ───────── */

/**
 * `GET /api/companies/me/billing-config` → `BillingConfigResponse`.
 *
 * ⚠️ **필드 이름이 우리 계약과 그대로 같다.** 그래도 매퍼를 통과시킨다 — 같다는 사실이
 *    계약이 아니라 우연이라, BE가 한 글자 바꾸면 `as`로 넘긴 값은 조용히 `undefined`가 된다.
 * ⚠️ `includedTokens`·`includedStorageGb`는 BE에서 `long`이다 — JSON에선 number다.
 * ⚠️ `isVatIncluded`는 BE가 `@JsonProperty("isVatIncluded")`를 박아 뒀다. 안 박으면
 *    잭슨이 `vatIncluded`로 내보내는데, 그걸 대비해 이름을 확인한다(아래 가드).
 */
export interface BeBillingConfig {
  baseFee: number;
  includedTokens: number;
  includedStorageGb: number;
  overagePerThousandTokens: number;
  overagePerGbMonth: number;
  isVatIncluded: boolean;
}

/**
 * `GET /api/companies/me/billing` → `BillingOverviewResponse`.
 *
 * ⚠️ **`method`는 `null`일 수 있다** — 카드를 아직 안 걸었으면 BE가 `null`을 넣는다
 *    (`BillingOverviewResponse.from`). 우리 계약도 `PaymentMethod | null`이라 그대로 흐른다.
 * ⚠️ `payments`는 **비어 있을 수 있다.** BE가 `FREE` 상태 행을 걸러서 내보내므로
 *    (`BillingOverviewService.getBillingOverview`), 결제 이력이 하나도 없는 회사는 빈 배열이다.
 */
export interface BeBillingOverview {
  subscription: BeSubscription;
  method: BePaymentMethod | null;
  payments: BePaymentRecord[];
}

/**
 * ⚠️ **`currentPeriodEnd`·`nextBillingDate`는 `null`이 될 수 있다.**
 *   · `nextBillingDate` — BE가 `UNPAID`·`EXPIRED`면 일부러 `null`로 내린다
 *     (`BillingOverviewService.nextBillingDate`). 우리 계약도 `string | null`이라 그대로 간다.
 *   · `currentPeriodEnd` — 도메인·DB 모두 nullable이다(결제된 적 없는 행). 우리 계약은
 *     `string`이라 매퍼가 `""`로 낮춘다(아래 `toSubscription` 주석).
 * ⚠️ `planCode`·`planName`은 BE가 `"TEAM"`·`"Team"`으로 **고정해서** 내려준다
 *   (`BillingOverviewService.PLAN_CODE`/`PLAN_NAME`) — 우리 `PLAN.TEAM`과 맞는다.
 * ⚠️ 날짜는 자바 `LocalDate` → `"2026-08-01"`이다. 시각이 없어 시간대 문제가 없다
 *   (회의 쪽 `startAt`과 다른 점).
 */
export interface BeSubscription {
  planCode: string;
  planName: string;
  /** `ACTIVE` · `CANCELING` · `UNPAID` · `EXPIRED` (BE는 `CANCELED`를 `EXPIRED`로 바꿔 내보낸다) */
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  nextBillingDate: string | null;
  carriedOverageAmount: number;
  estimatedAmount: number;
  usage: BeUsage;
}

export interface BeUsage {
  tokens: number;
  voiceStorageGb: number;
  sttStorageGb: number;
  meetingCount: number;
}

/**
 * ⚠️ `id`는 **문자열**이다 — BE가 `"pm_" + id`로 접두사를 붙여 내려준다
 *    (`PaymentMethodResponse.from`). 숫자로 파싱하지 않는다.
 * ⚠️ `expiry`는 `"12/29"` 꼴로 BE가 이미 만들어 준다 — 우리가 날짜에서 조립하지 않는다.
 */
export interface BePaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
}

/**
 * ⚠️ `paidAt`은 BE 필드명이 `paidAt`이지만 값은 `record.getBilledOn()`(청구일)이다.
 *    우리 계약의 `paidAt`도 "결제일"로 쓰고 있어 뜻이 맞는다.
 * ⚠️ `status`는 BE에 `PAID`·`FAILED`·`FREE` 셋이 있는데 **`FREE`는 BE가 걸러서 안 보낸다.**
 *    그래도 올라오면 매퍼가 그 줄을 버린다(아래 `toBillingOverview`) — 우리 화면엔
 *    `FREE` 라벨이 없어서 그리면 빈 칸이 된다.
 */
export interface BePaymentRecord {
  id: string;
  paidAt: string;
  planName: string;
  overageAmount: number;
  amount: number;
  status: string;
}

/**
 * `POST /api/companies/me/subscription/pay` → `BillingPaymentActionResult`.
 *
 * ⚠️ **봉투가 과도기다**(BE PR #461). 지금 배포본은 DTO 맨몸이고, #461부터는
 *    `ApiResponse<T>`로 온다 — 호출부는 `isEnveloped: false`로 원문을 받고
 *    `unwrapTransitionalEnvelope`가 가른다(아래).
 * ⚠️ **실패도 HTTP 200이다.** 결제 실패는 예외가 아니라 값으로 온다(`{ isSuccess:false, ... }`) —
 *    상태 코드로 가르면 실패를 성공으로 읽는다.
 * ⚠️ `failureCode`는 **성공일 때 아예 빠진다**(`@JsonInclude(NON_NULL)`) — `null`이 아니라
 *    키가 없다. 그래서 `undefined`까지 허용한다.
 * ⚠️ 지금 BE가 실제로 내는 코드는 `NO_PAYMENT_METHOD` 하나다(`BillingCommandService.pay`).
 *    결제사(PG)가 붙으면 카드사 코드가 여기로 올라온다 — 문구는 `toFailureMessage`가 정한다.
 */
export interface BePaymentAction {
  isSuccess: boolean;
  failureCode?: string | null;
}

/* ───────── 모양 검사 ───────── */

/*
  ⚠️ `serverApi<T>`는 **단언일 뿐 검사가 아니다**(회의 매퍼 `parseMeetingDetail`과 같은 이유).
     봉투가 어긋나거나 BE가 부분 응답을 주면 `overview.subscription.usage.tokens`에서
     `undefined`를 파고들어 터지는데, 그때 뜨는 건 원인을 알 수 없는 `TypeError`다.
  ⚠️ **여기는 특히 필요하다.** `pay`·`payment-methods`는 봉투가 과도기라(BE PR #461),
     감지가 어긋나거나 벗긴 결과가 `undefined`면 결제 실패가 성공으로 읽힌다 —
     그걸 잡아내는 게 이 검사다(§연동 검증).
  ⚠️ **화면이 실제로 읽는 것만 본다.** 안 쓰는 필드까지 검사하면 BE가 무관한 필드를 바꿀 때마다
     멀쩡한 화면이 막힌다.
*/

/** 금액·수량 — **유한한 숫자**만 통과시킨다. `NaN`·`Infinity`는 화면에서 `NaN원`이 된다. */
function isMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** 날짜 자리 — 값이 있으면 문자열, 없으면 `null`. `undefined`는 "필드가 빠진 것"이라 막는다. */
function isNullableDate(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isBeBillingConfig(value: unknown): value is BeBillingConfig {
  if (typeof value !== "object" || value === null) return false;
  const config = value as Partial<BeBillingConfig>;

  return (
    isMoney(config.baseFee) &&
    isMoney(config.includedTokens) &&
    isMoney(config.includedStorageGb) &&
    isMoney(config.overagePerThousandTokens) &&
    isMoney(config.overagePerGbMonth) &&
    /*
      ⚠️ **이름을 확인한다.** BE가 `@JsonProperty("isVatIncluded")`를 떼면 잭슨이
         `vatIncluded`로 내보내는데, 그러면 여기서 `undefined`가 되어 **VAT가 조용히
         "포함"으로 읽힌다**(`calculatePrice`가 부가세를 안 붙인다) — 금액이 틀리는 쪽이라
         막고 알리는 편이 낫다(§정직성).
    */
    typeof config.isVatIncluded === "boolean"
  );
}

function isBeUsage(value: unknown): value is BeUsage {
  if (typeof value !== "object" || value === null) return false;
  const usage = value as Partial<BeUsage>;

  return (
    isMoney(usage.tokens) &&
    isMoney(usage.voiceStorageGb) &&
    isMoney(usage.sttStorageGb) &&
    isMoney(usage.meetingCount)
  );
}

function isBeSubscription(value: unknown): value is BeSubscription {
  if (typeof value !== "object" || value === null) return false;
  const subscription = value as Partial<BeSubscription>;

  return (
    typeof subscription.planCode === "string" &&
    typeof subscription.planName === "string" &&
    typeof subscription.status === "string" &&
    typeof subscription.currentPeriodStart === "string" &&
    isNullableDate(subscription.currentPeriodEnd) &&
    isNullableDate(subscription.nextBillingDate) &&
    isMoney(subscription.carriedOverageAmount) &&
    isMoney(subscription.estimatedAmount) &&
    isBeUsage(subscription.usage)
  );
}

/**
 * 카드 한 장 — **`payment-methods` 응답도 이 모양**이라 검사를 같이 쓴다
 * (BE가 `BillingOverviewResponse.PaymentMethodResponse`를 그대로 돌려준다).
 */
function isBePaymentMethod(value: unknown): value is BePaymentMethod {
  if (typeof value !== "object" || value === null) return false;
  const method = value as Partial<BePaymentMethod>;

  return (
    typeof method.id === "string" &&
    typeof method.brand === "string" &&
    typeof method.last4 === "string" &&
    typeof method.expiry === "string"
  );
}

/**
 * 결제 내역 한 줄 — **배열인지만 보면 모자란다.** `[null]`이나 모양이 다른 객체는 배열 검사를
 * 그냥 통과하고, 나중에 표를 그릴 때 `TypeError`로 터진다(회의 매퍼와 같은 지적).
 */
function isBePaymentRecord(value: unknown): value is BePaymentRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Partial<BePaymentRecord>;

  return (
    typeof record.id === "string" &&
    typeof record.paidAt === "string" &&
    typeof record.planName === "string" &&
    isMoney(record.overageAmount) &&
    isMoney(record.amount) &&
    typeof record.status === "string"
  );
}

function isBeBillingOverview(value: unknown): value is BeBillingOverview {
  if (typeof value !== "object" || value === null) return false;
  const overview = value as Partial<BeBillingOverview>;

  return (
    isBeSubscription(overview.subscription) &&
    (overview.method === null || isBePaymentMethod(overview.method)) &&
    Array.isArray(overview.payments) &&
    overview.payments.every(isBePaymentRecord)
  );
}

function isBePaymentAction(value: unknown): value is BePaymentAction {
  if (typeof value !== "object" || value === null) return false;
  const action = value as Partial<BePaymentAction>;

  /*
    ⚠️ `failureCode`는 성공이면 **키가 없다**(`@JsonInclude(NON_NULL)`) — `undefined`가 정상이다.
       반대로 `isSuccess`는 늘 온다. 이게 `undefined`면 봉투를 잘못 벗긴 것이다 — 그때 여기서 걸린다.
  */
  return (
    typeof action.isSuccess === "boolean" &&
    (action.failureCode === undefined ||
      action.failureCode === null ||
      typeof action.failureCode === "string")
  );
}

/* ───────── ⚠️ 과도기 봉투 감지 (BE PR #461) — 배포 확정 후 걷어낸다 ───────── */

/**
 * ⚠️ **과도기 허용 — [확인] BE PR #461(`BillingController.pay`/`registerPaymentMethod`).**
 *    `pay`·`payment-methods`는 지금 배포본이 DTO를 맨몸으로 리턴하고, BE #461부터
 *    `ApiResponse<T>` 봉투로 온다. FE·BE가 **어느 순서로 머지·배포돼도** 안전해야 하므로
 *    호출부는 계속 `isEnveloped: false`(원문 그대로)로 받고, 여기서 모양을 보고 가른다 —
 *    공용 봉투(`httpStatus` 숫자 + `data` 키, `lib/api.ts`의 `ApiEnvelope`)면 `data`를 꺼내고,
 *    아니면 맨몸 DTO로 본다.
 * ⚠️ **감지가 안전한 이유:** 여기 오는 두 DTO(`{ isSuccess, failureCode? }` ·
 *    `{ id, brand, last4, expiry }`)에는 `httpStatus`·`data` 키가 없어서 봉투와 혼동될 수 없다.
 *    다른 응답에 일반화하지 않는다 — DTO에 `data` 필드가 있는 순간 이 감지는 거짓말을 한다.
 * ⚠️ **걷어낼 코드다.** BE #461 배포가 전 환경에 확정되면 호출부(`actions.ts`)를
 *    `isEnveloped` 기본값 경로로 되돌리고 이 함수와 감지 갈래 테스트를 지운다.
 */
function unwrapTransitionalEnvelope(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const candidate = raw as { httpStatus?: unknown; data?: unknown };
  if (typeof candidate.httpStatus === "number" && "data" in candidate) return candidate.data;
  return raw;
}

/* ───────── 검사까지 마친 값 ───────── */

/*
  ⚠️ 던지는 건 **여기 한 곳**이다. 화면·`server.ts`가 각자 확인하면 조건이 갈린다(§격리막).
  ⚠️ 문구를 **무엇이 어긋났는지 말하는 말**로 적는다. `잘못된 응답`은 로그에서 아무 도움이 안 된다.
*/

export function parseBillingConfig(raw: unknown): BeBillingConfig {
  if (!isBeBillingConfig(raw)) {
    throw new Error("요금 설정 응답이 약속한 모양이 아닙니다.");
  }
  return raw;
}

export function parseBillingOverview(raw: unknown): BeBillingOverview {
  if (!isBeBillingOverview(raw)) {
    throw new Error("구독 현황 응답이 약속한 모양이 아닙니다.");
  }
  return raw;
}

export function parsePaymentMethod(raw: unknown): BePaymentMethod {
  const bare = unwrapTransitionalEnvelope(raw);
  if (!isBePaymentMethod(bare)) {
    throw new Error("결제 수단 응답이 약속한 모양이 아닙니다.");
  }
  return bare;
}

export function parsePaymentAction(raw: unknown): BePaymentAction {
  const bare = unwrapTransitionalEnvelope(raw);
  if (!isBePaymentAction(bare)) {
    throw new Error("결제 결과 응답이 약속한 모양이 아닙니다.");
  }
  return bare;
}

/* ───────── UI 계약으로 옮기기 ───────── */

/**
 * 구독 상태 — **모르는 값은 던진다.**
 *
 * ⚠️ 기본값으로 흘려보내지 않는다. `ACTIVE`로 떨어뜨리면 못 쓰는 회사에 워크스페이스가 열리고,
 *    `EXPIRED`로 떨어뜨리면 멀쩡히 낸 회사가 잠긴다 — 둘 다 돈이 걸린 거짓말이라,
 *    모르면 모른다고 말하는 편이 낫다(§정직성).
 * ⚠️ BE 값 5개 중 `CANCELED`는 **지금 안 올라온다**(BE가 `EXPIRED`로 바꿔 내보낸다).
 *    그래도 받아 준다 — 이유는 `subscription.ts`의 `CANCELED` 주석에 적어 뒀다.
 */
export function toSubscriptionStatus(raw: string): SubscriptionStatus {
  const known = Object.values(SUBSCRIPTION_STATUS).find((status) => status === raw);
  if (!known) {
    throw new Error(`알 수 없는 구독 상태입니다: ${raw}`);
  }
  return known;
}

/**
 * 결제 상태 — 모르면 `null`이고, **부르는 쪽이 그 줄을 버린다.**
 *
 * ⚠️ 구독 상태와 달리 **던지지 않는다.** 결제 내역은 지나간 기록이라, 옛 행 하나가 `FREE`라고
 *    해서 구독 화면 전체를 막을 이유가 없다 — 그 줄만 빠지면 된다. 반대로 구독 상태는
 *    "지금 쓸 수 있냐"를 정하는 값이라 틀리면 안 된다.
 */
function toPaymentStatus(raw: string): PaymentStatus | null {
  return Object.values(PAYMENT_STATUS).find((status) => status === raw) ?? null;
}

function toUsage(be: BeUsage): UsageCounters {
  return {
    tokens: be.tokens,
    voiceStorageGb: be.voiceStorageGb,
    sttStorageGb: be.sttStorageGb,
    meetingCount: be.meetingCount,
  };
}

/**
 * 구독 한 벌.
 *
 * ⚠️ **`planCode`를 BE 문자열 그대로 넣지 않는다.** 우리 계약은 `PlanCode` 유니온이고 지금 값은
 *    `TEAM` 하나뿐이다 — BE가 다른 코드를 보내면 화면이 모르는 플랜을 그리게 되므로
 *    `PLAN.TEAM`으로 고정한다. 플랜이 늘면 그때 여기서 가른다(§도메인 상수).
 * ⚠️ **`currentPeriodEnd`가 `null`이면 빈 문자열로 낮춘다.** 우리 계약은 `string`인데
 *    (컴포넌트가 이걸 non-null로 읽는다) BE는 nullable이다 — 계약을 `null` 허용으로 넓히면
 *    컴포넌트를 고쳐야 해서 격리막이 깨진다. 빈 문자열은 화면에서 `—`로 떨어진다
 *    (`usage-panel`의 `periodLabel`이 `isReadableDate`로 거른다) — 없는 날짜를 지어내지 않으면서
 *    화면도 안 깨지는 자리다(§정직성).
 *    ⚠️ 실제로 `null`이 오는 건 **결제된 적 없는 행**뿐이고, 그 상태(`UNPAID`)는 게이트 화면이
 *       받아 주기를 잡아서 이 날짜를 안 그린다.
 */
export function toSubscription(be: BeSubscription): Subscription {
  return {
    planCode: PLAN.TEAM,
    planName: be.planName,
    status: toSubscriptionStatus(be.status),
    carriedOverageAmount: be.carriedOverageAmount,
    currentPeriodStart: be.currentPeriodStart,
    nextBillingDate: be.nextBillingDate,
    estimatedAmount: be.estimatedAmount,
    currentPeriodEnd: be.currentPeriodEnd ?? "",
    usage: toUsage(be.usage),
  };
}

export function toPaymentMethod(be: BePaymentMethod): PaymentMethod {
  return { id: be.id, brand: be.brand, last4: be.last4, expiry: be.expiry };
}

/**
 * 구독 현황 한 화면.
 *
 * ⚠️ **모르는 상태의 결제 줄은 버린다**(`FREE` 등). 지금 BE가 `FREE`를 걸러서 보내므로
 *    실제로는 안 오지만, 오면 우리 표엔 라벨이 없어 상태 칸이 빈 채로 그려진다 —
 *    빈 줄을 그리느니 안 그리는 게 낫다.
 */
export function toBillingOverview(be: BeBillingOverview): BillingOverview {
  const payments: PaymentRecord[] = [];

  for (const record of be.payments) {
    const status = toPaymentStatus(record.status);
    if (!status) continue;

    payments.push({
      id: record.id,
      paidAt: record.paidAt,
      planName: record.planName,
      overageAmount: record.overageAmount,
      amount: record.amount,
      status,
    });
  }

  return {
    subscription: toSubscription(be.subscription),
    method: be.method === null ? null : toPaymentMethod(be.method),
    payments,
  };
}

/**
 * 요금 설정 — 이름이 같아도 **한 번 옮겨 담는다.**
 *
 * ⚠️ `return be`로 넘기면 BE 응답 객체가 그대로 화면까지 간다. 지금은 필드가 같지만 BE가
 *    필드를 하나 더 붙이는 순간 계약에 없는 값이 화면에 흘러들어, 누군가 그걸 읽기 시작한다 —
 *    그러면 격리막이 없는 것과 같다.
 */
export function toBillingConfig(be: BeBillingConfig): BillingConfig {
  return {
    baseFee: be.baseFee,
    includedTokens: be.includedTokens,
    includedStorageGb: be.includedStorageGb,
    overagePerThousandTokens: be.overagePerThousandTokens,
    overagePerGbMonth: be.overagePerGbMonth,
    isVatIncluded: be.isVatIncluded,
  };
}
