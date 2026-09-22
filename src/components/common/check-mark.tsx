import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface CheckMarkProps {
  /** 한 변(px). 설명 목록은 14, 요약 줄은 16, 완료 배지 안은 13을 쓴다. */
  size?: number;
  /** 작게 쓸 때는 굵게 — 안 그러면 흐리게 보인다 */
  strokeWidth?: number;
  className?: string;
}

/**
 * 다 됐다는 표시 — 테두리 없이 **먹색 체크만**.
 *
 * 온보딩 좌측 설명·완료 요약·완료 배지가 전부 이걸 쓴다. 한 군데만 다른 모양이면
 * 그 줄만 덜 만든 것처럼 보인다.
 * ⚠️ 초록을 쓰지 않는다(CLAUDE.md §디자인 토큰: 색으로 알리는 건 에러뿐).
 */
export function CheckMark({ size = 16, strokeWidth = 2.5, className }: CheckMarkProps) {
  return (
    <Check
      style={{ width: size, height: size }}
      strokeWidth={strokeWidth}
      className={cn("text-foreground shrink-0", className)}
      aria-hidden
    />
  );
}
