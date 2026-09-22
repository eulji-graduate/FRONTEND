import {
  duplicatedEmailIds,
  duplicatedLeaderIds,
  fitsRoleAndPosition,
  type InviteRules,
  isValidEmail,
  normalizeEmail,
} from "./invite-rules";
import type { Invite } from "./types";
import { LEADER_ROLE_ID, NO_ROLE_ID } from "./types";

/**
 * 초대 목록 조작 — 전부 순수 함수다(원본을 바꾸지 않는다).
 *
 * ⚠️ 판정 규칙(주소가 맞는가 · 역할과 직급의 짝 · 부서당 리더 한 명)은 `invite-rules.ts`에 있다.
 *    여기는 **바꾸는 일**만 한다.
 */

/**
 * 빈 초대 한 줄.
 *
 * ⚠️ **부서·직급을 미리 골라 두지 않는다**(2026-08-04). 첫 부서가 자동으로 들어가 있으면
 *    그 줄을 확인도 안 하고 넘긴 사람이 엉뚱한 부서로 초대장을 받는다 — 골랐다는 흔적 없이
 *    값만 채워져 있는 게 더 위험하다. 화면에는 `선택`으로 뜬다.
 * ⚠️ id를 밖에서 받는다 — 첫 줄은 서버에서도 렌더되므로 `crypto.randomUUID()`처럼
 *    호출할 때마다 달라지는 값을 쓰면 서버·클라이언트 결과가 어긋난다(hydration 오류).
 */
export function createInvite(id: string): Invite {
  return {
    id,
    name: "",
    email: "",
    departmentId: "",
    roleId: "",
    positionId: "",
    isAdmin: false,
    isSent: false,
  };
}

/**
 * 다음 줄에 붙일 id — 현재 목록에서 가장 큰 번호 + 1.
 * ⚠️ 무작위 값(`crypto.randomUUID()`)을 쓰면 서버와 브라우저가 다른 id를 만들어
 *    첫 렌더가 어긋난다(hydration 오류). 목록만 보고 정해지는 값이어야 한다.
 */
export function nextInviteId(invites: Invite[]): string {
  const largest = invites.reduce((max, invite) => {
    const serial = Number(invite.id.replace("invite-", ""));
    return Number.isFinite(serial) && serial > max ? serial : max;
  }, 0);

  return `invite-${largest + 1}`;
}

/**
 * 값 바꾸기는 전부 이 문을 지난다.
 * ⚠️ **이미 나간 초대장은 고칠 수 없다**(`isSent`). 화면에서 잠그는 것만으로는 부족하다 —
 *    키보드·프로그램 경로로도 들어올 수 있어서 여기서 막는다.
 */
function updateInvite(invites: Invite[], id: string, patch: Partial<Invite>): Invite[] {
  return invites.map((invite) =>
    invite.id === id && !invite.isSent ? { ...invite, ...patch } : invite,
  );
}

export function changeInviteName(invites: Invite[], id: string, name: string): Invite[] {
  return updateInvite(invites, id, { name });
}

export function changeInviteEmail(invites: Invite[], id: string, email: string): Invite[] {
  return updateInvite(invites, id, { email });
}

/**
 * 역할 바꾸기.
 *
 * 역할과 직급은 짝이 맞아야 한다(팀 확정).
 * - **리더 직급은 역할이 `리더`다** — 부서 전체를 맡는 자리라 부서 안의 한 역할에 못 매인다.
 * - **리더가 아닌 직급은 부서 안의 실제 역할을 골라야 한다** — 걸쳐만 두면 무슨 일을 하는지가 빈다.
 *
 * ⚠️ 짝이 어긋나면 **직급을 비운다.** 막기만 하면 빠져나갈 수 없는 줄이 생긴다 —
 *    `과장 + 프론트엔드`에서 팀장으로 가려면 역할이 `리더`가 돼야 하는데,
 *    그게 과장 때문에 막혀 있으면 어느 쪽도 못 고친다.
 */
