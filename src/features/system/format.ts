/**
 * 큰 금액을 축약 표기한다 — `8400000` → `₩8.4M`.
 * ⚠️ 소수점이 `.0`이면 떼어낸다 — `₩8.0M`처럼 어색한 꼬리를 남기지 않는다.
 */
export function formatCompactKrw(amount: number): string {
  const scale = (value: number, divisor: number, unit: string) =>
    `₩${(value / divisor).toFixed(1).replace(/\.0$/, "")}${unit}`;

  if (amount >= 100_000_000) return scale(amount, 100_000_000, "억");
  if (amount >= 1_000_000) return scale(amount, 1_000_000, "M");
  if (amount >= 1_000) return scale(amount, 1_000, "K");
  return `₩${amount.toLocaleString("ko-KR")}`;
}

/** 금액 표기 — `₩118,800`. 자릿점은 로케일에 맡기지 않는다(서버·클라이언트가 갈릴 수 있다). */
export function formatWon(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}
