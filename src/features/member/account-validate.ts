import { POSITION_AUTHORITIES } from "@/constants/authority";

import type { AccountDraft, AccountErrors } from "./manage-types";
import { isRoleOfTeam, type TeamRoleOption } from "./team-roles";

/**
 * 계정 발급 검증 — **화면과 서버가 같은 함수를 쓴다.**
 * 규칙이 두 벌이면 화면은 통과시키고 서버는 막는 일이 생긴다.
 */
export function validateAccount(
  draft: AccountDraft,
  /**
   * 회사가 만든 직급 이름들.
   *
   * ⚠️ **넘기지 않으면 이름이 비었는지만 본다.** 목록을 못 구한 자리에서 멀쩡한 발급을
   *    막지 않으려는 것이다 — 대신 Server Action은 **반드시 넘긴다**(아래 화이트리스트).
   */
  positionNames?: readonly string[],
  /**
   * 팀 이름 → 그 팀의 역할들.
   * ⚠️ 화면은 고른 팀의 역할만 주지만 Server Action은 직접 부를 수 있다 —
   *    없으면 남의 팀 역할이 붙어 조직도가 거짓말을 한다.
   */
  teamRoles?: Record<string, TeamRoleOption[]>,
): AccountErrors {
  const errors: AccountErrors = {};

  if (!draft.name.trim()) errors.name = "이름을 입력해 주세요";
  if (!draft.teamName.trim()) errors.teamName = "소속 팀을 골라 주세요";
  /*
    ⚠️ 직급도 **화이트리스트로 본다.** 화면은 셀렉트로 회사 목록만 주지만 Server Action은
       주소만 알면 직접 부를 수 있다 — 없으면 회사에 없는 직급(`왕`)이 그대로 발급된다.
       권한 화이트리스트와 같은 이유다.
  */
  const position = draft.position.trim();
  if (!position) errors.position = "직급을 골라 주세요";
  else if (positionNames && !positionNames.includes(position)) {
    errors.position = "회사에 없는 직급입니다";
  }

  /*
    ⚠️ 이메일은 **`@`가 있는지만** 본다(신청 화면과 같은 규칙). 정규식으로 조이면
       회사 메일 형식이 특이한 곳에서 멀쩡한 주소가 막힌다 — 진짜 검증은 발송이 한다.
  */
  const email = draft.email.trim();
  if (!email) errors.email = "이메일을 입력해 주세요";
  else if (!email.includes("@")) errors.email = "이메일 주소를 다시 확인해 주세요";

  /*
    ⚠️ 권한은 **화이트리스트로 본다.** 화면 셀렉트는 Leader·Member만 주지만 Server Action은
       주소만 알면 직접 부를 수 있다 — 없으면 아무나 OWNER 계정을 발급할 수 있다(§권한).
  */
  const allowed: readonly string[] = POSITION_AUTHORITIES;
  if (!allowed.includes(draft.authority)) errors.authority = "발급할 수 없는 권한입니다";

  /* ⚠️ 역할은 **그 팀의 것만** 붙는다. `null`(아직 안 골랐다)은 늘 통과한다(§WORKFLOW 9) */
  if (teamRoles && !isRoleOfTeam(teamRoles, draft.teamName.trim(), draft.roleId)) {
    errors.roleId = "그 팀에 없는 역할입니다";
  }

  return errors;
}

/**
 * 이미 쓰고 있는 메일 주소인지.
 * ⚠️ 대소문자를 가리지 않는다 — `Hong@`과 `hong@`은 같은 사람에게 간다.
 */
export function isEmailTaken(email: string, existing: string[]): boolean {
  const needle = email.trim().toLowerCase();
  return existing.some((taken) => taken.toLowerCase() === needle);
}
