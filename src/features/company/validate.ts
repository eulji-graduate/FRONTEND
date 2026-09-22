import { z } from "zod";

import { AUTHORITY, POSITION_AUTHORITIES } from "@/constants/domain";
import { placeSchema, registerSchema } from "@/features/auth/register-draft";
import { MAX_DEPARTMENT_DEPTH, MAX_ORG_NAME_LENGTH } from "@/features/onboarding/types";

import type { CompanyProfileDraft, CompanyProfileErrors, DepartmentNode, Position } from "./types";

/**
 * 기업 설정 검증 — **화면과 서버가 같은 함수를 쓴다.**
 * 규칙이 두 벌이면 화면은 통과시키고 서버는 막는 일이 생긴다.
 */

/**
 * 기본 정보 규칙은 **기업 등록 신청과 같은 것**을 쓴다 — 단, 위치는 다르다.
 *
 * ⚠️ 여기서 규칙을 새로 적으면 신청 때는 통과한 값이 설정에서 막히거나 그 반대가 된다 —
 *    같은 회사의 같은 값이다. 신청 스키마의 칸을 그대로 꺼내 쓴다(칸 이름만 우리 것).
 * ⚠️ **`place`만 신청 스키마를 그대로 못 쓴다**(2026-08-14). 신청은 위치를 **반드시 골라야**
 *    끝나는 자리라 `registerSchema.shape.place`가 `null`을 거절하는데, 설정은 **이미 고른
 *    위치를 지울 수 있어야** 한다(BE `UpdateCompanyRequest` — 빈 주소로 지우기를 지원한다).
 *    그래서 여기만 `refine` 없는 `placeSchema.nullable()`을 직접 쓴다.
 */
const companyProfileSchema = z.object({
  name: registerSchema.shape.companyName,
  businessNumber: registerSchema.shape.businessNumber,
  place: placeSchema.nullable(),
});

export function validateCompanyProfile(draft: CompanyProfileDraft): CompanyProfileErrors {
  const result = companyProfileSchema.safeParse(draft);
  if (result.success) return {};

  const errors: CompanyProfileErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    // 한 칸에 오류가 여럿이면 **첫 줄만** 쓴다(신청 화면과 같은 규칙)
    if (typeof field === "string" && !(field in errors)) {
      errors[field as keyof CompanyProfileDraft] = issue.message;
    }
  }
  return errors;
}

/**
 * 팀 체계 검증 — **서버가 다시 본다.**
 *
 * ⚠️ 화면의 편집 훅이 이미 막는 것들이지만, 액션은 주소만 알면 직접 부를 수 있다
 *    (§권한: 화면 숨김은 보안이 아니다). 조직 체계는 권한이 나오는 곳이라 특히 그렇다.
 */
