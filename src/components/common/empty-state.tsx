import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** 무엇이 비었는지 알리는 아이콘 — `lucide-react` 표준(§디자인 토큰: 이모지 금지) */
  icon: LucideIcon;
  /** 한 문장. 무엇이 없는지 그대로 적는다. */
  title: string;
  /** 다음에 무엇을 하면 되는지 — 할 말이 없으면 비워 둔다. */
  description?: string;
  /** [+ 만들기] 같은 다음 걸음. 링크·버튼 하나만 둔다. */
  action?: ReactNode;
  /** 표가 시작하는 자리에 놓일 때 위에 선을 긋는다(카드 안의 선은 그 한 곳뿐 — §DESIGN 2). */
  bordered?: boolean;
  className?: string;
}

/**
 * 빈 상태 — **한 곳에서 만든다.**
 *
 * ⚠️ 전에는 화면마다 `<p className="... text-center">없습니다</p>` 한 줄이었다(2026-08-11).
 *    카드 제목 바로 밑에 회색 글씨 한 줄만 남아 **카드가 반쯤 지어지다 잘린 것처럼** 보였고,
 *    여백도 `p-10`·`py-12`·`py-14`로 화면마다 달라 같은 "없음"이 다른 크기로 떴다.
 * ⚠️ 아이콘은 **무엇이 없는지**를 가리킨다(회의가 없으면 캘린더, 사람이 없으면 사람).
 *    장식이 아니라 훑을 때 걸리는 표식이라, 화면마다 제 도메인 아이콘을 넘긴다.
 * ⚠️ **색을 쓰지 않는다.** 비어 있는 건 문제가 아니다 — 색으로 알리는 건 에러(빨강)뿐이라
 *    (§DESIGN 5), 여기는 표면(`--secondary`)과 흐린 글자만 쓴다.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  bordered,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-7 py-14 text-center",
        bordered && "border-border border-t",
        className,
      )}
    >
      {/*
        ⚠️ 아이콘 상자는 **동그라미가 아니라 둥근 사각형**이다. 원은 아바타가 쓰는 모양이라
           (§DESIGN 5) 사람이 없다는 뜻으로 잘못 읽힌다.
      */}
      <span
        className="bg-secondary text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl"
        aria-hidden
      >
        <Icon className="size-5" strokeWidth={1.75} />
      </span>

      <div className="flex flex-col gap-1">
        <p className="text-[13px] leading-5 font-medium">{title}</p>
        {description && (
          <p className="text-muted-foreground max-w-[420px] text-[12px] leading-[18px] break-keep">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}
