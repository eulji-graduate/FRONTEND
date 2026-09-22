"use server";

import { revalidatePath } from "next/cache";

import type { Authority } from "@/constants/authority";
import { AUTHORITY, POSITION_AUTHORITIES } from "@/constants/authority";
import { requireAccessToken } from "@/features/auth/session";
import { getCompanyOrg } from "@/features/company/server";
import { getViewer } from "@/features/shell/viewer";
import { serverApi, toUserMessage } from "@/lib/api";
import { todayIso } from "@/lib/date";
import { ep } from "@/lib/endpoints";
import type { PaginatedResult } from "@/lib/paginate";
import {
  canApproveFinal,
  canChangeAdminGrant,
  canChangeMemberGrade,
  canIssueAccount,
  canManageMembers,
} from "@/lib/permission";
import { isMock } from "@/mocks/config";

import { isEmailTaken, validateAccount } from "./account-validate";
import { GRADE_LOCK_NOTE, gradeLockOf } from "./grade";
import { getManagedMember, getManagedMembersPage, getTeamLeaders } from "./manage-server";
import type {
  AccountDraft,
  AccountErrors,
  ManagedMember,
  MemberActionResult,
  MemberQuery,
} from "./manage-types";
import {
  addMockManagedMember,
  approveMockHandover,
  findMockManagedMember,
  listMockMemberEmails,
  rejectMockHandover,
  updateMockMemberGrade,
} from "./mock/managed";
import { buildTeamRoles, isRoleOfTeam, roleNameOf } from "./team-roles";

/**
 * 사원 관리의 **변경 작업**. 전부 서버에서 돈다(핵심 4원칙 ②).
 *
 * ⚠️ **권한이 두 겹으로 갈린다**(WORKFLOW §11). 화면에는 Admin도 들어오지만
 *    **승인·반려는 OWNER 전용**이다 — 화면 접근과 개별 액션의 권한이 다른 사례라,
 *    판정 함수도 둘이다(`canChangeMemberGrade` / `canApproveFinal`).
 * ⚠️ **던지지 않는다.** 저장 실패는 화면 전체 실패가 아니다 — 던지면 error boundary가
 *    화면을 갈아치워 방금 고른 값이 날아간다(§토스트: error.tsx는 페이지 전체 실패용).
 */

const NO_SESSION = "세션이 만료되었습니다. 다시 로그인해 주세요";

function pathOf(id: number) {
  return `/manage/members/${id}`;
}

/**
 * 문지기 — 통과면 `null`, 막히면 이유 한 줄.
 * ⚠️ 세션 실패와 권한 거부를 **나눠 적는다** — 사용자가 할 수 있는 일이 다르다.
 */
type Viewer = Awaited<ReturnType<typeof getViewer>>;

async function gate(
  can: (actor: Viewer) => boolean,
  forbidden: string,
): Promise<{ viewer: Viewer } | { denied: string }> {
  let viewer: Viewer;
  try {
    viewer = await getViewer();
  } catch {
    return { denied: NO_SESSION };
  }
  return can(viewer) ? { viewer } : { denied: forbidden };
}

/**
 * 직급·권한·Admin 겸직 변경.
 *
 * ⚠️ 권한 값을 **화이트리스트로 본다.** 화면 셀렉트는 Leader·Member만 주지만 Server Action은
 *    주소만 알면 직접 부를 수 있다(§권한: 화면 숨김은 보안이 아니다) — 없으면 아무나
 *    자기 계정을 OWNER로 올릴 수 있다.
 * ⚠️ **잠긴 사람은 아예 막는다**(`gradeLockOf`) — 대표와 퇴사자다. 화면이 폼을 안 그리는
 *    것과 같은 판정을 서버가 다시 본다.
 */
/**
 * 구성원 조직도 — **사원이 바뀌면 여기도 다시 그린다.**
 *
 * ⚠️ 같은 명부를 읽는 화면이 둘이다(`/manage/members`·`/app/people`). 관리 쪽만 되살리면
 *    계정을 발급하거나 직급을 바꾼 뒤 구성원 화면이 **옛 명부를 그대로 보여준다** —
 *    바꾼 사람은 반영된 걸 보고 남들은 못 보는 상태가 된다.
 */
const PEOPLE_PATH = "/app/people";

