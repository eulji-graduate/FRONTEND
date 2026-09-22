import { ROLE_NONE_LABEL } from "@/constants/member";
import { hasPinnedCoords } from "@/features/auth/register-draft";
import type { AssignableRole } from "@/features/onboarding/types";

import type { CompanyProfile, CompanyProfileDraft, DepartmentNode, Position } from "./types";

/**
 * BE shape → UI 계약 (§Mock 격리막 — 흡수하는 곳은 여기 하나다).
 *
 * ⚠️ 기업 설정 화면은 **세 API에서 값을 모은다**(`/companies/me` · `/teams` · `/job-positions`).
 *    한 번에 주는 엔드포인트가 BE에 없어서다 — 그 사실을 화면이 알 필요는 없다.
 */

/** [확인] BE `CompanyProfileResponse` 2026-08-13 develop(`30952c10` — 좌표 추가) */
export interface BeCompanyProfile {
  companyId: number;
  code: string;
  name: string;
  businessNumber: string | null;
  representativeName: string | null;
  address: string | null;
  /** 지도로 고른 적이 없으면 `null` — 위도 -90~90 */
  latitude: number | null;
  /** 지도로 고른 적이 없으면 `null` — 경도 -180~180 */
  longitude: number | null;
  phone: string | null;
  subscriptionStatus: string;
  onboardedAt: string | null;
}

/** [확인] BE `TeamNode` */
export interface BeTeam {
  teamId: number;
  name: string;
  leaderMemberId: number | null;
  leaderName: string | null;
  memberCount: number;
  /**
   * 이 팀에서 고를 수 있는 역할들. [확인] BE `RoleNode`(2026-08-14 BE PR #489,
   * `memberCount`는 PR #528에서 추가).
   * ⚠️ **`없음`(roleId 2)이 항상 끼어 온다** — 전역 시드 행을 모든 팀 목록에 얹어 준다.
   *    이 행의 `memberCount`는 **회사 전체 미배정 인원 수**라 모든 팀에 같은 숫자가
   *    실린다(부서에 안 매인 시드 행이라 그렇다, BE 안현님 확인) — 지울 수 없는 역할이라
   *    삭제 판단에는 안 쓰이고, 화면(선택 목록 제외)에서도 걸러 낸다.
   * ⚠️ **`리더`(roleId 1)는 안 온다** — BE가 팀장 표시용이라 목록에서 뺀다.
   * ⚠️ **선택적이라고 타입에 그대로 적는다**(2026-08-14 프로덕션 재현 — BE PR #489가 아직
   *    실제로는 배포 전이라 이 필드 자체가 안 온다). 비필수(`?`)로 안 적으면, 이 필드를
   *    직접 읽는 새 코드가 생겨도 타입체커가 "`undefined`일 수 있다"고 못 잡아 줘서
   *    `toDepartmentNode`가 겪었던 `.map()` 크래시를 그대로 되풀이할 수 있다.
   */
  roles?: { roleId: number; name: string; memberCount: number }[];
}

/**
 * [확인] BE `PositionResponse` — ⚠️ **`id`가 아니라 `jobPositionId`다.**
 * 이름을 잘못 읽으면 모든 직급 id가 `undefined`가 되어, 저장할 때 전부 **새 직급으로 잡힌다**.
 */
export interface BePosition {
  jobPositionId: number;
  name: string;
  authority: string;
  description: string | null;
  memberCount: number;
}

/**
 * 기업 기본 정보.
 *
 * ⚠️ **좌표가 생겼다**([확인] `CompanyProfileResponse.latitude/longitude` 2026-08-13 develop
 *    `30952c10` — "좌표 칸이 생기기 전까지 0"의 그 칸이다). 지도로 고른 적이 없으면 `null`이
 *    오고, 그때는 `0`으로 접는다 — 기업 등록 신청이 지도를 못 쓸 때 쓰는 것과 같은 표기다
 *    (`register-draft`의 `PickedPlace` 규칙).
 * ⚠️ **주소 없는 좌표는 버린다.** BE는 짝을 강제하지 않지만 우리 계약의 `place`는
 *    주소+좌표 **한 몸**이다 — 주소 없이 핀만 꽂으면 카드가 무엇을 가리키는지 말할 수 없다.
 * ⚠️ **`subscriptionStatus`를 여기선 안 쓴다.** 쓸 수 있는지는 `canUseWorkspace()` 한 곳에서
 *    판정한다(CLAUDE.md §요금제) — 이 카드는 회사 정보만 그린다.
 * ⚠️ **`representativeName`·`phone`도 안 쓴다.** 우리 `CompanyProfile`에 자리가 없다 —
 *    지금 화면이 안 보여 주는 값이라 버리는 게 아니라 **아직 안 받는 것**이다.
 */
