import type { BillingConfig } from "./types";

/**
 * 금액 계산 — **기본료 + 초과분**.
 *
 * ⚠️ **좌석 과금이 아니다**(2026-08-04 팀 확정). 인원은 금액에 아무 영향이 없고,
 *    금액을 움직이는 건 AI 토큰과 스토리지 사용량뿐이다.
 *    좌석 슬라이더·좌석 하한·좌석 일할계산은 전부 걷어냈다.
 * ⚠️ **결제 주기는 월간뿐이다.** 연간을 두면 1년치를 미리 냈는데 초과분만 매달 따로 빠져
 *    "언제 얼마가 나가는지"가 복잡해진다(팀 확정).
 * ⚠️ **실청구는 없다.** 여기 값은 전부 화면에 보여주기 위한 것이고, 실제 청구는
 *    PG 연동 후 서버가 한다 — 화면 숫자와 청구서가 갈리면 서버 값을 받아 쓴다.
 */

/** 부가세율 — 10% */
const VAT_RATE = 0.1;

/** 하루를 밀리초로. 날짜 차이를 일수로 바꿀 때 쓴다 */

interface PriceBreakdown {
  /** 월 기본료(원) */
  baseFee: number;
  /** 이번에 더해지는 초과분(원). 없으면 0 */
  overage: number;
  /** 기본료 + 초과분 (부가세 전) */
  subtotal: number;
  vat: number;
  total: number;
}

/**
 * 이번 달 청구 금액.
 *
 * ⚠️ **원 단위에서 반올림한다.** 소계를 먼저 확정한 뒤 그 값으로 부가세를 매긴다 —
 *    순서가 바뀌면 합계가 1원씩 달라진다.
 * ⚠️ 설정에 부가세가 이미 포함돼 있으면(`isVatIncluded`) 다시 붙이지 않는다.
 */
export function calculatePrice(config: BillingConfig, overageAmount = 0): PriceBreakdown {
  const baseFee = Math.max(0, config.baseFee);
  const overage = Math.max(0, Math.round(overageAmount));
  const subtotal = baseFee + overage;
  const vat = config.isVatIncluded ? 0 : Math.round(subtotal * VAT_RATE);

  return { baseFee, overage, subtotal, vat, total: subtotal + vat };
}

/** 금액 표기 — `₩150,000`. 자릿점은 로케일에 맡기지 않는다(서버·클라이언트가 갈릴 수 있다). */
export function formatWon(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

/**
 * 토큰 수 표기 — **숫자를 그대로 보여준다**(`1,500,000`).
 *
 * ⚠️ 전에는 `150만`으로 접었는데 되돌렸다. 타깃이 개발자라 "AI 토큰 기반"이 차별점이고,
 *    회의 N회 같은 환산이 오히려 무엇을 파는지 흐린다(팀 확정 2026-08-04).
 */
export function formatTokens(value: number): string {
  return Math.round(value).toLocaleString("ko-KR");
}

/** 용량 표기 — `31.4GB`. 소수 첫째 자리까지만 본다 */
export function formatGb(value: number): string {
  return `${Math.round(value * 10) / 10}GB`;
}