export function changeInviteRole(
  invites: Invite[],
  id: string,
  roleId: string,
  rules: InviteRules,
): Invite[] {
  const target = invites.find((invite) => invite.id === id);
  if (!target) return invites;

  const fits = fitsRoleAndPosition({ ...target, roleId }, rules);
  return updateInvite(invites, id, fits ? { roleId } : { roleId, positionId: "" });
}

/**
 * 부서 바꾸기 — 역할은 비운다(다른 부서의 역할이 남으면 안 된다).
 *
 * ⚠️ **역할이 하나도 없는 부서면 곧장 `없음`으로 정한다.** 고를 게 `없음` 하나뿐인데
 *    한 번 더 고르게 하면 의미 없는 손이 한 번 더 든다 — 역할 칸은 그대로 잠긴다.
 * ⚠️ **이미 리더 직급이면 `리더`로 채운다.** 부서를 먼저 고르든 직급을 먼저 고르든 결과가
 *    같아야 한다 — 여기서 빈 값으로 두면 잠긴 칸이 빈 채로 남아 무엇이 정해졌는지 안 보인다.
 */
export function changeInviteDepartment(
  invites: Invite[],
  id: string,
  departmentId: string,
  rules: InviteRules,
): Invite[] {
  const target = invites.find((invite) => invite.id === id);
  const isLeaderRow = rules.isLeaderPosition(target?.positionId ?? "");

  /*
    ⚠️ **이미 리더가 있는 팀으로 옮겨도 직급을 지우지 않는다.** 한때 여기서 역할·직급을
       비워 규칙 위반을 막았는데, 사용자가 고른 값을 화면이 조용히 지우는 일이었다 —
       왜 비었는지 말해 주는 자리도 없었다(줄 경고는 그 줄이 더는 리더가 아니라서 꺼진다).
    ⚠️ 대신 **규칙을 검증에 심었다.** 옮긴 줄은 값을 그대로 들고 있고,
       줄에는 `리더가 이미 있습니다`가 뜨며, `sendableInvites`가 그 줄을 뺀다.
       빠져나갈 길도 있다 — 팀을 되돌리거나 직급을 다른 것으로 고르면 된다
       (`positionsFor`가 **지금 고른 값은 늘 남긴다**).
  */

  // 부서가 바뀌면 역할은 비운다 — 다른 부서의 역할이 남아 있으면 안 된다
  const roleId = isLeaderRow ? LEADER_ROLE_ID : rules.hasRoles(departmentId) ? "" : NO_ROLE_ID;

  return updateInvite(invites, id, { departmentId, roleId });
}

/**
 * 직급 바꾸기.
 *
 * ⚠️ **리더 직급을 고르면 역할이 `리더`로 자동으로 채워진다.** 리더는 부서 전체를 맡는 자리라
 *    부서 안의 한 역할(프론트엔드 등)에 매이면 관리 범위가 어긋난다. 화면에서 못 고르게 막는
 *    것만으로는 부족하다 — 역할을 먼저 고른 뒤 직급을 리더로 바꾸는 순서가 남는다.
 * ⚠️ 조용히 지우는 게 아니다. 역할 칸이 그 자리에서 `리더`로 바뀌는 게 바로 보인다.
 *    전에는 `없음`으로 바뀌었는데, 팀장 줄에 `없음`이라 적히니 "역할을 안 정했다"로 읽혔다.
 */
export function changeInvitePosition(
  invites: Invite[],
  id: string,
  positionId: string,
  rules: InviteRules,
): Invite[] {
  const target = invites.find((invite) => invite.id === id);

  if (rules.isLeaderPosition(positionId)) {
    return updateInvite(invites, id, { positionId, roleId: LEADER_ROLE_ID });
  }

  /*
    ⚠️ **리더에서 내려오면 역할을 비운다.** `리더`는 리더 직급만 가질 수 있는 값이라
       그대로 두면 `과장 + 리더`처럼 짝이 어긋난 줄이 남는다 — 다시 고르게 한다.
       역할이 하나도 없는 부서면 고를 게 `없음`뿐이라 곧장 정한다.
  */
  const roleId =
    target?.roleId === LEADER_ROLE_ID
      ? rules.hasRoles(target.departmentId)
        ? ""
        : NO_ROLE_ID
      : target?.roleId;

  return updateInvite(invites, id, { positionId, roleId });
}

