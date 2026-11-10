import { AUTHORITY, type Authority } from "@/constants/authority";
import type { ActionStatus } from "@/constants/domain";
import { HANDOVER_TYPE, type HandoverType } from "@/constants/handover";
import { type MemberStatus, ROLE_NONE_LABEL } from "@/constants/member";

import type { ManagedMember, ManagedMemberAction, MemberFilter } from "./manage-types";

/**
 * `GET /api/company/actions` 응답 원소 중 **이 화면이 실제로 읽는 것만** 적는다.
 *
 * ⚠️ 액션 도메인의 `BeActionSummary`(`features/action/mapper.ts`)와 **같은 BE DTO**를
 *    가리키지만 일부러 재사용하지 않는다 — 그쪽은 스무 개 필드를 다 적어 두었고, 이 카드가
 *    거기 얹히면 액션 목록 계약이 바뀔 때마다 사원 관리 화면까지 끌려간다(§Mock 격리막:
 *    도메인마다 자기 계약을 갖는다).
 */
export interface BeCompanyAction {
  id: number;
  title: string;
  status: ActionStatus;
  /** 마감일 `YYYY-MM-DD` — BE `Action.dueDate`는 필수값이라 `null`이 안 온다. */
  dueDate: string;
}

/**
 * BE shape → UI 계약 (§Mock 격리막 — **shape을 흡수하는 곳은 여기 하나다**).
 *
 * ⚠️ 컴포넌트는 이 파일을 모른다. BE가 모양을 바꾸면 여기만 고친다.
 * ⚠️ **필드 이름이 곳곳에서 다르다.** BE는 `positionName`·`workStatus`, 우리는
 *    `position`·`status`다. 어느 한쪽으로 맞추자고 화면을 고치면 연동할 때마다 화면이 흔들린다.
 */

/**
 * [확인] BE `MemberListItemResponse` — **목록은 상세보다 적게 준다.**
 *
 * ⚠️ **`joinedOn`이다**(`joinedAt` 아님). 이름을 잘못 읽으면 `undefined`가 조용히 빈 문자열이
 *    되어 **입사일 열이 통째로 빈칸**으로 뜬다 — 값이 없는 것과 구분이 안 된다.
 * ⚠️ **목록에는 `email`이 없다.** 표가 그 열을 안 그리므로(WORKFLOW §9: 이름·팀·직급·권한·
 *    역할·상태·입사일) 문제가 아니고, 상세(`BeMemberDetail`)에는 있다.
 * ⚠️ **목록에도 `pendingHandoverType`이 온다**(BE PR #9, 2026-11-03 — BE `MemberListItemResponse`
 *    대조). 대기 신청이 없으면 `null`이고, 값은 `workStatus`가 `WAITING`일 때만 채워진다.
 *    거르기는 서버(`filter` 파라미터)가 하지만, 목록 줄에서 휴직·오프보딩을 나눠 그리려면
 *    이 값이 있어야 한다.
 */
export interface BeMemberListItem {
  memberId: number;
  name: string;
  teamName: string | null;
  positionName: string | null;
  role: string;
  isAdmin: boolean;
  roleLabel: string | null;
  workStatus: string;
  /** `2020-01-02` — Jackson이 `LocalDate`를 ISO 문자열로 내린다 */
  joinedOn: string | null;
  /**
   * 대기 중인 인수인계 신청 종류 — `VACATION` · `OFFBOARDING`, 신청이 없으면 `null`.
   * ⚠️ **선택적이라고 적는다.** BE PR #9가 배포되기 전에는 이 필드 자체가 안 온다(`undefined`).
   */
  pendingHandoverType?: string | null;
}

/**
 * [확인] BE `MemberDetailResponse` — 목록에 없는 `email`·`teamId`·`jobPositionId`·`roleId`가
 * 더 있다.
 *
 * ⚠️ **`roleId`는 상세에만 있다**(2026-08-14 BE PR #489). 목록·조직도는 계속 `roleLabel`
 *    (표시용)만 주고, 폼이 선택 상태를 잡을 때 쓰는 id는 상세 조회에만 실려 온다.
 * ⚠️ **선택적이라고 타입에 그대로 적는다**(2026-08-14 프로덕션 재현 — BE PR #489가 아직
 *    실제로는 배포 전이라 이 필드 자체가 안 온다, `undefined`). 비필수(`?`)로 안 적으면
 *    이 필드를 직접 읽는 새 코드가 생겨도 타입체커가 못 잡아 준다(`manage-server.ts`의
 *    `!= null` 정규화가 왜 필요한지도 이 타입만 봐서는 안 보인다).
 */
