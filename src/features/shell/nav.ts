/**
 * 사이드바 구성.
 *
 * ⚠️ **아이콘을 컴포넌트로 두지 않는다.** 이 파일은 서버 컴포넌트(레이아웃)에서 읽어
 *    클라이언트 사이드바로 넘어간다 — 함수는 직렬화되지 않아 그대로 터진다.
 *    여기서는 **이름만** 두고 실제 아이콘은 사이드바(클라이언트)에서 붙인다.
 */
export type NavIconName =
  | "dashboard"
  | "project"
  | "search"
  | "calendar"
  | "notice"
  | "meeting"
  | "room"
  | "board"
  | "people"
  | "me"
  | "members"
  | "billing"
  | "storage"
  | "setting"
  | "approval"
  | "company"
  | "monitor";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
  /**
   * 화면이 실제로 있는가.
   *
   * ⚠️ `false`면 **눌리지 않는다.** 아직 안 만든 메뉴를 링크로 두면 404가 뜬다 —
   *    안 되는 걸 되는 척하지 않는다(CLAUDE.md §정직성). 화면이 붙으면 `true`로 바꾼다.
   */
  isReady?: boolean;
  /** 오른쪽에 붙는 숫자(처리할 일 수) */
  badge?: number;
  /**
   * 미읽음 등 "안 본 게 있음"을 알리는 빨간 점. 숫자(`badge`)와 달리 개수는 안 보여준다.
   * ⚠️ **정적 구성엔 안 적는다.** "내 회의"·"공지"는 `RoleSidebar`가 종 드롭다운의 안 읽은
   *    알림 목적지(`unreadDestinations`, `notification-provider.tsx`)와 `item.href`를
   *    맞춰 보고 켠다 — 여기 `true`를 미리 적어 두는 건 그 자리뿐이던 값이 하나 더 생겨
   *    두 값이 어긋날 수 있는 자리를 만든다.
   */
  dot?: boolean;
}

export interface NavSection {
  /** 구역 제목. 첫 구역은 제목 없이 바로 나온다 */
  title?: string;
  items: NavItem[];
}

/*
  ⚠️ **구성은 `nav-config.ts`에 있다.** 이 파일은 모양(타입)만 정한다 —
     전에는 여기 `OWNER_NAV` 하나뿐이라 역할이 늘 때마다 타입 파일이 같이 부풀었다.
*/
