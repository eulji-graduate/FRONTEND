import { ROLE_NONE_LABEL } from "@/constants/member";
import type { DepartmentNode } from "@/features/company/types";

/**
 * 팀의 역할 하나. [확인] BE `RoleNode`(신규, PR #489) — `roleId`·`name`을 그대로 옮긴다.
 *
 * ⚠️ **id는 문자열이다.** 팀 id(`DepartmentNode.id`)·직급 id와 같은 관례 — BE 숫자를
 *    화면 계층에서는 문자열로 옮기고, BFF로 나갈 때만 다시 숫자로 바꾼다(`manage-actions.ts`).
 */
export interface TeamRoleOption {
  id: string;
  name: string;
}

/**
 * 팀 이름 → 그 팀이 고를 수 있는 역할들.
 *
 * ⚠️ **역할은 팀에 매여 있다.** 개발팀의 `프론트엔드`를 마케팅팀 사람에게 붙일 수 없다 —
 *    팀을 바꾸면 역할도 다시 골라야 한다(온보딩 초대 줄과 같은 규칙).
 * ⚠️ 트리에서 **한 겹만** 본다. 팀 아래 역할이 조직 계층의 끝이다(2계층, DECISIONS).
 * ⚠️ 화면과 Server Action이 **같은 함수**를 쓴다. 각자 트리를 헤집으면 화면은 막는데
 *    저장은 되는 값이 생긴다(§권한: 화면 숨김은 보안이 아니다).
 * ⚠️ **`없음`이 이미 들어 있다.** BE가 모든 팀의 역할 목록에 전역 시드 행 `없음`(roleId 2)을
 *    끼워서 주므로(2026-08-14 BE PR #489) 화면에서 따로 만들어 넣지 않는다 — `company/server.ts`의
 *    `getCompanySetting()`(팀 편집 화면)만 이 값을 걸러 내고, 여긴 그대로 쓴다.
 * ⚠️ **`리더`는 안 들어온다.** BE가 이미 목록에서 뺀다 — 팀장 표시용이라 사람이 고르는
 *    값이 아니다(2026-08-14 BE 응답).
 */
export function buildTeamRoles(departments: DepartmentNode[]): Record<string, TeamRoleOption[]> {
  return Object.fromEntries(
    departments.map((team) => [
      team.name,
      team.children.map((role) => ({ id: role.id, name: role.name })),
    ]),
  );
}

/**
 * 그 팀에서 고를 수 있는 역할 id인지.
 *
 * ⚠️ **`null`은 늘 통과한다.** "아직 안 골랐다"는 뜻이라 검사할 값이 없다 — 실제로
 *    저장되는 "역할 없음"은 `없음` 행의 진짜 id를 고른 상태라 여기 걸리지 않는다.
 */
export function isRoleOfTeam(
  teamRoles: Record<string, TeamRoleOption[]>,
  teamName: string,
  roleId: string | null,
): boolean {
  if (roleId === null) return true;
  return (teamRoles[teamName] ?? []).some((role) => role.id === roleId);
}

/**
 * 역할 id → 역할 이름. **목 저장소가 이름으로 사람을 들고 있어서** 다리를 놓는다
 * (`manage-actions.ts`의 목 분기 전용 — 실서버 분기는 id를 그대로 BE에 보낸다).
 *
 * ⚠️ `없음` 행을 고르거나 id가 `null`이면 `null`을 돌려준다 — 목 계약
 *    (`ManagedMember.roleLabel`)은 역할 없음을 `null`로 적기로 했다.
 */
export function roleNameOf(
  teamRoles: Record<string, TeamRoleOption[]>,
  teamName: string,
  roleId: string | null,
): string | null {
  if (roleId === null) return null;
  const found = (teamRoles[teamName] ?? []).find((role) => role.id === roleId);
  if (!found || found.name === ROLE_NONE_LABEL) return null;
  return found.name;
}

/**
 * 역할 이름 → 역할 id. **목 저장소를 읽어 화면 계약(`ManagedMemberDetail.roleId`)을 채울 때만**
 * 쓴다(`manage-server.ts`) — 실서버는 애초에 id로 답하므로 이 다리가 필요 없다.
 *
 * ⚠️ 라벨이 없으면(`null`) 그 팀의 `없음` 행 id를 찾아 돌려준다 — 못 찾으면(팀에 역할이
 *    하나도 없는 이상한 상태) `null`이다.
 */
export function roleIdOf(
  teamRoles: Record<string, TeamRoleOption[]>,
  teamName: string,
  roleLabel: string | null,
): string | null {
  const target = roleLabel ?? ROLE_NONE_LABEL;
  return (teamRoles[teamName] ?? []).find((role) => role.name === target)?.id ?? null;
}