export interface BeMemberDetail extends BeMemberListItem {
  teamId: number | null;
  jobPositionId: number | null;
  email: string | null;
  roleId?: number | null;
}

/**
 * 화면 필터 → BE 필터.
 *
 * ⚠️ **이름이 다르다.** 우리는 `VACATION_PENDING`(휴직), BE는 `LEAVE_PENDING`이다 —
 *    그대로 보내면 Spring이 enum 변환에 실패해 **400**이 난다. 상수를 화면 쪽에 맞춰 둔 건
 *    화면 문구가 "휴직"이기 때문이고, 그 간극을 메우는 게 매퍼의 일이다.
 */
export function toBeFilter(filter: MemberFilter): string {
  if (filter === "VACATION_PENDING") return "LEAVE_PENDING";
  return filter;
}

/**
 * 권한 문자열 → 우리 상수.
 *
 * ⚠️ **모르는 값이 오면 가장 낮은 권한으로 떨어뜨린다.** BE가 역할을 하나 늘렸을 때
 *    화면이 터지는 것보다, 덜 보이는 쪽이 안전하다 — 권한은 넘겨짚으면 안 되는 값이다(§권한).
 */
export function toAuthority(role: string): Authority {
  switch (role) {
    case AUTHORITY.OWNER:
      return AUTHORITY.OWNER;
    case AUTHORITY.LEADER:
      return AUTHORITY.LEADER;
    default:
      return AUTHORITY.MEMBER;
  }
}

/**
 * 역할 라벨 정규화 — **`toManagedMember`와 조직도(`manage-server.ts`의 org-chart 조회)가
 * 같은 규칙을 쓴다.** 값이 뭘 근거로 오든(목록·조직도) BE의 "없음" 시스템 값·빈 문자열은
 * 전부 `null`로 되돌린다(2026-08-14 재발견 — 아래 상세 사유는 `toManagedMember` 안 주석 참고).
 */
export function toRoleLabel(raw: string | null): string | null {
  return raw?.trim() && raw.trim() !== ROLE_NONE_LABEL ? raw : null;
}

/**
 * 근무 상태 → 우리 상수.
 *
 * ⚠️ 소프트 딜리트(`DELETED`)는 **상태가 아니라 목록에서 빠지는 일**이다(§도메인 상수) —
 *    그 판정은 부르는 쪽이 `isVisibleMemberStatus`로 한다. 여기서는 값만 옮긴다.
 * ⚠️ **모르는 값을 `ACTIVE`로 바꾸지 않는다.** 그러면 `DELETED`처럼 목록에서 빠져야 할 사람이
 *    **재직 중으로 되살아나고**, BE가 상태를 하나 늘렸을 때 그 사람들이 전부 재직으로 뭉친다 —
 *    화면이 거짓말을 한다(§정직성). 원문을 그대로 넘겨 `isVisibleMemberStatus`가 거르게 둔다.
 */
function toMemberStatus(workStatus: string): MemberStatus {
  return workStatus as MemberStatus;
}

/**
 * 대기 신청 종류 → 우리 상수.
 *
 * ⚠️ **모르는 값·없는 값은 `null`이다.** 이 값으로 `HANDOVER_TYPE_LABEL[type]`을 찾아 문구를
 *    만드는데, 원문을 그대로 넘기면 BE가 종류를 하나 늘렸을 때 라벨이 `undefined`로 뜬다.
 *    `null`이면 화면은 종류를 모르는 대기로 그리고, 틀린 종류를 말하지 않는다(§정직성).
 */
function toPendingHandoverType(raw: string | null | undefined): HandoverType | null {
  if (raw === HANDOVER_TYPE.VACATION) return HANDOVER_TYPE.VACATION;
  if (raw === HANDOVER_TYPE.OFFBOARDING) return HANDOVER_TYPE.OFFBOARDING;
  return null;
}

