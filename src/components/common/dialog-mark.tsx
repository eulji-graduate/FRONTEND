import { X } from "lucide-react";

import { CheckMark } from "@/components/common/check-mark";
import { ZLogo } from "@/components/icons/z-logo";

interface DialogMarkProps {
  /**
   * 오른쪽 위 배지.
   * `check` = 됐다 · `alert` = 안 됐다 · `none` = 아직 아무 일도 없다.
   *
   * ⚠️ `none`은 **묻지도 알리지도 않는 창**(값만 보여주는 상세)용이다. 체크를 달면
   *    "이미 끝났다"로 읽히고 느낌표를 달면 "잘못됐다"로 읽힌다 — 둘 다 거짓이다.
   */
  badge?: "check" | "alert" | "none";
}

/**
 * 모달 표식 — **`ResultDialog`·`ConfirmDialog`가 같이 쓴다.**
 *
 * 빈 원에서 먹색이 차오르고(`animate-fill-in`) 그 위에 Z가 얹힌다(`animate-mark-in`).
 * 세 창이 같은 표식으로 열려야 같은 서비스의 창으로 읽힌다 — 그래서 각자 그리지 않고 여기 하나만 둔다.
 *
 * ⚠️ 원과 Z는 **어느 창이든 같다.** 결과가 좋든 나쁘든 창을 여는 몸짓은 하나다.
 *    달라지는 건 오른쪽 위 배지뿐이다.
 * ⚠️ 실패 배지에만 빨강을 쓴다 — 색으로 알리는 건 에러뿐이다(§디자인 토큰).
 *    그마저도 배지 하나로 끝내고, 원까지 빨갛게 물들이지 않는다.
 */
export function DialogMark({ badge = "check" }: DialogMarkProps) {
  const isAlert = badge === "alert";

  return (
    <span className="relative" aria-hidden>
      <span className="border-border relative flex size-[68px] items-center justify-center rounded-full border">
        <span className="bg-foreground animate-fill-in absolute inset-0 rounded-full" />
        <ZLogo className="text-background animate-mark-in relative size-7" />
      </span>

      {/* 검은 원 위에 걸치므로 테두리가 있어야 원이 파먹힌 것처럼 안 보인다 */}
      {badge !== "none" && (
        <span className="animate-mark-in absolute -top-0.5 -right-0.5">
          <span
            className={
              isAlert
                ? "bg-card border-destructive animate-float flex size-5 items-center justify-center rounded-full border"
                : "bg-card border-foreground animate-float flex size-5 items-center justify-center rounded-full border"
            }
          >
            {isAlert ? (
              <X className="text-destructive size-[11px]" strokeWidth={3} />
            ) : (
              <CheckMark size={11} strokeWidth={3} />
            )}
          </span>
        </span>
      )}
    </span>
  );
}
