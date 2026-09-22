import { cn } from "@/lib/utils";

/**
 * SYSTEM 화면 전용 상태 배지 — **상태는 색이 아니라 글자로 알린다**(DESIGN §5·
 * `payment-history-panel.tsx`와 같은 규칙). 진짜 실패(`negative`)만 빨강이고,
 * 나머지는 전부 같은 무채색 pill이다 — 라벨 문구가 뜻을 전달한다.
 */
export const STATUS_TONE = {
  positive: "bg-secondary text-foreground",
  warning: "bg-secondary text-foreground",
  negative: "bg-destructive/10 text-destructive",
  neutral: "bg-secondary text-muted-foreground",
} as const;

export type StatusTone = keyof typeof STATUS_TONE;

interface StatusBadgeProps {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center rounded-full px-2 text-[12px] leading-4 font-medium whitespace-nowrap",
        STATUS_TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