export function validateDepartments(departments: DepartmentNode[]): string | null {
  if (departments.length === 0) return "팀을 하나 이상 두어야 합니다";

  let error: string | null = null;

  const walk = (nodes: DepartmentNode[], depth: number) => {
    if (error) return;
    if (depth >= MAX_DEPARTMENT_DEPTH && nodes.length > 0) {
      /*
        ⚠️ 상수를 그대로 문장에 끼우면 틀린 말이 된다. `MAX_DEPARTMENT_DEPTH`는 팀을 **포함한**
           전체 단수(팀 → 역할)라, "팀 아래 2단"이라고 적으면 한 단을 더 만들 수 있다고 읽힌다.
           카드 설명("팀 아래 역할까지 두 단계입니다")과 같은 말을 쓴다.
      */
      error = "팀 아래에는 역할 한 단계만 둘 수 있습니다";
      return;
    }

    const seen = new Set<string>();
    for (const node of nodes) {
      const name = node.name.trim();
      if (!name) {
        error = "이름이 비어 있는 항목이 있습니다";
        return;
      }
      if (name.length > MAX_ORG_NAME_LENGTH) {
        error = `이름은 ${MAX_ORG_NAME_LENGTH}자까지입니다`;
        return;
      }
      // 같은 부모 아래에서만 본다 — 다른 팀에 같은 이름의 역할이 있는 건 정상이다
      if (seen.has(name)) {
        error = `같은 이름이 둘 있습니다 — ${name}`;
        return;
      }
      seen.add(name);
      walk(node.children, depth + 1);
    }
  };

  walk(departments, 0);
  if (error) return error;

  /*
    ⚠️ **id가 겹치면 안 된다.** 사람이 딸린 팀을 지웠는지 보는 판정(`findBlockedTeamChange`)이
       id로 트리를 대조하는데, 같은 id가 둘이면 하나가 사라져도 "아직 있다"로 읽혀 그대로
       저장된다 — 그 팀 사원들의 소속이 조용히 없어진다.
    ⚠️ 화면이 만드는 id는 `crypto.randomUUID()`라 겹칠 일이 없지만, 액션은 주소만 알면
       직접 부를 수 있다(§권한: 화면 숨김은 보안이 아니다).
    ⚠️ **깊이 검사 뒤에 본다.** 앞에 두면 트리 전체를 먼저 훑는데, 액션에 만 단쯤 되는
       트리를 직접 넘기면 깊이 규칙이 걸리기도 전에 호출 스택이 넘쳐 `RangeError`로 죽는다.
       `walk`는 두 단에서 멈추므로, 여기까지 온 트리는 이미 얕은 것이 보장된다.
  */
  const ids = new Set<string>();
  let duplicated: string | null = null;
  const collect = (nodes: DepartmentNode[]) => {
    for (const node of nodes) {
      if (ids.has(node.id)) duplicated ??= node.name;
      ids.add(node.id);
      collect(node.children);
    }
  };
  collect(departments);
  if (duplicated) return `같은 식별자를 가진 항목이 둘 있습니다 — ${duplicated}`;

  return null;
}

/** 트리 전체(팀 + 그 안의 역할)의 id */
function collectIds(nodes: DepartmentNode[]): Set<string> {
  const ids = new Set<string>();
  const walk = (list: DepartmentNode[]) => {
    for (const node of list) {
      ids.add(node.id);
      walk(node.children);
    }
  };
  walk(nodes);
  return ids;
}

/** 사원이 딸린 팀에 손댔을 때 막는 이유 — 없으면 `null` */
export interface BlockedTeamChange {
  team: string;
  /** `removed` = 트리에서 아예 사라짐 · `demoted` = 남의 팀 아래 역할로 들어감 */
  kind: "removed" | "demoted";
}

/**
 * 사원이 딸린 팀에 **못 하는 짓**을 했는지 본다.
 *
 * ⚠️ 팀은 인수인계·액션 귀속의 단위다. 워크플로우에서 사람이 빠질 때는 **항상 명시적
 *    재할당**을 거친다(휴직·오프보딩 → 인수인계 → 새 리더 귀속) — 조용히 붕 뜨는 경로가 없다.
 *    소속이 사라진 사원은 `isWithinTeamScope`가 `teamId` 비교라 **아무도 관리할 수 없다**.
 * ⚠️ **두 가지를 갈라 본다.** 예전엔 "최상위에 없으면 삭제"로 뭉뚱그렸는데, 트리는 2계층이고
 *    강등(`demoteNode`)·드래그(`inside`)가 팀을 남의 역할로 내릴 수 있다 — 지우지도 않았는데
 *    "사원이 남아 있어 못 지웁니다"가 떠서 저장이 통째로 막혔다. 옮긴 것과 지운 것은
 *    **다른 사건**이고 사용자가 되돌릴 방법도 다르다.
 * ⚠️ 강등도 막는 건 같은 이유다 — 역할에는 사원이 소속되지 않는다(§권한 ③).
 * ⚠️ 우리가 정한 잠정 규칙이다 — BE 확인이 필요하다(§연동 검증).
 */
export function findBlockedTeamChange(
  previous: DepartmentNode[],
  next: DepartmentNode[],
  memberCounts: Record<string, number>,
): BlockedTeamChange | null {
  const survivingIds = collectIds(next);
  const roots = new Set(next.map((team) => team.id));

  for (const team of previous) {
    if ((memberCounts[team.id] ?? 0) === 0) continue;
    if (!survivingIds.has(team.id)) return { team: team.name, kind: "removed" };
    if (!roots.has(team.id)) return { team: team.name, kind: "demoted" };
  }

  return null;
}

