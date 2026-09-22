import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface TaskGroupSectionProps {
  icon: LucideIcon;
  title: string;
  count: number;
  emptyMessage: string;
  children: ReactNode;
}

/**
 * 마이페이지 "처리할 일" 탭의 그룹 카드 — 회의 관련 두 그룹("미확정 액션"·"요약이
 * 중단된 회의")이 같은 모양을 쓴다(`features/meeting/review/action-review-group.tsx`와
 * 같은 결 — 카드 헤더에 아이콘+제목+건수, 없으면 빈 문구).
 */
export function TaskGroupSection({
  icon: Icon,
  title,
  count,
  emptyMessage,
  children,
}: TaskGroupSectionProps) {
  return (
    <section className="border-border bg-card flex h-full flex-col rounded-2xl border">
      {/*
        ⚠️ **아이콘과 제목이 한 줄이다**(2026-08-11). `h2` 안에 svg를 그냥 넣어 뒀더니
           (preflight가 `svg { display: block }`이라) 아이콘이 제목 **위에 한 층**으로 서서
           머리가 두 줄이 됐다 — 회의 검토 화면이 같은 함정을 맞았다.
      */}
      {/*
        ⚠️ **선이 바로 오는 머리는 `pb-5`다**(2026-08-11). `pb-3`이면 제목 위(24)와 아래(12)가
           두 배 차이라, 제목이 아래 선에 붙어 본문에 눌린 것처럼 보인다 — 표 머리 띠가
           오는 카드는 띠의 여백(12)이 더해져 24가 되지만, 여기는 맨 선이라 그게 없다.
           §DESIGN 4가 이미 열어 둔 예외(툴바가 든 머리)와 같은 값을 쓴다.
      */}
      <div className="flex items-center justify-between gap-3 px-7 pt-6 pb-5">
        <h2 className="flex items-center gap-2 text-[17px] leading-7 font-semibold tracking-[-0.3px]">
          <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
          {title}
        </h2>
        <p className="text-muted-foreground text-[12px] leading-4 tabular-nums">{count}건</p>
      </div>
      {count === 0 ? (
        <p className="text-muted-foreground border-border border-t px-7 py-10 text-center text-[13px] leading-5">
          {emptyMessage}
        </p>
      ) : (
        /* ⚠️ 카드 안의 선은 **표가 시작하는 자리** 하나다(§DESIGN 2) — 머리와 줄을 여기서 나눈다 */
        <div className="border-border flex flex-col border-t">{children}</div>
      )}
    </section>
  );
}