/**
 * 직급·권한(·역할) 변경.
 *
 * ⚠️ **`roleId`는 안 보내면 "안 바꾼다"다**(부분 수정). 화면이 늘 값을 실어 보내던 때는
 *    직급 하나만 고쳐도 역할이 함께 써졌다 — 사용자가 고르지 않은 값을 저장하지 않는다.
 * ⚠️ **이름이 아니라 id로 받는다**(2026-08-14 BE PR #489). 역할 이름은 회사 안에서도
 *    중복될 수 있어(`(company_id, name)` UNIQUE 없음) 이름으로는 어느 역할인지 확정할 수
 *    없다 — id는 실제 행을 정확히 가리킨다.
 */
export async function changeMemberGradeAction(
  id: number,
  next: {
    position: string;
    authority: Authority;
    isAdmin: boolean;
    /** 사용자가 **실제로 바꿨을 때만** 넘긴다. `undefined`면 요청에서 빠진다 */
    roleId?: string | null;
  },
): Promise<MemberActionResult> {
  const pass = await gate(canChangeMemberGrade, "사원 정보를 바꿀 권한이 없습니다");
  if ("denied" in pass) return { isSuccess: false, message: pass.denied };

  /*
    ⚠️ **자기 계정은 못 바꾼다.** 권한은 위에서 아래로만 흐른다 — Admin 겸직자가 자기를
       Leader로 올리면 대표가 준 적 없는 화면(팀 관리·중간 승인)이 열리고, 기록상으로는
       "관리자가 승인했다"와 구분되지 않는다.
  */
  if (pass.viewer.id === id) {
    return { isSuccess: false, message: "자기 계정의 권한은 바꿀 수 없습니다" };
  }

  /*
    ⚠️ 직급도 **회사 목록 안에서만** 받는다. 화면은 셀렉트로 목록만 주지만 Server Action은
       주소만 알면 직접 부를 수 있다 — 없으면 회사에 없는 직급으로 바뀐다(§권한: 화면
       숨김은 보안이 아니다). 발급 검증과 같은 규칙이다.
  */
  const position = next.position.trim();
  if (!position) return { isSuccess: false, message: "직급을 골라 주세요" };

  /*
    ⚠️ Admin도 부르는 액션이라 OWNER 전용 `companies/me`를 물면 안 된다 — 팀·직급만 받는다
    ⚠️ **실패도 잡는다**(2026-08-15, `rooms/actions.ts`의 `getMeetingRooms()`와 같은 사고 —
       #553/#554/#556). 감싸지 않으면 이 액션 전체가 죽어 페이지가 500으로 날아간다.
  */
  let company: Awaited<ReturnType<typeof getCompanyOrg>>;
  try {
    company = await getCompanyOrg();
  } catch {
    return {
      isSuccess: false,
      message: "회사 정보를 불러오지 못했습니다 — 잠시 후 다시 시도해 주세요",
    };
  }
  if (!company.positions.some((entry) => entry.name === position)) {
    return { isSuccess: false, message: "회사에 없는 직급입니다" };
  }

  const allowed: readonly string[] = POSITION_AUTHORITIES;
  if (!allowed.includes(next.authority)) {
    return { isSuccess: false, message: "사원에게 줄 수 없는 권한입니다" };
  }

  /*
    ⚠️ **대상이 누구인지 서버가 본다.** 화면은 Owner면 폼을 안 그리지만 액션은 주소만 알면
       부를 수 있다 — 없으면 회사에 하나뿐인 대표를 Member로 끌어내릴 수 있고, `OWNER`는
       화이트리스트에 없어 **되돌릴 수도 없다**(일방통행 파괴).
  */
  /*
    ⚠️ `getManagedMember`는 404·403만 `null`로 접는다 — 그 외 실패(통신 장애 등)는 그대로
       다시 던진다(§정직성 주석, 그 함수 자체). 여기서도 잡아야 페이지가 안 죽는다.
  */
  let target: Awaited<ReturnType<typeof getManagedMember>>;
  try {
    target = await getManagedMember(id);
  } catch {
    return {
      isSuccess: false,
      message: "사원 정보를 불러오지 못했습니다 — 잠시 후 다시 시도해 주세요",
    };
  }
  if (!target) return { isSuccess: false, message: "없는 사원입니다" };
  /*
    ⚠️ 잠긴 이유(대표 · 퇴사)는 **화면과 같은 판정**을 쓴다. 두 곳이 각자 세면 화면은 폼을
       감췄는데 액션은 받아 주는 구멍이 생긴다 — 퇴사자가 정확히 그랬다: 최종 승인 직후
       카드가 남아 있어 로그인도 못 하는 계정에 Admin을 얹을 수 있었다.
  */
  const lock = gradeLockOf(target.member);
  if (lock) return { isSuccess: false, message: GRADE_LOCK_NOTE[lock] };

  /*
    ⚠️ **바꾼 게 아니면 역할을 건드리지 않는다.** 화면이 안 넘겼거나(=안 고쳤다) 지금 값과
       같으면 요청에서 빼서, 직급만 고친 저장이 역할을 덮어쓰지 않게 한다(부분 수정).
    ⚠️ **비우는 건 막지 않는다.** `없음`도 그 팀의 실제 역할 행이라(`roleId`가 있다) 다른
       역할을 고르는 것과 똑같이 취급한다 — 화면 셀렉트가 그 값을 늘 포함해서 준다.
    ⚠️ 역할은 **그 사람 팀의 것만** 붙는다. 화면은 그 팀 역할만 주지만 Server Action은
       직접 부를 수 있다 — 남의 팀 역할이 붙으면 조직도가 거짓말을 한다.
    ⚠️ **대상을 읽은 뒤에 본다.** 기준이 그 사람이 지금 속한 팀이라, 조회 전에 두면
       무엇과 견줘야 할지 알 수 없다. 팀은 이 화면에서 안 바꾼다.
  */
  const changesRole = next.roleId !== undefined && next.roleId !== target.roleId;
  if (changesRole) {
    /*
      ⚠️ **`null`로는 못 바꾼다.** 역할 없음은 `없음` 행의 실제 id를 고른 상태라 — 화면
         셀렉트는 역할이 있는 한 늘 그 값을 준다. `null`이 왔다면 그 팀에 역할 자체가
         없는 이상 상태이니, BE에 `Number(null)`을 보내는 대신 여기서 막는다.
    */
    const roleId = next.roleId;
    if (roleId === null || roleId === undefined) {
      return { isSuccess: false, message: "역할을 고를 수 없는 팀입니다" };
    }
    if (!isRoleOfTeam(buildTeamRoles(company.departments), target.member.teamName ?? "", roleId)) {
      return { isSuccess: false, message: "그 팀에 없는 역할입니다" };
    }
  }

  /*
    ⚠️ **팀에 리더는 한 명이다**(CLAUDE.md §권한 · DECISIONS). 둘이 되면 같은 팀원의
       인수인계를 두 사람이 중간 승인할 수 있고, 하나뿐인 리더를 내리면 그 팀의 중간 승인
       라인이 조용히 사라진다(WORKFLOW §7). 기업 설정도 같은 규칙을 지킨다.
  */
  /*
    ⚠️ **이 호출도 실패를 잡는다**(2026-08-15, 같은 사고 — #553/#554/#556). `findTeamLeaderClash`는
       리더 여부가 실제로 바뀔 때만 내부에서 `getTeamLeaders()`로 BE를 부르므로 늘 도는 건
       아니지만, 돌 때 실패하면 감싸지 않는 한 페이지가 500으로 죽는다.
  */
  let clash: string | null;
  try {
    clash = await findTeamLeaderClash(target.member, next.authority);
  } catch {
    return {
      isSuccess: false,
      message: "팀장 정보를 불러오지 못했습니다 — 잠시 후 다시 시도해 주세요",
    };
  }
  if (clash) return { isSuccess: false, message: clash };

  if (!isMock) {
    /*
      ⚠️ **호출이 둘로 갈린다.** 역할·직급은 `PATCH /api/members/{id}`, 관리자 겸직은
         `PATCH /api/members/{id}/admin`이다 — 앞쪽에 `isAdmin`을 실어 보내면 BE가
         **400(`FIELD_NOT_ALLOWED`)** 으로 막는다. 어드민이 자기를 복제하는 것을 끊으려고
         관리자 토글만 **OWNER 전용** 경로로 떼어 둔 것이다.
      ⚠️ **직급은 이름이 아니라 id로 보낸다.** 화면은 이름을 다루므로 회사 목록에서 되찾는다 —
         못 찾으면 보내지 않는다(없는 직급으로 바뀌느니 실패가 낫다).
      ⚠️ **`roleId`는 바뀔 때만 싣는다**([확인] BE `UpdateMemberRoleRequest.roleId` 2026-08-14
         PR #489). `null`(=필드 없음)은 "안 바꾼다"라, **안 고친 저장은 필드째 뺀다** — 늘
         실어 보내면 직급만 고쳐도 역할이 함께 써진다. 비우기(`없음`)는 그 행의 진짜 id를
         보내는 것이라 `changesRole`이 이미 걸러 낸 뒤라 여기서 값이 없을 일은 없다(위에서
         `next.roleId === null`이면 이미 실패로 돌아갔다).
    */
    const jobPosition = company.positions.find((item) => item.name === position);
    if (!jobPosition) return { isSuccess: false, message: "회사에 없는 직급입니다" };

    /*
      ⚠️ **겸직 검사를 첫 PATCH보다 먼저 한다**(2026-08-12 고침). 겸직 변경은 OWNER만 되는데
         (BE `@PreAuthorize("hasRole('OWNER')")`), 전에는 역할·직급 PATCH를 보낸 **뒤에**
         걸렀다 — ADMIN이 직급+겸직을 같이 바꾸면 직급은 이미 저장된 채 실패 메시지가 떠서
         **절반만 반영**됐다. 실패할 요청이면 아무것도 저장되기 전에 멈춰야 한다.
    */
    if (next.isAdmin !== target.member.isAdmin && !canChangeAdminGrant(pass.viewer)) {
      return { isSuccess: false, message: "관리자 겸직은 대표만 바꿀 수 있습니다" };
    }

    try {
      const accessToken = await requireAccessToken();
      await serverApi<unknown>(ep.member(id), {
        method: "PATCH",
        accessToken,
        /*
          ⚠️ **`roleId`는 바뀔 때만 키째 싣는다.** `changesRole`이 거짓이면 필드를 아예
             안 넣는다 — BE는 `null`(=필드 없음)을 "안 바꾼다"로 읽는다. 매 요청에 값을 실으면
             직급만 고쳐도 역할이 함께 써진다(위 §바꾼 게 아니면 역할을 건드리지 않는다).
          ⚠️ **여기 오면 `next.roleId`는 항상 문자열이다** — 위에서 `null`이면 이미 실패로
             돌아갔다. `Number()`로 바꿔 보낸다(id는 화면 계층에서만 문자열이다).
        */
        json: {
          role: next.authority,
          jobPositionId: Number(jobPosition.id),
          ...(changesRole ? { roleId: Number(next.roleId) } : {}),
        },
      });

      /* ⚠️ 실제로 달라질 때만 부른다 — 같은 값이면 괜히 왕복을 만들 이유가 없다 */
      if (next.isAdmin !== target.member.isAdmin) {
        await serverApi<unknown>(ep.memberAdmin(id), {
          method: "PATCH",
          accessToken,
          json: { isAdmin: next.isAdmin },
        });
      }
    } catch (error) {
      return { isSuccess: false, message: toUserMessage(error) };
    }

    revalidatePath(pathOf(id));
    revalidatePath("/manage/members");
    revalidatePath(PEOPLE_PATH);
    return { isSuccess: true };
  }

  /*
    ⚠️ **목 저장소는 이름으로 역할을 들고 있다.** 화면이 고른 id를 그 팀의 역할 목록에서
       이름으로 되찾아 넘긴다(`roleNameOf`) — 실서버 분기는 id를 그대로 BE에 보내면 되므로
       이 다리가 필요 없다.
  */
  updateMockMemberGrade(id, {
    position: next.position,
    authority: next.authority,
    isAdmin: next.isAdmin,
    ...(changesRole
      ? {
          roleLabel: roleNameOf(
            buildTeamRoles(company.departments),
            target.member.teamName ?? "",
            next.roleId ?? null,
          ),
        }
      : {}),
  });
  revalidatePath(pathOf(id));
  revalidatePath("/manage/members");
  revalidatePath(PEOPLE_PATH);
  return { isSuccess: true };
}

