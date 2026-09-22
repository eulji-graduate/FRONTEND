import type { NavSection } from "@/features/shell/nav";

/**
 * SYSTEM(서비스 운영자) 사이드바 구성.
 *
 * ⚠️ 대시보드·기업 승인·기업 관리·구독 매출만 실제 화면이다 — 나머지는 `isReady` 없이 둬서
 *    눌러도 "준비 중" 안내만 뜨게 한다(CLAUDE.md §정직성).
 */
export const SYSTEM_NAV: NavSection[] = [
  {
    /*
      ⚠️ **제목을 두지 않는다.** 구역이 하나뿐이라 이름표가 가리킬 대상이 없고,
         `RoleSidebar`는 제목이 있는 구역 위에 구분선을 긋는다 — 여기서만 제목을 두면
         로고 바로 아래에 선이 생겨 역할 셸과 다르게 보인다(로고 아래 선은 두지 않는다).
    */
    items: [
      { href: "/system", label: "대시보드", icon: "dashboard", isReady: true },
      { href: "/system/approval", label: "기업 승인", icon: "approval", isReady: true },
      { href: "/system/companies", label: "기업 관리", icon: "company", isReady: true },
      { href: "/system/billing", label: "구독·매출", icon: "billing", isReady: true },
      { href: "/system/monitor", label: "시스템 모니터링", icon: "monitor", isReady: true },
      { href: "/system/notice", label: "공지", icon: "notice", isReady: true },
    ],
  },
];