/**
 * Admin 겸직을 켜고 끈다.
 * ⚠️ 이미 나간 초대장은 못 고친다 — `updateInvite`가 `isSent`를 걸러 준다.
 * ⚠️ **몇 명까지인지 제한을 두지 않는다.** 예전엔 시스템이 계정을 발급해 기업당 1명이었지만,
 *    이제는 사람에게 붙는 권한이라 그 근거가 사라졌다(팀 확인 필요 시 여기서 막는다).
 */
export function toggleInviteAdmin(invites: Invite[], id: string): Invite[] {
  const target = invites.find((invite) => invite.id === id);
  if (!target) return invites;
  return updateInvite(invites, id, { isAdmin: !target.isAdmin });
}

export function removeInvite(invites: Invite[], id: string): Invite[] {
  return invites.filter((invite) => invite.id !== id);
}

/**
 * 1·2단계 편집분을 초대 한 줄에 다시 맞춘다 — **사라진 값은 비운다.**
 *
 * ⚠️ 다른 값으로 바꿔 놓지 않는다. 고른 적 없는 곳으로 초대장이 간다.
 * ⚠️ **예약값 둘(`리더`·`없음`)도 전제가 살아 있을 때만 남긴다.** 두 값은 스스로 뜻을 갖지
 *    않고 다른 칸의 상태에 매여 있다 — `리더`는 "이 직급이 리더 권한이다", `없음`은
 *    "이 팀에 역할이 하나도 없다". 1·2단계로 돌아가 그 전제를 바꾸면 값만 남고 뜻이 사라진다.
 *    전에는 검사 없이 통과시켜서, 직급 권한을 Leader에서 Member로 내리면 `과장 + 리더`처럼
 *    규칙이 금지한 조합이 **세 칸이 다 찬 채로** 발송됐다. 역할 칸은 목록에 없는 값이라
 *    `선택`으로 보이는데 상태에는 남아 있어, 화면과 발송이 서로 다른 말을 했다.
 * ⚠️ 비우면 확인 창이 "고르지 않은 줄"로 세어 준다(`useInviteCommit`) — 조용히 안 나간다.
 */
export function remapInvite(
  invite: Invite,
  options: {
    departmentIds: Set<string>;
    positionIds: Set<string>;
    roleIdsOf: (departmentId: string) => Set<string>;
  },
  rules: InviteRules,
): Invite {
  if (invite.isSent) return invite;

  const departmentId = options.departmentIds.has(invite.departmentId) ? invite.departmentId : "";
  const positionId = options.positionIds.has(invite.positionId) ? invite.positionId : "";

  /*
    ⚠️ **예약값 둘이 살아남는 조건이 느슨해졌다**(2026-08-10). 이제 둘 다 목록에서
       **직접 고르는 값**이라(`rolesFor`), 전제가 예전만큼 빡빡하지 않다.
       - `리더`: 리더 직급이거나, **아직 직급을 안 고른** 줄. 직급보다 역할을 먼저 고를 수
         있게 됐으므로 "직급이 리더일 때만"으로 두면 방금 고른 `리더`가 곧바로 지워진다.
       - `없음`: 팀만 정해져 있으면 된다. 역할이 있는 팀에서도 고를 수 있다
         (`fitsRoleAndPosition` 참고 — BE도 `subTeamTempId: null`을 허용한다).
  */
  const keepsReserved =
    (invite.roleId === LEADER_ROLE_ID &&
      (positionId === "" || rules.isLeaderPosition(positionId))) ||
    (invite.roleId === NO_ROLE_ID && departmentId !== "");

  return {
    ...invite,
    departmentId,
    positionId,
    roleId:
      keepsReserved || options.roleIdsOf(departmentId).has(invite.roleId) ? invite.roleId : "",
  };
}