/**
 * 팀당 리더 한 명 규칙에 걸리는지 — 걸리면 이유 한 줄.
 *
 * ⚠️ 올릴 때는 **그 팀에 이미 리더가 있나**, 내릴 때는 **그 팀의 마지막 리더인가**를 본다.
 *    한쪽만 막으면 리더가 둘이 되거나 아예 없어진다.
 * ⚠️ 팀이 없는 사람(Owner)은 해당 없다 — 여기 오기 전에 이미 걸러진다.
 * ⚠️ **퇴사자는 리더 수에서 뺀다**(2026-08-08 정정) — 팀장이 오프보딩 최종 승인되면
 *    그 팀은 실제로 공석이어야 한다(WORKFLOW §7 "리더 공석 중에도... 막히지 않음").
 *    `approveMockHandover`가 그 사람의 `authority`도 같이 내리지만, 혹시 놓치는 경로가
 *    생겨도 여기서 한 번 더 걸러야 유령 팀장 때문에 승급이 영영 막히지 않는다.
 */
async function findTeamLeaderClash(
  target: ManagedMember,
  nextAuthority: Authority,
): Promise<string | null> {
  const team = target.teamName;
  if (!team) return null;

  const wasLeader = target.authority === AUTHORITY.LEADER;
  const willBeLeader = nextAuthority === AUTHORITY.LEADER;
  if (wasLeader === willBeLeader) return null;

  /*
    ⚠️ **명부 전체를 받지 않는다.** 전에는 `listManagedMembers()`를 불렀는데, 연동 뒤 그 함수는
       "페이지 단위로 조회하라"며 던진다 — 라이브에서 팀장 권한을 바꾸려 할 때마다 액션이
       통째로 터졌다. 팀 조회가 팀장을 이미 얹어 준다.
  */
  const leaders = await getTeamLeaders();
  const existing = leaders.get(team);
  const isOtherPerson = existing !== undefined && existing.id !== target.id;

  if (willBeLeader && isOtherPerson) {
    return `${team}에는 이미 팀장(${existing.name})이 있습니다. 먼저 그 사람의 권한을 바꿔 주세요`;
  }
  if (!willBeLeader && !isOtherPerson) {
    return `${team}의 유일한 팀장입니다. 후임을 먼저 정해 주세요`;
  }
  return null;
}

