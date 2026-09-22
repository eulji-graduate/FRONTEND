import { Progress as ProgressPrimitive } from "@base-ui/react/progress"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/**
 * 진척 바. base-ui `Progress`라 값(0~100)에 맞춰 인디케이터 폭이 자동으로 잡힌다.
 * ⚠️ 트랙 폭은 부르는 쪽이 정한다(`className`으로 `w-32` 등) — 화면마다 길이가 다르다.
 * ⚠️ 트랙을 **`--muted`로 깔 수 없다**(2026-08-10). 라이트에서 `--muted`(#fafaf9)는 카드
 *    흰색과 **1.02:1**이라, 0%일 때 바 전체가 트랙이 되면서 **아무것도 안 보인다** —
 *    값이 0인 건지 그려지다 만 건지 알 수가 없다(표 머리 띠에서 겪은 것과 같은 문제,
 *    `features/system/table-style.ts`). 먹색을 옅게 깔면 한 클래스로 두 테마가 다 된다.
 */
function Progress({ className, value, ...props }: ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn("w-full", className)}
      {...props}
    >
      <ProgressPrimitive.Track className="bg-foreground/10 relative h-1.5 w-full overflow-hidden rounded-full">
        <ProgressPrimitive.Indicator className="bg-foreground h-full rounded-full transition-all" />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
