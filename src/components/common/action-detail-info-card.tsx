import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export interface ActionDetailInfoItem {
  key: string;
  icon: LucideIcon;
  label: string;
  content: ReactNode;
  /** 있으면 그 항목의 상세로 이동(클릭 가능). 없으면 텍스트만(예: 아직 없는 라우트). */
  href?: string;
}

/**
 * 액션 상세(팀 액션·개인 액션 공용)의 세부 정보 줄들.
 *
 * ⚠️ **카드가 아니라 줄 묶음이다**(2026-08-10). 전에는 오른쪽에 따로 선 sticky 카드였는데,
 *    이 화면들이 담는 것은 설명 한 문단과 값 서너 개뿐이라 2컬럼으로 벌리면 왼쪽 글이
 *    1000px까지 늘어나고(읽는 글은 좁게 둔다 — DESIGN §4) 아래는 통째로 비었다.
 *    한 카드 안에 **설명 → 값**으로 쌓으면 화면이 내용만큼만 차지한다.
 * ⚠️ 항목은 호출부가 조합한다 — 화면마다 있고 없는 항목이 달라 이 컴포넌트는 순서를 모른다.
 */
export function ActionDetailInfoRows({ items }: { items: ActionDetailInfoItem[] }) {
  return (
    <div className="divide-border border-border flex flex-col divide-y border-t">
      {items.map((item) => {
        const Icon = item.icon;
        const row = (
          <div className="flex items-center gap-3 px-7 py-4">
            <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
              <Icon className="text-muted-foreground size-4" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-muted-foreground text-[11px] leading-4">{item.label}</p>
              <div className="text-[13px] leading-5 font-medium">{item.content}</div>
            </div>
            {item.href && (
              <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
            )}
          </div>
        );

        return item.href ? (
          <Link
            key={item.key}
            href={item.href}
            className="hover:bg-foreground/[0.03] transition-colors"
          >
            {row}
          </Link>
        ) : (
          <div key={item.key}>{row}</div>
        );
      })}
    </div>
  );
}