/**
 * 이번에 발송될 줄 — 주소가 유효하고 **아직 안 보낸** 줄만.
 *
 * 이미 보낸 줄은 다시 보내지 않는다. 같은 주소가 여러 줄에 적혀 있으면 **첫 줄만** 나간다
 * — 화면에 중복 경고를 띄워도 그대로 누를 수 있어서, 같은 사람이 초대장을 두 번 받는다.
 *
 * ⚠️ **`팀당 리더 한 명`을 여기서 직접 본다.** 전에는 이 규칙이 검증에 없었다 —
 *    목록을 바꾸는 쪽(`changeInviteDepartment`)이 값을 지워서 우회했기 때문에,
 *    정작 "무엇이 규칙인가"는 코드 어디에도 적혀 있지 않았다. 값을 지우지 않기로 하면서
 *    규칙이 있어야 할 자리인 **발송 검증**으로 옮겼다.
 * ⚠️ 판정 기준은 화면과 **같은 함수**(`duplicatedLeaderIds`)다. 앞줄을 정상으로 보고
 *    뒤에 온 줄만 뺀다 — 주소 중복과 같은 규약이라, 줄에 `리더가 이미 있습니다`가 뜬
 *    그 줄이 정확히 빠진다. 각자 세면 경고는 뜨는데 발송은 되는 줄이 생긴다.
 */
export function sendableInvites(invites: Invite[], rules: InviteRules): Invite[] {
  const leaderClash = duplicatedLeaderIds(invites, rules.isLeaderPosition);
  const emailClash = duplicatedEmailIds(invites);

  // 이미 나간 주소 — 같은 주소를 새 줄에 다시 적어도 두 번 가지 않게
  const sentAddresses = new Set(
    invites.filter((invite) => invite.isSent).map((invite) => normalizeEmail(invite.email)),
  );

  return invites.filter((invite) => {
    if (invite.isSent || !isValidEmail(invite.email)) return false;
    // 한 팀에 리더가 둘이면 뒤에 온 줄은 안 나간다 — 줄에 뜬 경고와 같은 판정이다
    if (leaderClash.has(invite.id)) return false;
    // 같은 주소가 위에 또 있으면 뒤에 온 줄은 안 나간다 — 이것도 줄 경고와 같은 판정이다
    if (emailClash.has(invite.id)) return false;
    if (sentAddresses.has(normalizeEmail(invite.email))) return false;
    // 부서·역할·직급을 다 고르지 않은 줄은 보내지 않는다 — 어디 소속인지 모르는 계정이 생긴다.
    // 역할은 `없음`도 고른 것이다(`NO_ROLE_ID`) — 빈 값만 "아직 안 골랐다"는 뜻이다.
    if (!invite.departmentId || !invite.roleId || !invite.positionId) return false;
    /*
      ⚠️ **역할·직급 짝도 여기서 본다.** 전에는 안 봤다 — 2단계로 돌아가 직급 권한을
         Member에서 Leader로 **올리면** `리더 직급 + 일반 역할`이 세 칸이 다 찬 채로 남아
         그대로 나갔다. 내리는 방향만 `remapInvite`가 막고 있었고 올리는 방향이 비어 있었다
         (적대적 검토 #163). 규칙의 자리는 여기다.
    */
    if (!fitsRoleAndPosition(invite, rules)) return false;

    return true;
  });
}

/**
 * 발송 처리 — 이번에 나간 줄에만 도장을 찍는다. 나머지는 그대로 둔다.
 * ⚠️ 판정은 `sendableInvites` 하나가 한다 — 여기서 따로 세면 안 나간 줄에 도장이 찍힌다.
 */
export function markInvitesSent(invites: Invite[], rules: InviteRules): Invite[] {
  const going = new Set(sendableInvites(invites, rules).map((invite) => invite.id));
  return invites.map((invite) => (going.has(invite.id) ? { ...invite, isSent: true } : invite));
}