const NO_PENDING = "승인을 기다리는 신청이 없습니다";
const NO_MID_APPROVAL = "팀장 중간 승인이 아직 끝나지 않았습니다";

/**
 * 최종 승인 — **OWNER 전용**(WORKFLOW §7, 2026-08-06 Admin 제외).
 * ⚠️ 신청이 실제로 있는지 서버가 다시 본다 — 화면이 보낸 id만 믿으면 이미 처리된 건을
 *    두 번 승인하게 된다.
 * ⚠️ **일반 팀원 신청은 중간 승인이 끝나야 최종 승인할 수 있다**(CodeRabbit 지적,
 *    2026-08-09) — 화면(`handover-approval-card.tsx`)은 `canApprove`가 있으면 늘 버튼을
 *    그리지만, 팀장이 아직 `/team/handover`에서 처리하지 않은 건까지 여기서 바로 승인해
 *    버리면 중간 승인 단계가 통째로 건너뛰인다. **팀장 본인 신청**(`requesterAuthority`가
 *    LEADER)은 원래 중간 승인이 없는 흐름이라 이 검사에서 뺀다(WORKFLOW §7).
 */
export async function approveHandoverAction(id: number): Promise<MemberActionResult> {
  const pass = await gate(canApproveFinal, "최종 승인은 대표만 할 수 있습니다");
  if ("denied" in pass) return { isSuccess: false, message: pass.denied };

  if (isMock) {
    const pendingHandover = findMockManagedMember(id)?.pendingHandover;
    if (!pendingHandover) {
      return { isSuccess: false, message: NO_PENDING };
    }
    if (pendingHandover.requesterAuthority !== AUTHORITY.LEADER && !pendingHandover.midApproval) {
      return { isSuccess: false, message: NO_MID_APPROVAL };
    }
    approveMockHandover(id);
  } else {
    /*
      ⚠️ **중간 승인 검사는 여기서 다시 안 한다.** BE `finalizeApproval`이 이미 그 규칙을
         갖고 있다(`status !== REASSIGNED && !directOffboardingFinalizeAllowed`이면
         `HO_FINALIZE_NOT_ALLOWED`) — 화면이 잘못 눌러도 서버가 막고, 그 메시지를
         `toUserMessage`로 그대로 보여준다. 규칙을 여기서 다시 베끼면 BE가 바뀔 때 둘이 갈린다.
    */
    try {
      const pendingHandover = (await getManagedMember(id))?.pendingHandover;
      if (!pendingHandover) return { isSuccess: false, message: NO_PENDING };

      const accessToken = await requireAccessToken();
      await serverApi<unknown>(ep.handoverFinalize(Number(pendingHandover.id)), {
        method: "PATCH",
        accessToken,
      });
    } catch (error) {
      return { isSuccess: false, message: toUserMessage(error) };
    }
  }

  revalidatePath(pathOf(id));
  revalidatePath("/manage/members");
  revalidatePath(PEOPLE_PATH);
  return { isSuccess: true };
}

