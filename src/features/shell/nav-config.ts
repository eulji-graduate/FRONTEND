import { AUTHORITY, type Authority } from "@/constants/authority";
import type { Actor } from "@/lib/permission";
import { canManageBilling, canManageRooms } from "@/lib/permission";

import type { NavItem, NavSection } from "./nav";
import { hasRoute } from "./routes";

/**
 * 역할별 사이드바 구성 — **레이아웃은 하나고 이 목록만 갈린다**(CLAUDE.md §라우트 그룹).
 *
 * ⚠️ **Admin은 역할이 아니라 덧붙는 구역이다**(WORKFLOW §9). `is_admin`이면 기존 역할을
 *    그대로 두고 회사 운영 구역만 더한다 — 역할을 갈아치우면 겸직자가 자기 대시보드를 잃는다.
 * ⚠️ **여기서 감추는 건 UX일 뿐이다.** 메뉴에 없어도 주소를 치면 들어가진다 —
 *    막는 건 각 화면과 Server Action이 `lib/permission.ts`로 한다(§권한).
 * ⚠️ **`isReady`를 손으로 켜지 않는다.** `src/app`에 그 화면이 있는지 보고 자동으로 정한다
 *    (`routes.ts`). 전에는 손으로 켰는데, 대시보드·캘린더가 머지돼도 플래그가 안 올라가
 *    **화면은 있는데 눌러도 "준비 중"만 뜨는** 일이 있었다 — 화면 만드는 PR과 사이드바
 *    고치는 PR이 달라서 아무도 못 봤다. 이제 누가 화면을 만들든 그냥 이어진다.
 * ⚠️ 화면이 아직 없으면 눌러도 404 대신 "준비 중"이 뜬다(§정직성).
 */

/** 로그인한 전원이 같이 쓰는 상단 항목 — 역할에 따라 **빠지는 항목만** 있다 */
const COMMON_TOP: NavItem[] = [
  { href: "/app/meeting", label: "내 회의", icon: "meeting" },
  { href: "/app/board", label: "보드", icon: "board" },
];

const COMMON_TOP_TAIL: NavItem[] = [
  { href: "/app/calendar", label: "캘린더", icon: "calendar" },
  { href: "/app/me", label: "마이페이지", icon: "me" },
];

/**
 * Owner에게는 **없는** 상단 항목.
 *
 * ⚠️ `/app/my/actions`는 OWNER 접근 불가다(CLAUDE.md §라우트 그룹).
 *    Owner는 액션을 받는 자리가 아니다.
 */
const MEMBER_TOP: NavItem[] = [{ href: "/app/my/actions", label: "내 액션", icon: "board" }];

const COMMON_WORKBENCH: NavItem[] = [
  { href: "/app/projects", label: "프로젝트", icon: "project" },
  { href: "/app/rooms", label: "회의 예약", icon: "room" },
  { href: "/app/search", label: "검색", icon: "search" },
  { href: "/app/notice", label: "공지", icon: "notice" },
  { href: "/app/people", label: "구성원", icon: "people" },
];

/**
 * Owner에게는 **없는** 워크벤치 항목.
 *
 * ⚠️ `/app/handover`는 OWNER 제외다(CLAUDE.md §라우트 그룹). Owner는 인수인계를 쓰는 쪽이 아니다.
 */
const MEMBER_WORKBENCH: NavItem[] = [
  { href: "/app/handover", label: "인수인계서 작성", icon: "approval" },
];

/**
 * 회사 운영 — **Owner와 Admin 겸직자가 보는 것이 다르다.**
 *
 * ⚠️ **계정 발급은 별도 탭이 아니다**(2026-08-06 정정). Owner도 발급할 수 있게 되면서
 *    "사원 관리" 화면 안의 버튼으로 옮겼다 — `/manage/members`가 Owner·Admin 공통이라
 *    (`canManageMembers`) 발급도 같은 문으로 자연히 열린다. 두 화면(사원 관리·계정 발급)을
 *    갈라 두면 나중에 권한이 갈릴 때마다 두 곳을 같이 고쳐야 한다.
 * ⚠️ **기업 설정·인수인계서 관리는 Owner만** 본다. 위계상 admin이 대신할 수 없다.
 * ⚠️ 겹치는 넷(사원 관리·회의실·구독·결제·녹음 용량)은 `/manage/*` 하나로 모여 있다 —
 *    역할 경로에 두면 겸직자에게 주소가 거짓말을 한다(DECISIONS §관리 기능).
 */
const MANAGE_MEMBERS: NavItem = { href: "/manage/members", label: "사원 관리", icon: "members" };

const MANAGE_MONEY: NavItem[] = [
  { href: "/manage/billing", label: "구독 관리", icon: "billing" },
  { href: "/manage/storage", label: "저장소 관리", icon: "storage" },
];

/**
 * 회의실 관리 — **Admin 겸직자만**(WORKFLOW.md §10-A · `canManageRooms`).
 *
 * ⚠️ **Owner에게는 안 보인다**(2026-08-11). 전에는 `MANAGE_SHARED`에 있어 Owner도 봤는데,
 *    화면 안에서 추가·수정 버튼이 `canManageRooms`로 다시 걸려 **들어가도 아무것도 못 하는
 *    목록**이었다 — 메뉴가 할 수 없는 일을 가리키면 그것도 거짓말이다(§정직성).
 * ⚠️ 판정을 `canManageRooms` **그대로** 쓴다. 여기서 `isAdmin`을 직접 보면 정책이 바뀔 때
 *    메뉴와 화면이 갈린다(§권한: 판정은 `lib/permission.ts` 한 곳).
 */
