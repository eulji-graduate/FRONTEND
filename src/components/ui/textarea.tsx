import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 여러 줄 입력 — `Input`과 같은 시각 계약을 공유한다(2026-08-19, #654).
 *
 * ⚠️ 이 부품이 생기기 전에는 **일곱 화면이 각자 `<textarea>` 클래스를 손으로 적고 있었다** —
 *    placeholder 명도(100%/70%)·배경(`bg-card`/`bg-transparent`)·패딩(3종)·다크 대응
 *    (한 곳만 `dark:bg-input/30`)이 화면마다 달랐다. 같은 "여러 줄 입력"이 화면을 옮길
 *    때마다 다르게 생기면 그때마다 다른 부품처럼 읽힌다.
 * ⚠️ **다크 배경(`dark:bg-input/30`)·`aria-invalid` 테두리는 여기(공용 부품)만 안다** —
 *    화면 컴포넌트에 `dark:`를 직접 쓰는 것은 토큰 규칙 위반이다(§디자인 토큰).
 * ⚠️ `resize-none`이 기본이다. 손잡이로 늘리면 폼 레이아웃이 밀린다 — 늘어나는 화면이
 *    필요해지면 그 화면이 `resize-y`를 얹는다.
 * ⚠️ 글자 크기 13px·패딩 `px-2.5 py-2`가 기본(폼 표준). 컴팩트한 자리(검토 인라인 편집)는
 *    `text-[12px] py-1.5`를 얹어 쓴다 — 기본을 12px로 내리면 폼 쪽 일곱 화면이 다 바뀐다.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-[13px] leading-5 transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