/**
 * 반려 — **사유가 있어야 한다.**
 * ⚠️ 사유 없이 되돌리면 신청한 사람은 무엇을 고쳐 다시 내야 하는지 알 수 없다.
 *    화면에서도 빈 사유로는 버튼이 안 열리지만, 액션은 직접 부를 수 있어 여기서 다시 본다.
 */
export async function rejectHandoverAction(
  id: number,
  reason: string,
): Promise<MemberActionResult> {
  const pass = await gate(canApproveFinal, "반려는 대표만 할 수 있습니다");
  if ("denied" in pass) return { isSuccess: false, message: pass.denied };

  if (!reason.trim()) return { isSuccess: false, message: "반려 사유를 입력해 주세요" };

  if (isMock) {
    /*
      ⚠️ **사유가 지금은 아무 데도 안 남는다**(mock) — 받아서 검사만 하고 버린다. 실 연동은
         `reason`을 `PATCH .../reject` 본문에 그대로 싣는다(BE `RejectHandoverRequest.reason`).
      ⚠️ **신청자가 사유를 어디서 보는지는 아직 안 정해졌다**(알림 화면이 없다) — 화면에도
         "전달됩니다"라고 쓰지 않는다(§정직성, `handover-approval-card` 주석 참고).
    */
    if (!findMockManagedMember(id)?.pendingHandover) {
      return { isSuccess: false, message: NO_PENDING };
    }
    rejectMockHandover(id);
  } else {
    try {
      const pendingHandover = (await getManagedMember(id))?.pendingHandover;
      if (!pendingHandover) return { isSuccess: false, message: NO_PENDING };

      const accessToken = await requireAccessToken();
      await serverApi<unknown>(ep.handoverReject(Number(pendingHandover.id)), {
        method: "PATCH",
        json: { reason },
        accessToken,
      });
    } catch (error) {
      return { isSuccess: false, message: toUserMessage(error) };
    }
  }

  revalidatePath(pathOf(id));
  revalidatePath("/manage/members");
  revalidatePath(PEOPLE_PATH);
  return { isSuccess: true };
}