export function toCompanyProfile(profile: BeCompanyProfile): CompanyProfile {
  return {
    name: profile.name,
    businessNumber: profile.businessNumber ?? "",
    place: profile.address
      ? {
          address: profile.address,
          lat: profile.latitude ?? 0,
          lng: profile.longitude ?? 0,
        }
      : null,
    code: profile.code,
  };
}

/** UI 초안 → BE `UpdateCompanyRequest` 본문 — 매퍼가 왕복 양쪽을 다 흡수한다(§Mock 격리막) */
export interface BeCompanyUpdateBody {
  name: string;
  businessNumber: string;
  /**
   * ⚠️ **다른 칸과 달리 항상 보낸다.** 나머지 필드는 없으면 "건드리지 말라"는 뜻인데, 주소는
   *    BE가 **빈 문자열을 "지운다"는 신호로 따로 읽는다**([확인] `UpdateCompanyRequest` 주석 —
   *    "빈 문자열을 보내면 주소와 좌표를 함께 지운다", 2026-08-14 develop 대조. 예전엔
   *    `@Pattern`이 빈 값을 거절했지만(PR #423), 이후 주소만 그 규칙에서 빠졌다). 필드째
   *    생략하면 지우기 신호 자체를 낼 수 없다.
   */
  address: string;
  latitude?: number;
  longitude?: number;
}

/**
 * 저장 본문.
 *
 * ⚠️ **주소는 지우기가 가능하다**(2026-08-14, BE 실코드 재대조로 뒤집음). 위 `address` 주석
 *    참고 — 고른 위치가 없으면 빈 문자열을 그대로 보낸다.
 * ⚠️ **좌표는 주소를 따라간다**(2026-08-13 결정). `place`는 주소+좌표 한 몸이라 주소가 없으면
 *    좌표도 생략한다 — BE는 좌표 단독 수정도 받지만, 주소 없는 요청에 좌표만 실으면 옛 주소
 *    글자에 새 핀이 붙는 반쪽 위치가 저장된다. (주소를 지우는 요청이면 어차피 BE가 좌표도
 *    함께 지운다 — 위 `UpdateCompanyRequest` 주석.)
 * ⚠️ **`0,0`은 좌표가 아니라 "지도를 못 썼다"는 표기다**(`register-draft`의 `PickedPlace`
 *    규칙 — 키 없음·SDK 차단). 그대로 보내면 기니만 바다에 핀이 저장되므로 생략한다.
 *    [확인] BE `UpdateCompanyRequest.latitude/longitude` 2026-08-13 develop(`30952c10`).
 */
export function toCompanyUpdateBody(draft: CompanyProfileDraft): BeCompanyUpdateBody {
  const place = draft.place?.address ? draft.place : null;
  /* ⚠️ 판정은 `hasPinnedCoords` 한 곳이다 — 그리는 쪽(`AddressPicker`)과 같은 규칙을 써야 한다 */
  const hasPin = hasPinnedCoords(place);
  return {
    name: draft.name,
    businessNumber: draft.businessNumber,
    // 없으면 빈 문자열 — BE가 이걸 "지운다"로 읽는다(위 `BeCompanyUpdateBody.address` 주석)
    address: place?.address ?? "",
    ...(hasPin ? { latitude: place.lat, longitude: place.lng } : {}),
  };
}

