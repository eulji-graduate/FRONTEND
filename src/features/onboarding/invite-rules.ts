import type { Invite } from "./types";
import { LEADER_ROLE_ID } from "./types";

/**
 * 초대 줄이 **말이 되는지** 판정하는 규칙 — 목록을 바꾸지 않고 보기만 한다.
 *
 * ⚠️ 규칙은 여기 한 곳에만 둔다. 화면과 목록 조작(`invites.ts`)이 각자 판정하면
 *    경고는 뜨는데 저장은 되는(또는 그 반대인) 줄이 생긴다.
 */

/**
 * 초대장을 보낼 수 있는 주소인지.
 * ⚠️ 최종 판정은 서버가 한다 — 여기서는 오타를 즉시 잡아주는 정도만 본다.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * 두 번 이상 적힌 주소(소문자 기준).
 * 같은 사람에게 초대장이 두 번 가는 것을 막으려고 화면에서 먼저 표시한다.
 */
export function duplicateEmails(invites: Invite[]): Set<string> {
  const seen = new Set<string>();
  const duplicated = new Set<string>();

  for (const invite of invites) {
    const email = normalizeEmail(invite.email);
    if (!email) continue;
    if (seen.has(email)) duplicated.add(email);
    seen.add(email);
  }

  return duplicated;
}

/**
 * 역할·직급 짝 규칙을 판정할 때 필요한 것들.
 * 화면이 아는 값(2단계 직급 권한 · 1단계 부서 트리)을 함수에 넘겨준다.
 */
export interface InviteRules {
  /** 그 직급이 리더 권한인가 — 2단계에서 정한다 */
  isLeaderPosition: (positionId: string) => boolean;
  /** 그 부서에 고를 역할이 하나라도 있는가 — 1단계에서 정한다 */
  hasRoles: (departmentId: string) => boolean;
}

/**
 * 역할과 직급의 짝이 맞는가 — **이 규칙은 여기 한 곳에만 둔다.**
 *
 * - **리더 직급은 역할이 `리더`다.** 부서 전체를 맡는 자리라 부서 안의 한 역할에 매일 수 없다.
 * - **리더가 아닌 직급은 `리더`를 가질 수 없다.** 그 반대 방향이다.
 * - 아직 안 고른 칸(빈 값)은 판정하지 않는다 — 고르는 중이다.
 *
 * ⚠️ **`없음`은 이제 어느 부서에서나 고를 수 있다**(2026-08-10 변경). 전에는 역할이 있는
 *    부서에서 일반 팀원이 `없음`을 고르는 걸 막았는데, 그러면 역할 목록에 `없음`을 띄워 놓고
 *    고르면 발송에서 조용히 빠지는 줄이 된다 — 화면과 판정이 다른 말을 한다.
 * ⚠️ BE도 이걸 허용한다: 초대의 `subTeamTempId`는 **null이어도 된다**(역할 미지정,
 *    `OnboardingRequest.InviteNode`). 프론트만 막고 있던 규칙이었다.
 *    CLAUDE.md §조직 계층도 "팀 안의 세부 역할은 비워둘 수 있다"고 적고 있다.
 * ⚠️ 그래서 `hasRoles` 예외 가드가 사라졌다 — 역할 없는 부서를 따로 봐줄 이유가 없어졌다.
 */
export function fitsRoleAndPosition(invite: Invite, rules: InviteRules): boolean {
  if (!invite.roleId || !invite.positionId) return true;

  if (rules.isLeaderPosition(invite.positionId)) return invite.roleId === LEADER_ROLE_ID;
  return invite.roleId !== LEADER_ROLE_ID;
}

/**
 * 부서마다 리더는 한 명이다 — 이미 리더가 있는 부서의 id 모음.
 * `exceptId`는 자기 줄을 빼고 센다(자기가 리더인 줄에서 다시 리더를 고를 수 있어야 한다).
 */
export function departmentsWithLeader(
  invites: Invite[],
  isLeaderPosition: (positionId: string) => boolean,
  exceptId?: string,
): Set<string> {
  const taken = new Set<string>();
  for (const invite of invites) {
    if (invite.id === exceptId) continue;
    /*
      ⚠️ **주소가 비어도 자리를 차지한다.** 전에는 주소 없는 줄을 빼고 셌는데, 그러면
         리더로 골라 둔 줄이 여러 개 만들어진 뒤 주소만 채우면 한 부서에 리더가 여럿 남는다.
         직급은 부서·역할을 고른 뒤에야 열리므로, 리더로 고른 줄은 이미 작정한 줄이다.
    */
    if (isLeaderPosition(invite.positionId)) taken.add(invite.departmentId);
  }
  return taken;
}

/**
 * 같은 부서에 리더가 둘 이상인 줄 — 화면 경고와 발송 검증이 **같이** 쓴다.
 *
 * ⚠️ **이미 나간 줄이 먼저 자리를 잡는다.** 목록 순서로만 앞줄을 정상으로 보면,
 *    발송된 리더 줄이 목록 **뒤에** 있을 때 그 줄이 중복으로 찍히고 새 줄이 통과한다 —
 *    이미 나간 초대장은 고칠 수도 취소할 수도 없으므로 자리는 그쪽이 가진 게 맞다.
 *    (적대적 검토 #163: 팀A에 리더가 둘 생기는 경로였다.)
 * ⚠️ 그 다음은 목록 순서다. 앞줄을 정상으로 보고 **뒤에 온 줄만** 문제로 잡는다 —
 *    주소 중복과 같은 규약이라 화면 경고와 발송에서 빠지는 줄이 정확히 맞물린다.
 * ⚠️ 주소가 비어도 센다 — `departmentsWithLeader`와 같은 기준이어야 화면과 경고가 어긋나지 않는다.
 */
export function duplicatedLeaderIds(
  invites: Invite[],
  isLeaderPosition: (positionId: string) => boolean,
): Set<string> {
  const leaders = invites.filter((invite) => isLeaderPosition(invite.positionId));
  // 보낸 줄 먼저, 그다음 목록 순서 — 자리를 못 내주는 쪽이 먼저 잡는다
  const ordered = [
    ...leaders.filter((invite) => invite.isSent),
    ...leaders.filter((invite) => !invite.isSent),
  ];

  const seen = new Set<string>();
  const duplicated = new Set<string>();

  for (const invite of ordered) {
    if (seen.has(invite.departmentId)) duplicated.add(invite.id);
    else seen.add(invite.departmentId);
  }
  return duplicated;
}

/**
 * 같은 주소가 적힌 줄 중 **뒤에 온 줄만** — 화면 경고와 발송 검증이 같이 쓴다.
 *
 * ⚠️ `duplicateEmails`(주소 집합)와 다르다. 그건 첫 줄에도 경고를 붙였는데,
 *    실제로 나가는 건 첫 줄이라 **경고 2줄 : 빠지는 줄 1줄**로 어긋났다 —
 *    확인 창이 "표시된 줄을 확인해 주세요"라고 말하는 이상 그 대응이 맞아야 한다.
 *    리더 중복과 같은 규약으로 맞춘다(적대적 검토 #163).
 */
export function duplicatedEmailIds(invites: Invite[]): Set<string> {
  const seen = new Set<string>();
  const duplicated = new Set<string>();

  for (const invite of invites) {
    const email = normalizeEmail(invite.email);
    if (!email) continue;
    if (seen.has(email)) duplicated.add(invite.id);
    else seen.add(email);
  }
  return duplicated;
}