/** 계정 발급 결과 — 성공하면 만들어진 사람의 id를 돌려준다(화면이 결과 창을 띄운다) */
export interface IssueAccountResult {
  errors: AccountErrors;
  /** 칸과 무관한 실패 한 줄(권한 없음·미연동 등) */
  message?: string;
  issued?: { id: number; name: string; email: string };
  /**
   * **계정은 만들어졌는데 겸직만 못 붙은 상태**(2026-08-13, 코드래빗 지적).
   *
   * ⚠️ 발급(POST)과 겸직(PATCH)은 **원자적이지 않다** — BE `IssueMemberRequest`에 `isAdmin`이
   *    없어 두 번 나눠 부를 수밖에 없다. 가운데서 끊기면 계정은 이미 있으므로, 실패로 되돌리고
   *    다시 누르게 하면 **중복 이메일 오류만 뜨고 계정은 겸직 없이 남는다.**
   *    그래서 실패가 아니라 **부분 성공**으로 알린다 — 사람은 사원 상세에서 겸직만 켜면 된다.
   */
  adminGrantFailed?: boolean;
}

/**
 * 계정 발급 — **Owner·Admin 겸직자 둘 다**(WORKFLOW §11, 2026-08-06 Owner도 가능).
 *
 * ⚠️ 화면 접근 권한과 **같은 문**이라 별도 판정 함수를 두지 않는다(`canIssueAccount`는
 *    `canManageMembers`의 다른 이름이다).
 * ⚠️ 비밀번호를 만들지 않는다 — 아이디와 첫 비밀번호는 **메일로 나간다**. 화면이 정하면
 *    그 값을 누군가 알고 있게 된다.
 * ⚠️ 입사일은 **여기서 찍는다**. 화면에서 `new Date()`를 부르면 서버 렌더와 갈린다.
 */
