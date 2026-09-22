/**
 * 권한(Authority)과 겸직 권한.
 *
 * ⚠️ 2026-08-06 개명 — 예전엔 이 OWNER/LEADER/MEMBER 셋을 "역할(Role)"이라 불렀다.
 *    백엔드 스키마 확정으로 "역할"이라는 이름은 이제 **팀 안의 세부 라벨**
 *    (프론트엔드·백엔드·리더·없음)만 가리키게 됐다 — 그래서 이 파일이 다루는 개념은
 *    **권한(Authority)**으로 이름을 바꾼다. 파일명도 `role.ts`에서 `authority.ts`로 옮겼다.
 * ⚠️ `domain.ts`에서 떼어냈다 — 권한은 정책이라 자주 바뀌는데, 한 파일에 상수를 다 넣어 두면
 *    바뀔 때마다 관계없는 상수까지 같은 diff에 딸려 온다.
 * ⚠️ 기존 import를 깨지 않으려고 `domain.ts`가 이 파일을 그대로 다시 내보낸다.
 */
/**
 * 권한 워딩은 화면에서도 영어로 노출한다(기획 확정).
 *
 * ⚠️ **`ADMIN`은 여기 없다.** Admin은 Owner·Leader·Member와 나란한 권한이 아니라
 *    사람에게 덧붙는 **부가 권한(겸직)** 이다 — `IS_ADMIN_*` 아래를 본다.
 *    한 사람은 권한 하나를 갖고, 그 위에 Admin을 겸할 수 있다.
 */
export const AUTHORITY = {
  OWNER: "OWNER",
  LEADER: "LEADER",
  MEMBER: "MEMBER",
  /** Z 서비스 자체 운영 — 확장(데모 제외) */
  SYSTEM: "SYSTEM",
} as const;
export type Authority = (typeof AUTHORITY)[keyof typeof AUTHORITY];

/**
 * **Admin — 권한이 아니라 겸직 권한이다.**
 *
 * ⚠️ 계정 발급·회의실 관리처럼 **운영에 해당하는 일**만 여기서 나온다.
 *    회의 개설·액션 조회 같은 건 그 사람의 **권한**이 정한다 — Admin을 켠다고 늘지 않는다.
 * ⚠️ **Owner는 겸할 수 없다**(팀 확정). 실제로 겸직 가능한 건 Leader·Member뿐이다.
 * ⚠️ 직급이 아니라 **사람에게 직접** 붙인다 — 여러 사원이 같은 직급을 쓰므로
 *    직급에 매핑하면 관리자가 통째로 늘어난다.
 */
export const ADMIN_LABEL = "Admin";
export const ADMIN_SCOPE_LABEL = "계정·회의실·직급 권한 관리";

/** Admin을 겸할 수 있는 권한 — Owner와 System은 제외된다 */
export const ADMIN_ELIGIBLE_AUTHORITIES = [AUTHORITY.LEADER, AUTHORITY.MEMBER] as const;

/** 화면 표기 — 권한은 한글로 번역하지 않는다. */
export const AUTHORITY_LABEL: Record<Authority, string> = {
  OWNER: "Owner",
  LEADER: "Leader",
  MEMBER: "Member",
  SYSTEM: "System",
};

/**
 * Owner 직급이 비어 있을 때 채우는 값 — **BE가 Owner 직급을 안 준다**(직급은 사원 발급
 * 화면에서 고르는 값인데 Owner는 그 화면을 거치지 않는다). 위 `POSITION_AUTHORITIES` 주석이
 * 이미 "대표에게 메일로 보낸다"고 부르듯, 이 서비스에서 Owner는 늘 대표다 — 조직도에서
 * `· 없음`으로 비거나 통째로 빈 줄이 뜨는 대신 이 값으로 채운다(`org-chart.ts`의
 * `toOrgMember`, 2026-08-19).
 */
export const OWNER_POSITION_FALLBACK_LABEL = "대표";

/** 권한 범위를 한 줄로 설명한 것. 직급·권한 매핑 화면의 범례에 쓴다. */
export const AUTHORITY_SCOPE_LABEL: Record<Authority, string> = {
  OWNER: "기업 전체 관리",
  LEADER: "팀 현황·액션 관리",
  MEMBER: "일반 사용",
  SYSTEM: "Z 서비스 운영",
};

/** 사원에게 부여할 수 있는 권한. `SYSTEM`은 서비스 운영자라 기업이 고를 수 없다. */
export const ASSIGNABLE_AUTHORITIES = [
  AUTHORITY.OWNER,
  AUTHORITY.LEADER,
  AUTHORITY.MEMBER,
] as const;

/**
 * **직급에 매핑할 수 있는 권한.**
 *
 * `OWNER`는 기업당 1명이고 **기업 승인 시 시스템이 계정을 발급해 대표에게 메일로 보낸다.**
 * 여러 사원이 같은 직급을 쓰므로 직급에 매핑하면 인원이 늘어난다 — 그래서 직급 매핑 대상이 아니다.
 * ⚠️ Admin은 애초에 권한이 아니라 겸직 권한이라 이 목록에 들어올 일이 없다.
 *    한 사람이 Leader이면서 Admin일 수 있고, 계정을 나눠 쓰지 않는다.
 */
export const POSITION_AUTHORITIES = [AUTHORITY.LEADER, AUTHORITY.MEMBER] as const;

/**
 * 권한 배지 색 — **토큰 클래스만** 담는다(§디자인 토큰: 하드코딩 금지).
 *
 * ⚠️ 화면마다 이 맵을 다시 적지 않는다. 전에는 사이드바 계정 줄이 `bg-role-owner`를
 *    통째로 박아 두어, 팀장·사원으로 로그인해도 배지 글자만 바뀌고 **색은 Owner**였다 —
 *    색으로 권한을 알리는 자리인데 색이 권한을 안 따라갔다.
 * ⚠️ `SYSTEM`은 자기 색이 없다. 기업 화면의 권한이 아니라 **회색(=member)** 을 그대로 쓴다 —
 *    없는 토큰을 지어내는 것보다, 눈에 띄지 않는 게 맞는 자리다.
 * ⚠️ 클래스는 **문자열 그대로** 적는다. 조각을 이어 만들면 Tailwind가 못 찾아 색이 안 나온다.
 * ⚠️ CSS 토큰 이름(`--role-*`, `bg-role-*`)은 그대로 둔다 — 이건 화면 시각 토큰 이름일 뿐이라
 *    도메인 용어 개명(부서→팀, 역할→권한)과 무관하다.
 */
export const AUTHORITY_BADGE_CLASS: Record<Authority, string> = {
  OWNER: "bg-role-owner-surface text-role-owner",
  LEADER: "bg-role-leader-surface text-role-leader",
  MEMBER: "bg-role-member-surface text-role-member",
  SYSTEM: "bg-role-member-surface text-role-member",
};

/** 이름 첫 글자를 담는 동그라미 — 배지와 같은 계열의 **진한 쪽**을 쓴다 */
export const AUTHORITY_MARK_CLASS: Record<Authority, string> = {
  OWNER: "bg-role-owner",
  LEADER: "bg-role-leader",
  MEMBER: "bg-role-member",
  SYSTEM: "bg-role-member",
};
