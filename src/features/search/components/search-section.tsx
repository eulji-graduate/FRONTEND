import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 검색 화면의 한 덩이 — **가벼운 라벨 + 내용**이다.
 *
 * ⚠️ **카드 껍데기를 씌우지 않는다**(2026-08-10 되돌림). 한때 대시보드처럼 `표식 + 17px 제목 +
 *    테두리`로 감쌌는데, 이 화면은 **찾으러 온 사람이 훑는 자리**라 덩이마다 테두리가 생기니
 *    껍데기가 내용보다 커졌다 — 시안이 라벨만 둔 이유다.
 * ⚠️ 라벨은 12px 보조색이다. 여기서 제목을 키우면 정작 봐야 할 **결과**보다 라벨이 먼저 읽힌다.
 * ⚠️ 오른쪽 `meta`는 개수처럼 한 번만 말하면 되는 값이다.
 */

interface SearchSectionProps {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SearchSection({ title, meta, children, className }: SearchSectionProps) {
  return (
    <section className={cn("flex flex-col", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-muted-foreground text-[12px] leading-4">{title}</h2>
        {meta && (
          <span className="text-muted-foreground/70 shrink-0 text-[12px] leading-4 tabular-nums">
            {meta}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
