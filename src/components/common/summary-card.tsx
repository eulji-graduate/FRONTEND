import { cn } from "@/lib/utils";

interface SummaryItem {
  label: string;
  value: string;
  /**
   * 값 뒤에 붙는 단위(`건`·`명` 등).
   *
   * ⚠️ **값에 붙여 쓰지 않는다.** `"3건"`으로 한 덩이면 `건`까지 30px로 커져 숫자와 같은
   *    무게로 읽힌다 — 먼저 읽혀야 하는 건 숫자다. 갈라 두면 단위를 작고 흐리게 붙일 수 있다.
   * ⚠️ **없던 단위를 만들지 않는다.** 원래 안 붙던 값(`62`·`₩8.4M`)은 그대로 둔다.
   */
  unit?: string;
  meta: string;
}

interface SummaryCardProps {
  items: SummaryItem[];
}

/**
 * 페이지 상단 통계 — DESIGN.md "요약 카드: 세 칸 균등" 패턴.
 *
 * ⚠️ **운영자 화면 전용이 아니다**(2026-08-10 `features/system`에서 옮겨 왔다). 오너·팀장
 *    대시보드가 각자 4장짜리 미니 카드(`kpi-card.tsx`)를 두고 있었는데, 그건 §2가 하지 말라는
 *    "카드 안에 카드"였고 값도 20px이라 같은 자리가 화면마다 다르게 보였다 — 한 자리로 모은다.
 * ⚠️ 칸은 세로선(`lg:border-l`)으로만 가른다. 카드 안에 카드(개별 mini-card)를 얹지 않는다.
 * ⚠️ 값 강조는 색이 아니라 명도다 — `accent`/`warning`/`danger` 같은 톤을 따로 두지 않는다(§5).
 * ⚠️ **큰 숫자는 30px다**(DESIGN §4). 한때 20px이었는데, 카드 안쪽이 `p-7`이라 숫자만 작고
 *    위아래가 휑해서 "요약"이 아니라 빈 띠로 읽혔다 — 이 카드에서 제일 먼저 읽혀야 하는 게 값이다.
 * ⚠️ **보조 문구를 흐리게 두지 않는다.** `text-muted-foreground/70`이었는데 흰 카드 위에서
 *    대비가 2.7:1까지 떨어졌다(11px 본문은 4.5:1이 필요하다 — WCAG). 알파를 걷어내면
 *    같은 먹색이 4.8:1이 된다. 흐리게 만들지 않아도 큰 숫자와 충분히 갈린다.
 */
export function SummaryCard({ items }: SummaryCardProps) {
  return (
    <section className="border-border bg-card rounded-2xl border px-7 py-6">
      <div
        className={cn(
          "grid gap-6 lg:items-center lg:gap-0",
          items.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4",
        )}
      >
        {items.map((item, index) => (
          <div
            key={item.label}
            className={cn(
              "flex flex-col items-center gap-1 text-center lg:px-6",
              index > 0 && "border-border lg:border-l",
            )}
          >
            <p className="text-muted-foreground text-[12px] leading-4">{item.label}</p>
            <p className="flex items-baseline justify-center gap-0.5">
              <span className="text-[30px] leading-9 font-semibold tracking-[-0.8px] tabular-nums">
                {item.value}
              </span>
              {item.unit && (
                <span className="text-muted-foreground text-[13px] leading-5 font-medium">
                  {item.unit}
                </span>
              )}
            </p>
            <p className="text-muted-foreground text-[12px] leading-4">{item.meta}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
