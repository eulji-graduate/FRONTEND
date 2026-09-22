import type { Authority } from "@/constants/authority";
import type { MemberStatus } from "@/constants/member";

/**
 * 구성원 조직도의 **UI 계약**(`/app/people`).
 *
 * ⚠️ 같은 폴더에 `types.ts`(내 대시보드)·`manage-types.ts`(사원 관리)가 이미 있다.
 *    파일을 또 나눈 건 **보는 사람이 다르기** 때문이다 — 사원 관리는 Owner·Admin이
 *    사람을 **고치러** 오는 곳이고, 여기는 전 구성원이 조직을 **보러** 오는 곳이다.
 * ⚠️ 그래서 여기 담기는 값이 더 적다. 이메일·입사일·겸직 여부는 안 싣는다 —
 *    조직 구조를 보는 데 필요 없고, 전원이 보는 화면이라 덜 내보내는 편이 맞다.
 * ⚠️ 목일 때는 명부를 **사원 관리와 같은 것**을 읽는다(`mock/managed.ts`) — 두 벌로 들고
 *    있으면 같은 회사가 화면마다 달라 보인다. 실서버는 다르다 — BE가 조직도 전용의
 *    더 얇은 응답(`GET /api/members/org-chart`)을 따로 준다(아래 `OrgRosterMember`).
 */

/**
 * 조직도 조립(`org-chart.ts`)이 **실제로 필요로 하는 최소 인원 정보** — 사원 관리
 * (`ManagedMember`)의 부분집합이다.
 *
 * ⚠️ **`ManagedMember`를 그대로 쓰지 않는다.** 목 경로는 사원 관리와 같은 명부를 읽어서
 *    `ManagedMember[]`를 그대로 넘겨도 되지만(구조적으로 이 타입의 상위집합이라 그대로
 *    맞는다), 실서버 조직도 응답엔 이메일·겸직·근무상태·입사일이 없다 — 그 값들을
 *    `ManagedMember`에 억지로 채우면 지어낸 값이 된다(§정직성). 이 화면이 실제로 쓰는
 *    값만 계약으로 남긴다.
 */
export interface OrgRosterMember {
  id: number;
  name: string;
  teamName: string | null;
  position: string;
  authority: Authority;
  roleLabel: string | null;
  /** 실서버 조직도 응답엔 없다 — 있을 때만 넘긴다(아래 `OrgMember.status` 주석 참고) */
  status?: MemberStatus;
}

/** 조직도에 서는 사람 한 명 */
export interface OrgMember {
  id: number;
  name: string;
  /** 직급(사원·대리·팀장 …) — 회사마다 다르게 쓰는 이름이다 */
  position: string;
  /**
   * 팀 안에서 맡는 세부 역할(프론트엔드 등). **안 붙였으면 `없음`이다.**
   *
   * ⚠️ **계층이 아니라 라벨**이다(WORKFLOW §9). 사원 관리 목록이 이미 컬럼으로 갖고 있는
   *    값이고, 여기서 빠뜨리면 같은 사람이 화면마다 다르게 보인다.
   * ⚠️ `null`을 그대로 넘기지 않고 **매퍼가 `없음`으로 맞춰 둔다.** 화면이 "없으면 뭘 적을지"를
   *    정하게 두면 부르는 곳마다 답이 갈린다 — 실제로 한때 이 화면만 직급만 적어서
   *    사원 관리와 다른 말을 했다(§Mock 격리막: 컴포넌트는 UI 계약만 본다).
   */
  roleLabel: string;
  /**
   * 시스템 접근 권한.
   *
   * ⚠️ 화면은 **구조상 자리(Owner·Leader)만** 표식을 단다 — Member는 기본값이라 전원에게
   *    달면 아무것도 안 알린다. Admin 겸직은 여기 없다(권한이 아니라 덧붙는 플래그이고,
   *    조직 구조와 무관하다).
   */
  authority: Authority;
  /**
   * ⚠️⚠️ **없을 수 있다**(2026-08-14). BE 조직도 응답(`GET /api/members/org-chart`)엔
   *    근무상태가 안 온다 — 전 구성원이 보는 화면이라 인사 정보를 안 싣는다(BE
   *    `MemberController` 주석: "조직도 응답에는 이름·직급·권한만 들어간다"). 없으면
   *    `StatusMark`가 아무 뱃지도 안 단다 — **재직으로 지어내지 않는다**(§정직성). BE가
   *    이 응답에 근무상태를 더하기 전까지, 이 화면의 휴직 배지·집계(`OrgSummary.
   *    vacationCount`)는 실제로는 항상 비어 있다.
   */
  status?: MemberStatus;
}

/**
 * 팀 하나.
 *
 * ⚠️ 팀은 **계층이 없는 플랫 목록**이다(CLAUDE.md §권한 ③). 그래서 자식 팀이 없고,
 *    조직도가 깊어지지 않는다 — 대표 한 단, 팀 한 단이 전부다.
 */
export interface OrgTeam {
  name: string;
  /** ⚠️ **리더가 맨 앞**이다(`buildOrgChart`가 세운다). 팀당 리더는 한 명이다 */
  members: OrgMember[];
}

/** 조직도 전체 */
export interface OrgChart {
  /**
   * 대표 — 회사에 하나다.
   * ⚠️ 명부에 없을 수도 있어(연동 전·데이터가 덜 찼을 때) `null`을 허용한다. 화면은 그때
   *    대표 자리를 비우고 팀만 그린다 — 없는 사람을 지어내지 않는다(§정직성).
   */
  owner: OrgMember | null;
  teams: OrgTeam[];
  /** 조직도에 실제로 그려진 사람 수 — 대표를 포함한다 */
  totalCount: number;
}

/**
 * 화면 맨 위 요약 — **검색과 무관하게 늘 회사 전체**를 센다.
 *
 * ⚠️ 검색어를 넣으면 조직도는 걸러지지만 이 숫자는 안 바뀐다. 여기까지 같이 줄면
 *    "우리 회사가 3명"으로 읽힌다.
 */
export interface OrgSummary {
  /**
   * 명부에 있는 사람 수 — 대표를 포함한다.
   *
   * ⚠️ **퇴사자는 안 센다**(2026-08-15 정정 — "퇴사자도 센다"였던 이전 서술이 뒤집혔다).
   *    BE가 오프보딩 최종 승인 즉시 명부 조회에서 그 사람을 완전히 빼므로, 이 숫자는
   *    지금 조직에 있는 사람 수 그대로다. 조직도에 뜨는 `퇴사` 뱃지는 회의·액션 **기록**에
   *    스냅샷으로 남은 이름에 붙는 것이라 이 명부·숫자와는 다른 자리다.
   */
  totalCount: number;
  teamCount: number;
  /** 지금 자리에 없는 사람 — 일을 맡기기 전에 알아야 한다 */
  vacationCount: number;
}

/** 구성원 화면이 한 번에 받는 것 */
export interface PeopleDirectory {
  summary: OrgSummary;
  /** 검색어가 걸리면 걸러진 조직도다 */
  chart: OrgChart;
}

/**
 * 팀이 없는 사람을 묶는 자리.
 *
 * ⚠️ **조용히 빠뜨리지 않으려고 둔다**(§정직성). 팀이 없는 건 원래 대표뿐이라 여기에
 *    사람이 담기면 명부가 이상한 것인데, 안 그리면 전체 인원과 조직도에 보이는 수가
 *    어긋나 아무도 못 알아챈다. 그리면 눈에 띈다.
 */
export const NO_TEAM_LABEL = "소속 없음";