export async function issueAccountAction(draft: AccountDraft): Promise<IssueAccountResult> {
  // ⚠️ 발급 전용 판정을 쓴다 — `canChangeMemberGrade`와 지금 결과가 같아도 정책이 갈릴 수 있다
  const pass = await gate(canIssueAccount, "계정을 발급할 권한이 없습니다");
  if ("denied" in pass) return { errors: {}, message: pass.denied };

  /*
    화면과 **같은 함수**로 다시 본다 — 규칙이 두 벌이면 어긋난다.
    ⚠️ 직급 목록을 **여기서 구해 넘긴다.** 화면이 보낸 값을 그대로 믿으면 회사에 없는
       직급으로도 발급된다(§권한: 화면 숨김은 보안이 아니다).
  */
  /*
    ⚠️ Admin도 발급할 수 있다 — OWNER 전용 `companies/me` 대신 팀·직급만 받는다(403 방지)
    ⚠️ **실패도 잡는다**(2026-08-15, 같은 사고 — #553/#554/#556/#558).
  */
  let company: Awaited<ReturnType<typeof getCompanyOrg>>;
  try {
    company = await getCompanyOrg();
  } catch {
    return { errors: {}, message: "회사 정보를 불러오지 못했습니다 — 잠시 후 다시 시도해 주세요" };
  }
  const errors = validateAccount(
    draft,
    company.positions.map((position) => position.name),
    buildTeamRoles(company.departments),
  );
  if (Object.keys(errors).length > 0) return { errors };

  if (!isMock) {
    /*
      [확인] BE `ManageMemberController` — `POST /api/manage/members`.
      비밀번호를 만들지 않는다: 기업코드·이메일·첫 비밀번호를 **서버가 메일로 보낸다.**
      ⚠️ 중복 메일은 **서버가 본다.** 화면이 목록을 들고 있어도 그 사이 다른 관리자가 같은
         주소로 발급했을 수 있다 — 그때는 BE의 `message`를 그대로 이메일 칸에 띄운다.
      ⚠️ 팀·직급은 **id**로 보낸다. 화면은 이름을 다루므로 회사 목록에서 되찾는다.
    */
    const jobPosition = company.positions.find((item) => item.name === draft.position);
    if (!jobPosition) return { errors: { position: "회사에 없는 직급입니다" } };

    const team = company.departments.find((item) => item.name === draft.teamName);
    if (!team) return { errors: { teamName: "회사에 없는 팀입니다" } };

    /*
      ⚠️ **id가 숫자가 아닐 수 있다.** 화면에서 방금 만든 팀·직급은 아직 저장 전이라 임시
         id를 들고 있다 — 그대로 `Number()`하면 `NaN`이 나가고 BE가 400으로 되돌려 주는데,
         그 문구는 "왜 안 되는지"를 말해 주지 못한다.
    */
    const teamId = Number(team.id);
    const positionId = Number(jobPosition.id);
    if (!Number.isInteger(teamId)) {
      return { errors: { teamName: "먼저 기업 설정에서 팀을 저장해 주세요" } };
    }
    if (!Number.isInteger(positionId)) {
      return { errors: { position: "먼저 기업 설정에서 직급을 저장해 주세요" } };
    }

    /*
      ⚠️ **겸직 토글은 발급 요청에 못 싣는다** — BE `IssueMemberRequest`에 `isAdmin`이 없다
         ("발급 시점엔 항상 false"). 전에는 토글 값을 **아무 데도 안 보내서** 켜고 발급해도
         겸직이 안 붙는데 성공 토스트가 떴다(침묵 탈락, §정직성 위반). 발급 뒤
         `PATCH /members/{id}/admin`을 이어 부르는 걸로 고쳤고, 그 경로가 **OWNER 전용**이라
         Admin 발급자가 토글을 켰으면 보내기 전에 여기서 막는다 — 직급 변경과 같은 규칙이다.
    */
    if (draft.isAdmin && !canChangeAdminGrant(pass.viewer)) {
      return { errors: {}, message: "관리자 겸직 발급은 대표만 할 수 있습니다" };
    }

    /*
      ⚠️ 응답을 버리지 않는다(2026-08-12 고침 — [확인] BE `IssuedMemberResponse`:
         `memberId·name·email·…`). 전에는 `serverApi<unknown>`으로 버려서, 목에서는 뜨던
         "OO님 보기" 결과 창이 라이브에서만 안 떴다.
    */
    const accessToken = await requireAccessToken();
    let issuedMember: { memberId: number; name: string; email: string };
    try {
      issuedMember = await serverApi<{ memberId: number; name: string; email: string }>(
        ep.manageMembers(),
        {
          method: "POST",
          accessToken,
          json: {
            name: draft.name,
            email: draft.email,
            teamId: teamId,
            jobPositionId: positionId,
            /* ⚠️ **`role`은 필수다**(BE `@NotNull`). 빠뜨리면 **항상 400**이다 */
            role: draft.authority,
            /*
              ⚠️ **생략하면 BE가 `없음`으로 채운다**([확인] BE `IssueMemberRequest.roleId`,
                 선택 필드). 화면 기본값이 이미 그 팀의 `없음` 행 id라(`emptyDraft`) 사실상
                 늘 값이 실리지만, 방어적으로 없을 때는 필드째 뺀다.
            */
            ...(draft.roleId ? { roleId: Number(draft.roleId) } : {}),
          },
        },
      );
    } catch (error) {
      /* 중복 메일이 가장 흔한 실패라 이메일 칸에 붙인다 — 폼 오류는 인라인이다(DECISIONS §7) */
      return { errors: { email: toUserMessage(error) } };
    }

    /*
      ⚠️ **여기서부터 계정은 이미 있다.** 겸직 PATCH가 실패해도 발급을 없던 일로 되돌릴 수
         없어서(BE에 취소 경로가 없다) 실패로 돌려주면 안 된다 — 다시 누르면 중복 이메일
         오류만 나고 계정은 겸직 없이 남는다. **부분 성공으로 알리고** 다음 할 일을 말한다
         (§정직성: 절반 된 것을 실패나 성공으로 뭉개지 않는다).
      ⚠️ 목록·조직도 갱신은 **어느 쪽이든 한다** — 계정이 생긴 건 사실이다.
    */
    let adminGrantFailed = false;
    if (draft.isAdmin) {
      try {
        await serverApi<unknown>(ep.memberAdmin(issuedMember.memberId), {
          method: "PATCH",
          accessToken,
          json: { isAdmin: true },
        });
      } catch {
        adminGrantFailed = true;
      }
    }

    revalidatePath("/manage/members");
    revalidatePath(PEOPLE_PATH);
    revalidatePath(pathOf(issuedMember.memberId));
    return {
      errors: {},
      issued: { id: issuedMember.memberId, name: issuedMember.name, email: issuedMember.email },
      ...(adminGrantFailed ? { adminGrantFailed: true } : {}),
    };
  }

  /*
    ⚠️ 중복은 **서버가 본다.** 화면이 목록을 들고 있어도 그 사이에 다른 관리자가 같은 주소로
       발급했을 수 있다 — 두 계정에 같은 메일이 붙으면 첫 비밀번호가 어디로 갈지 알 수 없다.
  */
  if (isEmailTaken(draft.email, listMockMemberEmails())) {
    return { errors: { email: "이미 쓰고 있는 이메일입니다" } };
  }

  // ⚠️ 발급으로도 리더가 둘이 되면 안 된다 — 직급 변경과 같은 규칙이다
  const clash = await findTeamLeaderClash(
    { teamName: draft.teamName, authority: AUTHORITY.MEMBER, id: -1 } as ManagedMember,
    draft.authority,
  );
  if (clash) return { errors: { authority: clash } };

  /*
    ⚠️ **목 저장소는 이름으로 역할을 들고 있다.** 화면이 고른 id를 그 팀의 역할 목록에서
       이름으로 되찾아 넘긴다(`roleNameOf`) — 실서버 분기는 id를 그대로 BE에 보내면 되므로
       이 다리가 필요 없다.
  */
  const issued = addMockManagedMember(
    {
      name: draft.name,
      email: draft.email,
      teamName: draft.teamName,
      position: draft.position,
      authority: draft.authority,
      isAdmin: draft.isAdmin,
      roleLabel:
        roleNameOf(buildTeamRoles(company.departments), draft.teamName.trim(), draft.roleId) ?? "",
    },
    todayIso(),
  );
  revalidatePath("/manage/members");
  revalidatePath(PEOPLE_PATH);
  return { errors: {}, issued: { id: issued.id, name: issued.name, email: issued.email } };
}