/**
 * 팀 목록 → 트리.
 *
 * ⚠️ **팀은 계층이 없다**(CLAUDE.md §권한 ③ — 플랫 목록, 2026-08-06 BE 스키마 확정).
 *    `DepartmentNode`가 `children`을 들고 있는 건 온보딩과 타입을 공유해서지, 팀이 중첩된다는
 *    뜻이 아니다 — 팀 아래 칸에는 **역할**만 온다(2계층, DECISIONS).
 * ⚠️ **역할을 그대로 담는다**(2026-08-14 BE PR #489 — 전에는 BE가 안 줘서 늘 빈 배열이었다).
 *    `없음`도 그대로 온다 — 역할 **선택**(`team-roles.ts`)엔 필요한 값이라 여기서 안 거른다.
 *    팀 **편집** 화면(`getCompanySetting()`)만 `withoutSystemRoles`로 따로 걸러 낸다.
 * ⚠️ **`roles`가 아직 안 올 수 있다**(2026-08-14 프로덕션 재현 — BE PR #489가 실제로는
 *    아직 배포 전이라 `GET /api/teams` 응답에 `roles` 필드 자체가 없다). 그대로
 *    `team.roles.map(...)`을 부르면 `undefined`에 `.map`을 호출해 **`/manage/members`·
 *    `/owner/setting` 전체가 Server Component 에러로 죽는다** — `roles`가 없으면 빈
 *    배열로 접어서, BE가 그 필드를 내려주기 전까지는 "역할 없음"과 같은 모양으로 견딘다.
 * ⚠️ **팀장(`leaderMemberId`·`leaderName`)을 못 담는다.** 우리 노드에 자리가 없어 지금은
 *    버린다 — 화면에 팀장이 안 보이는 건 그래서다.
 */
export function toDepartmentNode(team: BeTeam): DepartmentNode {
  return {
    id: String(team.teamId),
    name: team.name,
    children: (team.roles ?? []).map((role) => ({
      id: String(role.roleId),
      name: role.name,
      children: [],
    })),
  };
}

/**
 * 팀 **편집** 화면(`CompanyTeamCard`) 전용 — 시스템 역할을 뺀다.
 *
 * ⚠️ **`없음`은 회사가 만든 역할이 아니다.** 모든 팀 목록에 끼어 오는 전역 시드 행이라
 *    (BE PR #489), 편집 트리에 그대로 두면 사용자가 그 자리의 이름을 바꾸거나 지울 수
 *    있는 것처럼 보인다 — 팀을 지워도 실제로는 같이 지워지지 않는 값이다.
 * ⚠️ 역할 **선택**(`team-roles.ts`의 `buildTeamRoles`)에는 걸지 않는다 — 거긴 실제로
 *    골라야 하는 값이라 없으면 안 된다.
 */
export function withoutSystemRoles(team: DepartmentNode): DepartmentNode {
  return { ...team, children: team.children.filter((role) => role.name !== ROLE_NONE_LABEL) };
}

export function toTeamMemberCounts(teams: BeTeam[]): Record<string, number> {
  return Object.fromEntries(teams.map((team) => [String(team.teamId), team.memberCount]));
}

/**
 * 역할 id → 그 역할을 쓰는 사원 수 — **역할 삭제를 막는 판정**에 쓴다(팀 삭제와 같은 원칙,
 * BE PR #528).
 *
 * ⚠️ **전 팀을 평평하게 편다.** 역할 id는 회사 안에서 유일한 값이라(팀에 매여 있어도 DB
 *    행은 하나다) 팀별로 나눠 들고 있을 이유가 없다 — `withoutSystemRoles`로 편집 트리에서
 *    걸러지는 시스템 역할(`없음`·`리더`)의 수치도 여기 같이 담기지만, 그 id로는 편집 트리가
 *    아예 조회하지 않으니 해가 없다.
 */
export function toRoleMemberCounts(teams: BeTeam[]): Record<string, number> {
  return Object.fromEntries(
    teams.flatMap((team) =>
      (team.roles ?? []).map((role) => [String(role.roleId), role.memberCount]),
    ),
  );
}

/**
 * 직급.
 * ⚠️ 모르는 권한이 오면 가장 낮은 쪽으로 떨어뜨린다 — 권한은 넘겨짚으면 안 되는 값이다(§권한).
 */
export function toPosition(position: BePosition): Position {
  const role: AssignableRole = position.authority === "LEADER" ? "LEADER" : "MEMBER";
  /*
    ⚠️ **`description`을 들고 다닌다.** BE가 `@NotBlank`로 필수라 저장할 때 다시 보내야 하는데,
       여기서 버리면 왕복 한 번에 남의 설명이 지워진다 — 화면이 안 보여 주는 값이라도
       **되돌려 보낼 책임**은 남는다.
  */
  return {
    id: String(position.jobPositionId),
    name: position.name,
    role,
    description: position.description ?? "",
  };
}