const MANAGE_ROOMS: NavItem = { href: "/manage/rooms", label: "회의실 관리", icon: "room" };

const OWNER_ONLY: NavItem[] = [
  { href: "/owner/leader-handovers", label: "인수인계서 관리", icon: "approval" },
  { href: "/owner/setting", label: "기업 설정", icon: "setting" },
];

/** 팀장 전용 — 자기 부서 스코프 */
const TEAM_SECTION: NavSection = {
  title: "팀 관리",
  items: [
    { href: "/team/members", label: "팀원 관리", icon: "members" },
    { href: "/team/action", label: "팀 액션 관리", icon: "board" },
    { href: "/team/handover", label: "인수인계서 관리", icon: "approval" },
  ],
};

/** 권한별 대시보드 — 첫 화면이다(`roleHome`과 같은 곳을 가리킨다) */
const DASHBOARD: Record<Authority, NavItem> = {
  [AUTHORITY.OWNER]: { href: "/owner", label: "대시보드", icon: "dashboard" },
  [AUTHORITY.LEADER]: { href: "/team", label: "대시보드", icon: "dashboard" },
  [AUTHORITY.MEMBER]: { href: "/my", label: "대시보드", icon: "dashboard" },
  [AUTHORITY.SYSTEM]: { href: "/system", label: "대시보드", icon: "dashboard" },
};

/**
 * 사이드바 **로고**가 데려갈 곳 — 메뉴 [대시보드]와 **같은 항목**을 준다.
 *
 * ⚠️ 경로를 따로 적지 않는다(`roleHome`으로도 안 짚는다). 로고와 메뉴가 같은 곳을 가리키면서
 *    한쪽만 `isReady`를 보면 **로고만 404로 보낸다** — 메뉴는 "준비 중"이라고 말하는데
 *    로고는 없는 화면으로 데려가니, 둘 중 로고가 거짓말을 하는 쪽이 된다(§정직성).
 *    항목 하나를 나눠 쓰면 화면이 생기는 날 `isReady` 한 줄로 둘이 같이 열린다.
 */
export function dashboardFor(role: Authority): NavItem {
  const item = DASHBOARD[role];
  return { ...item, isReady: hasRoute(item.href) };
}

/**
 * 이 사람의 사이드바.
 *
 * ⚠️ **base role로 뼈대를 잡고, `is_admin`이면 회사 운영 구역을 덧붙인다.** 순서가 중요하다 —
 *    admin을 역할처럼 다루면 팀장 겸직자가 팀 관리 구역을 잃는다.
 * ⚠️ 판정은 `lib/permission.ts`를 쓴다. `role === "owner"` 같은 비교를 여기 적으면
 *    정책이 바뀔 때 권한 파일과 사이드바가 서로 다른 말을 한다(§권한).
 */
/**
 * 그 항목에 **화면이 있는지 표시해 준다.**
 *
 * ⚠️ 구성(`DASHBOARD`·`COMMON_TOP` …)에는 `isReady`를 안 적는다. 여기서 한 번에 입혀야
 *    "한 곳은 켜고 다른 곳은 잊는" 일이 안 생긴다 — 로고와 메뉴가 어긋났던 것도 그 때문이다.
 */
function withReadiness(items: NavItem[]): NavItem[] {
  return items.map((item) => ({ ...item, isReady: hasRoute(item.href) }));
}

export function navFor(viewer: Actor): NavSection[] {
  const isOwner = viewer.role === AUTHORITY.OWNER;

  const top = isOwner
    ? [DASHBOARD[viewer.role], ...COMMON_TOP, ...COMMON_TOP_TAIL]
    : [DASHBOARD[viewer.role], ...COMMON_TOP, ...MEMBER_TOP, ...COMMON_TOP_TAIL];

  const workbench = isOwner ? COMMON_WORKBENCH : [...COMMON_WORKBENCH, ...MEMBER_WORKBENCH];

  const sections: NavSection[] = [{ items: top }, { title: "워크벤치", items: workbench }];

  if (viewer.role === AUTHORITY.LEADER) sections.push(TEAM_SECTION);

  /*
    회사 운영 — 볼 수 있는 사람만. Owner는 늘 보고, 겸직자는 `is_admin`으로 붙는다.
    ⚠️ 판정을 `canManageBilling`으로 한다. 이 구역의 핵심이 구독·결제라 그 판정과 같은 문이어야
       "메뉴는 보이는데 화면은 막힌다"가 안 생긴다.
  */
  if (canManageBilling(viewer)) {
    /* 순서는 사원 → (회의실) → 구독 → 저장소 → Owner 전용이다. 회의실만 겸직자에게 끼어든다 */
    sections.push({
      title: "회사 운영",
      items: [
        MANAGE_MEMBERS,
        ...(canManageRooms(viewer) ? [MANAGE_ROOMS] : []),
        ...MANAGE_MONEY,
        ...(isOwner ? OWNER_ONLY : []),
      ],
    });
  }

  return sections.map((section) => ({ ...section, items: withReadiness(section.items) }));
}