/**
 * 목록 다음 페이지 — 무한 스크롤이 부른다.
 *
 * ⚠️ 조회지만 **Server Action**이다. 클라이언트가 `server.ts`를 직접 못 부르므로
 *    (그건 `server-only`다) 얇게 감싼다 — 시스템 화면들과 같은 방식이다.
 * ⚠️ 권한을 여기서도 본다. 목록 첫 페이지는 화면이 막지만 이 액션은 주소만 알면 부를 수 있다.
 */
export async function fetchMembersPageAction(
  query: MemberQuery,
  page: number,
): Promise<PaginatedResult<ManagedMember>> {
  /*
    ⚠️ 거부는 **빈 페이지로 돌려주지 않는다.** 빈 결과를 성공으로 돌려주면 무한 스크롤 훅이
       그걸 그대로 덮어써서, 화면엔 앞 페이지가 남아 있는데 머리글만 "전체 0명"이 되고
       [다시 시도]도 사라진다 — 조용히 멈추는 셈이다(§정직성·§목록 3상태).
       던지면 훅이 받아 [다시 시도]를 띄운다. 스크롤 도중 세션이 끊기는 흔한 길이다.
  */
  const pass = await gate(canManageMembers, "사원 목록을 볼 권한이 없습니다");
  if ("denied" in pass) throw new Error(pass.denied);

  // ⚠️ `page`는 0-base다(BE 표준 확정, 2026-08-10) — NaN·Infinity·음수는 모두 0으로 당긴다.
  const safePage = Number.isFinite(page) ? Math.max(0, Math.trunc(page)) : 0;
  return getManagedMembersPage(query, safePage);
}