/** 사원이 딸린 역할을 지우려 했을 때 막는 이유 — 없으면 `null` */
export interface BlockedRoleChange {
  team: string;
  role: string;
  /** 이 역할을 쓰는 사원 수 — 화면 문구가 그대로 쓴다 */
  count: number;
}

/**
 * 사원이 딸린 **역할**을 지우려 했는지 본다 — 팀 삭제와 같은 원칙이다(BE PR #528).
 *
 * ⚠️ 팀이 사라지거나 강등된 경우는 여기서 안 본다 — `findBlockedTeamChange`가 이미 막는다.
 *    같은 사람이 두 함수에 각각 걸리면 어느 쪽 문구가 먼저 뜨는지가 호출 순서에 좌우된다 —
 *    한쪽 관심사만 본다(§단일 책임).
 * ⚠️ **팀 간 역할 이동은 안 본다.** 기업 설정에서 그 조작 자체가 없다(2026-08-14, 드래그·
 *    Alt+방향키를 없앴다 — `department-node.tsx`의 `canReorder`) — 한 팀의 자식 목록에서
 *    역할이 사라졌으면 다른 팀으로 옮겨 간 게 아니라 그냥 지워진 것이다.
 */
export function findBlockedRoleChange(
  previous: DepartmentNode[],
  next: DepartmentNode[],
  roleMemberCounts: Record<string, number>,
): BlockedRoleChange | null {
  const nextTeamById = new Map(next.map((team) => [team.id, team]));

  for (const team of previous) {
    const nextTeam = nextTeamById.get(team.id);
    if (!nextTeam) continue;

    const survivingRoleIds = new Set(nextTeam.children.map((role) => role.id));
    for (const role of team.children) {
      const count = roleMemberCounts[role.id] ?? 0;
      if (count === 0) continue;
      if (!survivingRoleIds.has(role.id)) return { team: team.name, role: role.name, count };
    }
  }

  return null;
}

/**
 * 직급 검증 — 이름과 **리더 하나 규칙**.
 * ⚠️ 리더 직급은 회사에 하나뿐이다(CLAUDE.md §권한). 둘이 되면 팀 범위 판정이 무너진다.
 */
export function validatePositions(positions: Position[]): string | null {
  if (positions.length === 0) return "직급을 하나 이상 두어야 합니다";

  /*
    ⚠️ **권한 값을 화이트리스트로 본다.** 화면 셀렉트는 `POSITION_AUTHORITIES`(Leader·Member)만
       주지만, Server Action은 주소만 알면 직접 부를 수 있다(§권한: 화면 숨김은 보안이 아니다).
       여기가 없으면 `role: "OWNER"`인 직급을 심을 수 있고, **권한은 직급에서 오므로**
       그 직급을 받은 사람 전원이 회사 전체 권한을 얻는다 —
       `canManageCompany`·`canApproveFinal`·`canManageBilling`이 전부 열린다.
    ⚠️ 타입으로는 안 막힌다. `AssignableRole`은 `ASSIGNABLE_AUTHORITIES`(OWNER 포함)이고
       Server Action 인자에는 런타임 검사가 없다.
  */
  const allowed: readonly string[] = POSITION_AUTHORITIES;
  if (positions.some((position) => !allowed.includes(position.role))) {
    return "직급에 줄 수 없는 권한입니다";
  }

  const seen = new Set<string>();
  for (const position of positions) {
    const name = position.name.trim();
    if (!name) return "이름이 비어 있는 직급이 있습니다";
    if (name.length > MAX_ORG_NAME_LENGTH) return `이름은 ${MAX_ORG_NAME_LENGTH}자까지입니다`;
    if (seen.has(name)) return `같은 이름이 둘 있습니다 — ${name}`;
    seen.add(name);
  }

  const leaders = positions.filter((position) => position.role === AUTHORITY.LEADER);
  if (leaders.length > 1) return "Leader 권한은 한 직급만 가질 수 있습니다";

  return null;
}