export function toManagedMember(item: BeMemberListItem | BeMemberDetail): ManagedMember {
  return {
    id: item.memberId,
    name: item.name,
    /*
      ⚠️ **목록에는 이메일이 없다.** 표가 그 열을 안 그리므로 빈 문자열로 둔다 —
         지어내지 않는다. 상세는 실제 값이 온다.
    */
    email: "email" in item ? (item.email ?? "") : "",
    /*
      ⚠️ **빈 문자열을 `null`로 되돌린다.** 우리 계약은 "팀 없음"을 `null`로 적기로 했고
         (Owner는 팀이 없다), 빈 문자열은 "이름이 없는 팀"과 구분이 안 된다.
    */
    teamName: item.teamName?.trim() ? item.teamName : null,
    position: item.positionName ?? "",
    authority: toAuthority(item.role),
    isAdmin: item.isAdmin,
    /*
      ⚠️ **BE의 시스템 값 `"없음"`도 `null`로 되돌린다**(2026-08-14 재발견 — 오래된 계정
         발급 경로가 남긴 값이라 역할이 아예 없는 사람에게 빈 문자열이 아니라 이 문자열
         그대로가 온다). 정규화하지 않으면 목록·조직도 표시(`?? "없음"`)는 우연히 같은
         글자라 눈치채지 못하지만, 이 값을 직접 쓰는 자리(과거 `changeMemberGradeAction`의
         `roleLabel` 비교)가 실제 역할 이름과 문자열 `"없음"`을 구분 못 해 저장이 거짓
         실패로 막힌 적이 있다 — 매퍼 한 곳에서 정규화해 두면 그 자리를 다시 만들어도
         같은 함정에 안 걸린다.
    */
    roleLabel: toRoleLabel(item.roleLabel),
    status: toMemberStatus(item.workStatus),
    joinedAt: item.joinedOn ?? "",
    /*
      ⚠️ **목록 응답이 준다**(BE PR #9). 상세 응답(`BeMemberDetail`)에는 없어 `null`이 되고,
         상세의 신청 정보는 `ManagedMemberDetail.pendingHandover`가 따로 든다.
    */
    pendingHandoverType: toPendingHandoverType(item.pendingHandoverType),
  };
}

/**
 * `GET /api/company/actions` 한 줄 → 사원 상세의 담당 액션 한 줄.
 *
 * [확인] BE 실코드 대조(2026-08-13) — `action/presentation/api/CompanyActionController.java`,
 * 응답 원소는 `ActionSummaryResponse`(개인 액션 목록과 **같은 DTO를 재사용**한다).
 *
 * ⚠️ **이 카드가 쓰는 네 값만 옮긴다.** 응답엔 `projectTag`·`teamName`·`sourceMeetingTitle`·
 *    `parentActionTitle`까지 오지만, 카드는 `액션 · 상태 · 마감` 세 열뿐이다(§명세: 화면에
 *    없는 걸 새로 만들지 않는다). 안 쓰는 필드를 옮겨 두면 화면이 의존하는 값처럼 읽힌다.
 * ⚠️ **`isDelayed`를 안 가져온다.** 판정 규칙이 BE(`ActionSummaryResponse` — `IN_PROGRESS &&
 *    dueDate < today`)와 FE(`constants/action.ts` `isDelayed`)에서 같아졌으므로(진행중 && 마감
 *    경과, 2026-08-16 팀 확정) 이 카드는 로컬 계산을 계속 쓴다 — 목(mock) 경로에도 같은
 *    배지가 필요한데 거기엔 BE 값이 없다. **정본은 하나(확정 규칙)이고 구현이 둘인 상태**
 *    이므로, 규칙이 바뀌면 두 곳을 함께 고쳐야 한다.
 * ⚠️ `id`를 문자열로 바꾼다 — 화면 계약(`ManagedMemberAction.id`)이 문자열이다.
 */
export function toManagedMemberAction(be: BeCompanyAction): ManagedMemberAction {
  return {
    id: String(be.id),
    title: be.title,
    status: be.status,
    dueDate: be.dueDate,
  };
}
