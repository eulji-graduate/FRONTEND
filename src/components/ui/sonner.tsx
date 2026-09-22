"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * 변경 결과 토스트(DECISIONS: 토스트 — 결과 피드백).
 * 루트 레이아웃에 **하나만** 둔다.
 *
 * ⚠️ 색은 토큰만 쓴다 — 먹색 배경/밝은 글자라 다크에서도 자동으로 뒤집힌다.
 */
export function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      // 컨테이너 폭을 줄여 토스트가 화면 가운데에 오게 한다.
      // 토스트는 컨테이너 안에서 절대 배치라 margin:auto로는 가운데로 못 민다 —
      // 컨테이너 폭(--width)이 곧 토스트 폭이다.
      /*
        컨테이너 폭을 줄여 토스트가 화면 가운데에 오게 한다.
        ⚠️ 토스트는 컨테이너 안에서 **절대 배치**라 `margin: auto`로는 못 민다 —
           컨테이너 폭(`--width`)이 곧 토스트 폭이다. 내용만큼만 차지하게 만들려고
           `width: auto`를 줘 봤지만, 그러면 왼쪽이나 오른쪽 끝에 붙는다(sonner가 위치를
           애니메이션으로 잡아서 좌우를 동시에 고정할 수 없다). **폭은 고정으로 둔다.**
        ⚠️ 220px이 **더 못 줄이는 선**이다. 좌우 여백(18px씩)을 빼면 글자 자리가 184px인데,
           `기본 결제 수단을 변경했습니다`(14자)가 157px이다 — 더 좁히면 한 줄 문구가 잘린다.
      */
      style={{ "--width": "220px" } as React.CSSProperties}
      toastOptions={{
        // sonner가 자체 배경색을 먼저 칠한다 — 토큰을 인라인으로 덮어써야 먹색이 유지된다.
        // 순검정으로 보이지 않게 배경색을 한 스푼 섞는다(다크모드에서도 같은 규칙으로 눅는다).
        style: {
          background: "color-mix(in oklab, var(--foreground) 88%, var(--background))",
          color: "var(--background)",
          border: "none",
          padding: "11px 18px",
          // ⚠️ sonner가 `[data-sonner-toast]`에 자체 반지름을 준다 — 클래스로는 못 이겨서 인라인으로 준다
          borderRadius: "999px",
        },
        classNames: {
          // 한 줄짜리 알림이 대부분이라 가운데 정렬로 둔다.
          // ⚠️ 설명(description)이 붙는 토스트는 호출할 때 `classNames`로 왼쪽 정렬을 준다 —
          //    두 줄이 가운데 정렬되면 줄 끝이 들쭉날쭉해 읽기 어렵다.
          /*
            ⚠️ **알약**이다(`rounded-full`). 네모난 상자는 화면 위에 얹힌 판처럼 보이는데,
               토스트는 잠깐 떴다 사라지는 것이라 가벼워 보여야 한다.
            ⚠️ `mx-auto`가 필요하다 — 폭이 내용만큼이라 컨테이너 안에서 왼쪽에 붙는다.
          */
          toast: "items-center justify-center rounded-full text-center text-[13px] shadow-md gap-2",
          /*
            ⚠️ 제목은 **한 줄**이다(`line-clamp-1`). 공용이라 어느 화면에서 긴 문장을 넣을지
               모르는데, 두 줄이 되는 순간 알약이 판처럼 커져 화면 위에 얹힌 상자가 된다.
               토스트는 "됐다"만 알리는 자리다 — 자세한 건 화면이 말한다(DECISIONS §토스트).
          */
          title: "font-medium! line-clamp-1",
          description: "text-background/70! text-xs! leading-[18px]!",
          /*
            **실패는 알약째 빨강이다.**

            ⚠️ 아이콘만 빨갛게 칠하는 방법을 먼저 봤는데, **한 색으로는 두 모드를 못 맞춘다.**
               이 알약은 배경이 `--foreground` 기반이라 모드마다 뒤집힌다 — 라이트에서는
               거의 검정(51,48,46), 다크에서는 거의 흰색(220,219,218)이다. 같은 빨강의
               대비가 정반대로 움직여서, `#ef4444`는 라이트 3.48로 되지만 다크 2.72로 미달이고
               (아이콘 기준 3:1), 더 진한 `#dc2626`은 그 반대다.
            ⚠️ 배경을 `--destructive`로 칠하고 글자를 흰색으로 두면 **두 모드가 같은 조합**이
               되어 뒤집힘이 사라진다. 흰 글자 위 `#ef4444`는 어느 모드에서나 같은 대비다.
            ⚠️ 빨강을 여기 쓰는 건 규칙 위반이 아니다 — DESIGN §5가 색으로 알리도록 허용한
               유일한 자리가 **에러**다. 토스트는 사라지는 보조 알림인데 실패는 놓치면 안 된다.
            ⚠️ 글자·아이콘은 **`--destructive-foreground` 토큰**이다. 생 `white`를 쓰면
               토큰만 쓴다는 규칙이 깨지고, 나중에 에러 면 색을 바꿀 때 짝이 따로 논다.
            ⚠️ 면은 `--destructive`가 아니라 **`--destructive-surface`**(한 단 어둡다)다.
               `--destructive`(#ef4444) 위 흰 글자는 **3.76:1**이라 본문 기준 4.5:1에 못 미친다 —
               처음에 아이콘 기준 3:1만 따지다 놓쳤다. #dc2626은 4.83:1이라 통과한다.
            ⚠️ **설명줄의 `/70` 감쇠를 걷었다.** 기본 토스트는 먹색 면이라 흐려도 읽히지만
               이 면에서는 2.98:1까지 떨어진다. 층은 **글자 크기**(13px/12px)가 이미 만든다.
            ⚠️ 인라인 `style`이 클래스를 이기므로 `!`로 되받는다.
          */
          error:
            "bg-destructive-surface! text-destructive-foreground! [&_[data-description]]:text-destructive-foreground! [&_[data-icon]]:text-destructive-foreground!",
          // ⚠️ sonner 기본 성공 아이콘은 **초록**이다. 색으로 알리는 건 에러뿐이라 글자색을 따르게 한다.
          icon: "text-background! m-0! size-4! shrink-0 [&>svg]:size-4 [&_*]:fill-current [&_*]:stroke-current",
          actionButton: "bg-background! text-foreground!",
          cancelButton: "bg-background/20! text-background!",
        },
      }}
      {...props}
    />
  );
}
