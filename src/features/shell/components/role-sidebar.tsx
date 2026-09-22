"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { ZLogo } from "@/components/icons/z-logo";
import { AUTHORITY_BADGE_CLASS, AUTHORITY_LABEL } from "@/constants/authority";
import { useNotificationCenter } from "@/features/notification/notification-provider";
import { useProfileAvatar } from "@/hooks/use-profile-avatar";
import { topicParticle } from "@/lib/korean";
import { cn } from "@/lib/utils";

import type { NavItem, NavSection } from "../nav";
import type { Viewer } from "../viewer";
import { SidebarItem } from "./sidebar-item";

interface RoleSidebarProps {
  sections: NavSection[];
  /**
   * 로고를 누르면 갈 곳 — 메뉴 [대시보드]와 **같은 항목**이다(`dashboardFor`).
   *
   * ⚠️ 경로만 받지 않는다. `isReady`가 같이 와야 화면이 아직 없을 때 로고도 메뉴와 똑같이
   *    "준비 중"이라고 말한다 — 경로만 받으면 로고만 404로 데려간다.
   */
  home: NavItem;
  /**
   * 지금 보고 있는 사람 — 이름·역할 배지·로고 링크가 이 값에서 나온다.
   *
   * ⚠️ `isAdmin`까지 통째로 받는다. 네비 구성은 권한 하나로 못 정한다 —
   *    `/manage`는 Admin 겸직자에게만 보이므로 `role` + `isAdmin`을 같이 본다
   *    (DECISIONS §(authority)).
   */
  user: Viewer;
}

/**
 * 지금 경로와 **가장 길게 일치하는 href 하나**를 고른다.
 *
 * ⚠️ 단순 `pathname.startsWith(item.href)`는 안 된다 — `/manage/billing`(구독·결제)이
 *    `/billing/checkout`(결제)의 접두사라서 결제 화면에서 두 곳이 같이 켜진다.
 *    후보 중 가장 구체적인(긴) href만 켜지게 골라야 한 곳만 켜진다.
 */
function findActiveHref(sections: NavSection[], pathname: string): string | undefined {
  let best: string | undefined;

  for (const section of sections) {
    for (const item of section.items) {
      const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (matches && (!best || item.href.length > best.length)) best = item.href;
    }
  }

  return best;
}

/**
 * 역할별 대시보드가 공유하는 사이드바.
 *
 * ⚠️ 레이아웃은 하나다 — 역할마다 `sections`만 갈아 끼운다(CLAUDE.md §라우트 그룹).
 */
