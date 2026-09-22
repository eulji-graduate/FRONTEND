import type { UsageCounters } from "./subscription";
import type { BillingConfig } from "./types";

/**
 * 사용량 — **청구 지표**다.
 *
 * 기본료에 포함량이 딸려 오고, 넘긴 만큼만 금액으로 표기한다.
 * 축은 둘뿐이다 — **① AI 토큰 ② 스토리지(음성 + 자막·요약)**.
 *
 * ⚠️ **초과해도 막지 않는다**(팀 확정). 결제 유도도 하지 않는다 —
 *    "이만큼 넘었고 금액이면 ₩X"까지만 보여준다.
 * ⚠️ 여기 계산은 전부 **표시용**이다. 실제 청구는 서버가 정한다.
 */

/**
 * 축마다 성격이 다르다 — **토큰은 주기마다 0으로 돌아가고, 스토리지는 쌓인다.**
 *
 * ⚠️ 이걸 같게 다루면 예측이 터진다. 스토리지에 "쓴 양 ÷ 지난 일수 × 주기 일수"를 쓰면
 *    **지난 달까지 쌓여 있던 40GB까지 이번 주기에 쓴 것으로 보고 곱한다.**
 */

/** 어느 축이 얼마나 남았는지 — 화면 한 줄이 필요로 하는 전부 */
export interface UsageAxis {
  /** 화면에 그대로 나가는 이름 — `AI 토큰`·`저장 공간` */
  label: string;
  used: number;
  /** 기본료에 포함된 양 */
  included: number;
  /** 소진율(0~1). 넘기면 1보다 커진다 — **1로 자르지 않는다**, 얼마나 넘겼는지가 중요하다 */
  ratio: number;
  /** 지금까지 넘긴 양. 아직 안 넘겼으면 0 */
  overage: number;
  /** 넘긴 만큼의 금액(원) — **표시용**이고 실제 청구는 서버가 한다 */
  overageAmount: number;
}

/*
  ⚠️ **예상 사용량은 프론트가 만들지 않는다**(2026-08-05 제거). `쓴 양 ÷ 지난 일수 × 주기 일수`로
     늘려 잡았는데, 회의는 주중에 몰리고 주말엔 0이라 주기 초반 며칠로 한 달을 추정하면 크게
     틀린다. 금액을 못 믿어서 안 만들면서 양은 만드는 것도 앞뒤가 안 맞았다.
     BE 스펙에 예측 필드가 생기면 **그 값을 받아 쓴다** — 우리가 계산하지 않는다(§연동 검증).
*/

/**
 * 넘긴 만큼의 금액.
 *
 * ⚠️ **단위당 단가를 비례로** 매긴다. 토큰은 1,000개당, 스토리지는 1GB당이라
 *    조금 넘겨도 한 묶음을 통째로 받지 않는다.
 */
function calculateOverageAmount(params: {
  overage: number;
  /** 단가가 걸리는 단위 — 토큰이면 1,000, 스토리지면 1 */
  unitSize: number;
  /** 단위당 금액(원) */
  unitRate: number;
}): number {
  const { overage, unitSize, unitRate } = params;
  if (overage <= 0 || unitSize <= 0) return 0;

  return Math.round((overage / unitSize) * unitRate);
}

function toAxis(params: {
  label: string;
  used: number;
  included: number;
  unitSize: number;
  unitRate: number;
}): UsageAxis {
  const { label, used, included, unitSize, unitRate } = params;
  const overage = Math.max(0, used - included);

  return {
    label,
    used,
    included,
    // 포함량이 0이면 나눌 수 없다 — 쓴 게 있으면 전부 초과로 본다
    ratio: included > 0 ? used / included : used > 0 ? 1 : 0,
    overage,
    overageAmount: calculateOverageAmount({ overage, unitSize, unitRate }),
  };
}

/** 이번 주기 사용 현황 두 축 — 화면은 이 결과만 본다 */
export function buildUsage(params: { config: BillingConfig; usage: UsageCounters }): {
  tokens: UsageAxis;
  storage: UsageAxis;
  overageTotal: number;
} {
  const { config, usage } = params;

  const tokens = toAxis({
    label: "AI 토큰",
    used: usage.tokens,
    included: config.includedTokens,
    unitSize: 1_000,
    unitRate: config.overagePerThousandTokens,
  });

  const storage = toAxis({
    label: "저장 공간",
    used: usage.voiceStorageGb + usage.sttStorageGb,
    included: config.includedStorageGb,
    unitSize: 1,
    unitRate: config.overagePerGbMonth,
  });

  return {
    tokens,
    storage,
    overageTotal: tokens.overageAmount + storage.overageAmount,
  };
}

/**
 * 경고를 띄울 문턱 — 소진율 80%.
 *
 * ⚠️ 넘긴 뒤에 알리면 늦다. 회의를 미루거나 음성을 지우는 선택지가 남아 있을 때 알려야 한다.
 */
export const USAGE_WARN_RATIO = 0.8;

export function shouldWarnUsage(axis: UsageAxis): boolean {
  return axis.ratio >= USAGE_WARN_RATIO;
}
