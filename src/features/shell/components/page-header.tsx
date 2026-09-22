import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { BackLink } from "@/components/common/back-link";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { NotificationBell } from "@/features/notification/components/notification-bell";

interface PageHeaderProps {
  /** 화면 제목. 페이지마다 `h1`은 하나뿐이다(CLAUDE.md §SEO·a11y) */
  title: string;
  /** 제목 왼쪽 아이콘 — 화면 성격을 한눈에 알린다. 없으면 제목만 나온다 */
  icon?: LucideIcon;
  /** 오른쪽 끝 상태 한 줄 — 온보딩의 `단계 3 / 3`과 같은 자리다 */
  meta?: ReactNode;
  /**
   * 되돌아갈 곳. **사이드바에서 바로 닿는 화면에는 두지 않는다** —
   * 목록에서 상세로 들어가는 것처럼 한 단계 더 깊은 화면에서만 쓴다.
   */
  backTo?: { href: string; label: string };
  /** 오른쪽 액션 — 버튼 하나 또는 몇 개. 없으면 비워둔다 */
  action?: ReactNode;
  /**
   * 종(`NotificationBell`) 표시 여부 — 기본 `true`.
   *
   * ⚠️ **`(system)` 화면은 반드시 `false`를 넘긴다.** 이 헤더는 `(shell)` 전용이라
   *    문서에 그렇게 적혀 있지만, 사이드바·상단바 높이를 맞추려고 `(system)` 레이아웃
   *    6곳이 그대로 가져다 썼다 — `NotificationBell`은 `(shell)`의 `NotificationProvider`
   *    (회의 알림·SSE, `memberId` 기준)가 있어야만 동작해서, 그 프로바이더가 없는
   *    `(system)` 트리에서 그대로 그리면 "NotificationProvider 안에서만 쓸 수 있습니다"
   *    런타임 에러로 죽는다. `(system)` 운영자는 애초에 워크스페이스 회원이 아니라
   *    이 알림과 무관하다(§라우트 그룹: `(system)`은 완전히 별도 셸).
   */
  showNotifications?: boolean;
}

/**
 * `(shell)` 아래 화면이 공유하는 상단바.
 *
 * **제목 왼쪽, 상태 오른쪽 끝.** 아이콘 상자·두 줄 설명·구분선은 두지 않는다 —
 * 머리가 본문보다 무거워지거나 시끄러워진다.
 *
 * ⚠️ 배경은 **사이드바·본문과 전부 같은 색**(`bg-background`)이다. 껍데기와 본문을 다르게 두면
 *    화면이 셋으로 조각나 보인다 — 한때 본문만 다른 색으로 뒀다가 "따로 노는" 느낌이 났다.
 *    나누는 건 색이 아니라 **선 하나**(사이드바 오른쪽·상단바 아래)다.
 *    뜨는 것은 **카드뿐**이다(`--card`가 이 바탕보다 밝다).
 * ⚠️ **화면에서 부르지 않는다.** 도메인의 `layout.tsx`가 그린다 —
 *    화면마다 머리를 새로 그리면 높이·여백이 갈린다(사이드바와 같은 이유).
 * ⚠️ 탭은 여기에 넣지 않는다. 탭이 필요한 화면은 이 아래에 따로 둔다.
 * ⚠️ 높이(56px)는 **사이드바 로고 줄과 같은 값**이다. 한쪽만 고치면 두 경계선이 어긋나
 *    화면 왼쪽 위에 계단이 생긴다 — 바꿀 때 `role-sidebar`·`system-sidebar`를 같이 본다.
 */
export function PageHeader({
  title,
  icon: Icon,
  meta,
  backTo,
  action,
  showNotifications = true,
}: PageHeaderProps) {
  return (
    <header className="border-border bg-background flex h-[56px] shrink-0 items-center border-b px-8">
      {/*
        ⚠️ **본문과 같은 상자를 쓴다**(`mx-auto max-w-[1440px]`). 전에는 머리만 화면 끝까지
           늘어나서, 화면이 1440보다 넓어지면 본문 카드는 가운데로 모이는데 제목은 왼쪽 끝에
           남아 **둘이 따로 놀았다** — 그 어긋난 폭이 화면 폭·배율마다 달라져 고정된 값으로는
           맞출 수도 없었다.
        ⚠️ 오른쪽 끝(테마 전환·액션)도 같이 안으로 들어온다. 카드 오른쪽 모서리와 한 줄로
           맞는 게 맞다 — 한쪽만 끝에 붙으면 머리가 본문보다 넓어 보인다.
      */}
      <div className="relative mx-auto flex w-full max-w-[1440px] items-center gap-3">
        {/*
          화살표는 제목 왼쪽 — 제목 위에 경로를 한 줄 더 쓰지 않는다.
          ⚠️ **누르면 왔던 길로 돌아간다**(`BackLink`). `backTo.href`는 앱 안 이력이 없을 때
             갈 곳이다 — 자세한 이유는 그 파일에 적어 뒀다.
          ⚠️ **상자 밖(여백 쪽)에 띄운다**(`absolute right-full`). 상자 안에 두면 그만큼 제목이
             안으로 밀려 **본문 카드와 시작선이 어긋난다** — 목록에서는 화살표가 없는데도
             자리만 비워 두느라 어긋났다. 밖으로 내보내면 화살표가 있든 없든 제목은 늘
             카드와 같은 선에 서고, 오갈 때 제목이 밀리지도 않는다.
          ⚠️ 화살표가 앉는 32px는 헤더의 좌우 여백(`px-8`)이다 — 없는 자리를 만들지 않는다.
        */}
        {backTo ? (
          <BackLink
            href={backTo.href}
            /* 접근성 이름은 `BackLink`가 조사까지 골라 만든다(`lib/korean.ts`) */
            label={backTo.label}
            className="text-muted-foreground hover:text-foreground hover:bg-foreground/5 focus-visible:ring-ring absolute top-1/2 right-full flex size-8 shrink-0 -translate-y-1/2 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
          />
        ) : null}

        {/*
          ⚠️ 표식과 제목을 **한 덩어리로 묶고 사이를 넉넉히**(16px) 준다. 헤더 기본 간격(12px)을
             그대로 쓰면 22px 굵은 제목 옆에서 아이콘이 글자에 달라붙어 한 글자처럼 보인다.
        */}
        <div className="flex min-w-0 items-center gap-4">
          {/* 제목과 같은 색이다 — 흐리게 두면 제목 옆에 붙은 게 아니라 떨어진 장식처럼 보인다 */}
          {Icon && <Icon className="text-foreground size-5 shrink-0" aria-hidden />}

          {/* ⚠️ 한글 글리프가 줄 상자 안에서 위쪽에 앉는다 — 아이콘과 맞추려면 내려야 한다(팀 규칙) */}
          <h1 className="shrink-0 truncate text-[22px] leading-[30px] font-semibold tracking-[-0.4px]">
            {title}
          </h1>
        </div>

        {/* 남는 자리는 비워 둔다 — 선을 그으면 헤더가 시끄러워진다 */}
        <span className="flex-1" aria-hidden />

        {meta && (
          <span className="text-muted-foreground/70 shrink-0 pr-1 text-[12px] leading-[18px]">
            {meta}
          </span>
        )}

        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}

        {/*
          종·테마 전환은 화면마다 두지 않고 여기 한 자리에 고정한다 — 다른 서비스들이 그렇듯
          오른쪽 위, 테마 전환 바로 왼쪽에 종을 둔다(2026-08-16, #602 후속).
        */}
        {showNotifications && <NotificationBell />}
        <ThemeToggle />
      </div>
    </header>
  );
}