export function RoleSidebar({ sections, home, user }: RoleSidebarProps) {
  const pathname = usePathname();
  const activeHref = findActiveHref(sections, pathname);
  /*
    ⚠️ **"내 회의"·"공지" 점은 여기서 켠다**(2026-08-16, #602 후속 — 예전엔 셸 레이아웃이
       서버에서 `getUnreadNoticeCount()`로 미리 계산해 `item.dot`에 끼워 넣었다). 그 API는
       실서버에 없어 늘 0으로 죽어 있던 값이라, 종 드롭다운(`NotificationBell`)이 이미
       들고 있는 안 읽은 알림의 목적지 집합(`unreadDestinations`)을 그대로 재사용한다 —
       종 목록에서 안 읽은 게 사라지면(읽음 처리·삭제) 이 점도 같이 꺼진다.
  */
  const { unreadDestinations } = useNotificationCenter();

  return (
    /*
      ⚠️ 배경은 `--background`다 — 라이트에서 **흰색**, 다크에서 **검정**에 가깝다.
         상단바도 같은 토큰을 쓴다. 껍데기끼리 색이 갈리면 화면이 조각나 보인다.
         본문은 같은 색이지만 **점 그리드**가 깔려 구분된다.
    */
    <aside className="border-border bg-background flex w-[220px] shrink-0 flex-col border-r">
      {/*
        로고만 둔다 — 옆에 "Z" 글자를 또 쓰면 같은 말이 두 번이다.
        상단바(64px)와 높이를 맞춰 사이드바와 본문의 첫 줄이 한 선에 놓이게 한다.
      */}
      {/* 로고 아래 선을 두지 않는다 — 사이드바 안에서 또 나누면 조각나 보인다 */}
      <div className="flex h-[56px] shrink-0 items-center px-[18px]">
        <SidebarLogo home={home} />
      </div>

      <nav className="flex-1 overflow-y-auto p-[7px]">
        {sections.map((section, index) => (
          <div key={section.title ?? "primary"} className={index > 0 ? "pt-2.5" : undefined}>
            {section.title && (
              <>
                <div className="border-border/70 mx-[10.5px] border-t" />
                <p className="text-muted-foreground/80 px-[10.5px] pt-3.5 pb-[5.25px] text-[11px] leading-4 tracking-[0.275px]">
                  {section.title}
                </p>
              </>
            )}

            <ul className="flex flex-col gap-[1.75px]">
              {section.items.map((item) => (
                <li key={item.href}>
                  <SidebarItem
                    item={{ ...item, dot: item.dot || unreadDestinations.has(item.href) }}
                    isCurrent={item.href === activeHref}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <AccountRow user={user} />
    </aside>
  );
}

const LOGO_SHAPE =
  "focus-visible:ring-ring rounded transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:outline-hidden";

/**
 * 사이드바 로고 — 누르면 **자기 역할의 대시보드**로 간다.
 *
 * ⚠️ 랜딩(`/`)으로 보내지 않는다. 로그인 뒤 화면에서 로고를 누르는 건 "첫 화면으로"라는
 *    뜻인데, 그 사람의 첫 화면은 로그인 전 소개 페이지가 아니라 자기 대시보드다.
 *    (랜딩·로그인 화면의 로고는 그대로 `/`로 간다 — 거기선 랜딩이 첫 화면이다.)
 * ⚠️ 화면이 아직 없으면 **링크로 두지 않는다.** 메뉴 [대시보드]는 "준비 중"이라고 말하는데
 *    로고만 404로 데려가면 같은 곳을 가리키는 둘이 다른 말을 한다(§정직성).
 *    `SidebarItem`과 같은 규칙이고, 문구도 같은 자리에서 나온다.
 */
function SidebarLogo({ home }: { home: NavItem }) {
  const logo = <ZLogo className="text-foreground size-[22px]" title="Z" />;

  if (!home.isReady) {
    return (
      <button
        type="button"
        aria-label={`Z ${home.label} — 준비 중`}
        onClick={() => toast(`${home.label}${topicParticle(home.label)} 준비 중입니다`)}
        className={LOGO_SHAPE}
      >
        {logo}
      </button>
    );
  }

  return (
    <Link href={home.href} aria-label={`Z ${home.label}로`} className={LOGO_SHAPE}>
      {logo}
    </Link>
  );
}

/**
 * 하단 계정 줄 — 프로필 아바타 · 이름 · 역할 배지.
 *
 * ⚠️ **아바타와 배지가 서로 다른 것을 말한다.** 아바타 색은 **그 사람**(id 해시)이고,
 *    배지 색은 **역할**이다. 둘을 같은 색으로 묶으면 같은 역할인 사람이 전부 같은 표식을
 *    달아, 목록에서 사람을 구분할 수 없다.
 * ⚠️ 아바타는 `useProfileAvatar` 하나만 쓴다 — 팀원 현황·팀장 현황과 **같은 색**이어야
 *    "그 파란 사람"으로 기억한 게 화면을 옮겨도 통한다.
 * ⚠️ 배지 색은 전에 `bg-role-owner`가 박혀 있어서 팀장·사원으로 로그인해도 글자만 바뀌고
 *    색은 Owner였다 — 색으로 역할을 알리는 자리인데 색이 역할을 안 따라갔다.
 */
function AccountRow({ user }: { user: Viewer }) {
  const avatar = useProfileAvatar(user.id, 21);

  return (
    <div className="border-border flex h-[49px] shrink-0 items-center gap-[7px] border-t px-[17.5px]">
      {avatar}
      <span className="min-w-0 flex-1 truncate text-[12px] leading-[18px]">{user.name}</span>
      <span
        className={cn(
          AUTHORITY_BADGE_CLASS[user.role],
          "shrink-0 rounded px-[5.25px] py-[1.75px] text-[9px] leading-[14px]",
        )}
      >
        {AUTHORITY_LABEL[user.role]}
      </span>
    </div>
  );
}
