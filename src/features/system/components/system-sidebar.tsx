"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";

import { ZLogo } from "@/components/icons/z-logo";
import { AUTHORITY, AUTHORITY_MARK_CLASS } from "@/constants/authority";
import { SidebarItem } from "@/features/shell/components/sidebar-item";
import type { NavSection } from "@/features/shell/nav";
import { systemLogoutAction } from "@/features/system-auth/actions";
import { cn } from "@/lib/utils";

interface SystemSidebarProps {
  sections: NavSection[];
  /** 하단 계정 줄 */
  account: { email: string };
}

/**
 * 지금 경로와 **가장 길게 일치하는 href 하나**를 고른다.
 *
 * ⚠️ 단순 `pathname.startsWith(item.href)`는 안 된다 — `/system`(대시보드)이
 *    `/system/approval`(기업 승인)의 접두사라서 승인 화면에서 대시보드까지
 *    같이 켜진다. 후보 중 가장 구체적인(긴) href만 켜지게 골라야 한 곳만 켜진다.
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
 * SYSTEM(서비스 운영자) 전용 사이드바.
 *
 * ⚠️ `RoleSidebar`와 **치수·항목 렌더가 같다**(공용 `SidebarItem`). 전에는 항목을 따로 구현해
 *    높이 28px·아이콘 12px·글자 12px로 역할 셸(34/14/13)과 달랐고, 아이콘 맵도 두 벌이었다 —
 *    같은 서비스의 사이드바가 화면마다 다르게 생기고 고칠 곳이 두 곳이 된다.
 * ⚠️ 그래도 **컴포넌트는 따로 둔다.** 하단 계정 줄이 다르다(역할 배지 대신 이메일) —
 *    한 컴포넌트에 넣으면 `RoleSidebar` 안에 SYSTEM 분기가 섞인다.
 */
export function SystemSidebar({ sections, account }: SystemSidebarProps) {
  const pathname = usePathname();
  const activeHref = findActiveHref(sections, pathname);

  return (
    <aside className="border-border bg-background flex w-[220px] shrink-0 flex-col border-r">
      <div className="flex h-[56px] shrink-0 items-center gap-2 px-[18px]">
        <Link
          href="/system"
          aria-label="Z 운영자 홈으로"
          className="focus-visible:ring-ring flex items-center gap-2 rounded transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:outline-hidden"
        >
          <ZLogo className="text-foreground size-[22px]" title="Z" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-[7px]">
        {sections.map((section, index) => (
          <div key={section.title ?? "primary"} className={index > 0 ? "pt-2.5" : undefined}>
            {/* ⚠️ 구분선까지 `RoleSidebar`와 같다 — 하나만 빠지면 두 셸이 다르게 생긴다 */}
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
                  <SidebarItem item={item} isCurrent={item.href === activeHref} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* ⚠️ 높이·표식 크기는 역할 셸의 계정 줄과 같다. 다른 건 배지 대신 이메일이 오는 것뿐이다 */}
      <div className="border-border flex h-[49px] shrink-0 items-center gap-[7px] border-t px-[17.5px]">
        {/*
          ⚠️ 색을 박지 않는다. 전에는 `bg-role-owner`가 적혀 있어 **운영자인데 대표 색**이었다 —
             `SYSTEM`은 기업 화면의 권한이 아니라 회색을 쓴다(`constants/authority.ts`).
        */}
        <span
          className={cn(
            AUTHORITY_MARK_CLASS[AUTHORITY.SYSTEM],
            "text-background flex size-[21px] shrink-0 items-center justify-center rounded-full text-[11px] leading-none",
          )}
        >
          운
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-[12px] leading-[18px]">운영자 계정</p>
          <p className="text-muted-foreground truncate text-[11px] leading-[13px]">
            {account.email}
          </p>
        </div>
        {/* ⚠️ 나갈 문이 없으면 안 된다 — 세션이 4시간짜리라 만료 전에 직접 끊을 수 있어야 한다 */}
        <form action={systemLogoutAction}>
          <LogoutIconButton />
        </form>
      </div>
    </aside>
  );
}

function LogoutIconButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={pending ? "로그아웃 중" : "로그아웃"}
      className="text-muted-foreground hover:text-foreground hover:bg-foreground/5 focus-visible:ring-ring flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-hidden disabled:opacity-60"
    >
      <LogOut className="size-3.5" aria-hidden />
    </button>
  );
}
