import "server-only";

import type { Authority } from "@/constants/authority";
import { HANDOVER_TYPE, type HandoverType } from "@/constants/handover";
import { isVisibleMemberStatus } from "@/constants/member";
import { requireAccessToken } from "@/features/auth/session";
import { getCompanyOrg } from "@/features/company/server";
/** ⚠️ 목록 3종 공용 봉투(`PageResponse`)라 프로젝트 매퍼에 사는 타입을 그대로 쓴다 — 사원 목록의 `MemberPageResponse`와는 다른 봉투다. */
import type { BePageResponse } from "@/features/project/mapper";
import { ApiError, serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { paginate, type PaginatedResult } from "@/lib/paginate";
import { isMock } from "@/mocks/config";

import { filterMembers, searchMembers } from "./manage-filter";
import {
  type BeCompanyAction,
  type BeMemberDetail,
  type BeMemberListItem,
  toAuthority,
  toBeFilter,
  toManagedMember,
  toManagedMemberAction,
  toRoleLabel,
} from "./manage-mapper";
import {
  type ManagedMember,
  type ManagedMemberActions,
  type ManagedMemberDetail,
  type MemberQuery,
  type PendingHandover,
} from "./manage-types";
import {
  findMockManagedMember,
  listMockManagedMembers,
  listMockMemberEmails,
} from "./mock/managed";
import type { OrgRosterMember } from "./org-types";
import { buildTeamRoles, roleIdOf } from "./team-roles";

/** [확인] BE `HandoverSummaryResponse` — `team-handover/mapper.ts`와 같은 응답. */
interface BeHandoverSummaryResponse {
  id: number;
  writerMemberId: number;
  handoverType: string;
  status: string;
  leaveStartAt: string | null;
  leaveEndAt: string | null;
  itemCount: number;
}

/** [확인] BE `HandoverResponse` — 중간 승인자·시각만 본다(나머지는 목록 응답에 이미 있다). */
interface BeHandoverDetailForApproval {
  intermediateApproverNameSnap: string | null;
  intermediateApprovedAt: string | null;
}

/**
 * 이 사원 명의로 처리 대기 중인 인수인계서 — `GET /api/handovers`(OWNER면 회사 전체,
 * 페이지네이션 없음)에서 `writerMemberId`로 찾는다. **대기 중인 두 상태만** 따로
 * 조회한다(`status=SUBMITTED`·`status=REASSIGNED`) — 전체 이력(FINALIZED·REJECTED
 * 포함)을 받아 오면 회사가 커질수록 이 화면 하나의 응답 크기가 계속 늘어난다.
 *
 * ⚠️ **신청 당시 권한 스냅샷을 BE가 안 준다.** `requesterAuthority`는 지금 권한
 *    (`currentAuthority`)으로 근사한다 — 팀장 공석 중 승급된 사람이 신청했다면 그때는
 *    일반 팀원이었어도 지금은 팀장으로 읽힌다(알려진 한계, mock은 신청 시점 값을 그대로
 *    굳혀 두지만 실 데이터엔 그 스냅샷이 없다).
 */
async function findPendingHandoverForMember(
  memberId: number,
  currentAuthority: Authority,
  accessToken: string,
): Promise<PendingHandover | null> {
  const [submitted, reassigned] = await Promise.all([
    serverApi<BeHandoverSummaryResponse[]>(ep.handovers({ status: "SUBMITTED" }), { accessToken }),
    serverApi<BeHandoverSummaryResponse[]>(ep.handovers({ status: "REASSIGNED" }), { accessToken }),
  ]);
  const pending = [...submitted, ...reassigned].find((h) => h.writerMemberId === memberId);
  if (!pending) return null;

  const type = pending.handoverType as HandoverType;
  const period =
    type === HANDOVER_TYPE.VACATION && pending.leaveStartAt && pending.leaveEndAt
      ? { from: pending.leaveStartAt.slice(0, 10), to: pending.leaveEndAt.slice(0, 10) }
      : null;

  let midApproval: PendingHandover["midApproval"] = null;
  if (pending.status === "REASSIGNED") {
    const detail = await serverApi<BeHandoverDetailForApproval>(ep.handover(pending.id), {
      accessToken,
    });
    if (detail.intermediateApproverNameSnap && detail.intermediateApprovedAt) {
      midApproval = {
        approverName: detail.intermediateApproverNameSnap,
        approvedAt: detail.intermediateApprovedAt.slice(0, 10),
      };
    }
  }

  return {
    id: String(pending.id),
    type,
    period,
    actionCount: pending.itemCount,
    midApproval,
    requesterAuthority: currentAuthority,
  };
}

/**
 * 사원 조회 — **격리막**(CLAUDE.md §Mock 격리막).
 *
 * ⚠️ 컴포넌트는 반환 타입만 본다. 연동되면 여기 `isMock` 분기만 실서버 호출로 바꾸고
 *    매퍼가 shape을 흡수한다 — 화면은 안 바뀐다.
 * ⚠️ 회사는 세션(`companyId`)으로 정해진다 — 인자로 받지 않는다(§라우트 그룹).
 * ⚠️ **퇴사자는 여기 안 온다**(2026-08-15 정정 — `RESIGNED`가 명부에 남는다던 이전 정책이
 *    뒤집혔다). BE `offboard()`가 오프보딩 최종 승인 시점에 바로 `deleted_at`을 찍어 그 사람은
 *    이후 모든 명부 조회에서 완전히 빠진다(§도메인 상수) — FE가 거를 대상 자체가 안 내려온다.
 *    `isVisibleMemberStatus`는 **모르는 상태값이 오면 거르는 안전망**일 뿐, 퇴사자를 걸러내는
 *    자리가 아니다. "퇴사" 표시는 그 사람이 남긴 회의·액션 **기록**(스냅샷)에만 붙는다 —
 *    이 명부 화면과는 다른 자리다.
 */
export async function listManagedMembers(): Promise<ManagedMember[]> {
  if (isMock) return listMockManagedMembers();

  /*
    ⚠️ **전체를 한 번에 받는 길은 안 만든다.** 사원이 수백 명이면 그 수백을 다 받아 오게 되고,
       BE도 목록은 페이지 단위로만 연다(`GET /api/members?page&size`). 목으로 돌 때만 쓰는
       편의 함수로 남긴다 — 부르는 곳은 `getManagedMembersPage`다.
  */
  throw new Error("사원 목록은 페이지 단위로 조회합니다 — getManagedMembersPage를 쓰세요.");
}

/** 한 화면에 그리는 줄 수 — 첫 페이지를 서버가 렌더하고 그 아래부터 이어 붙인다 */
export const MEMBER_PAGE_SIZE = 20;

/**
 * 조직도 전용 응답 — `GET /api/members/org-chart`, **팀 → 역할 → 사람 3단계**다.
 *
 * [확인] BE 실코드 대조(2026-08-14) — `OrgChartTeamResponse`·`OrgChartSubTeamResponse`·
 * `OrgChartMemberResponse`(`MemberController.orgChart`). **이전엔 "팀 → 사람" 2단계로
 * 잘못 가정해 뒀었다** — 그 가정으로는 실제 응답의 `subTeams`를 아예 안 읽어서
 * `team.members`가 매번 `undefined`였고, 방어 코드(`?? []`)가 그걸 조용히 빈 배열로 접어
 * **조직도가 팀마다 항상 0명으로 그려지고 있었다.** BE(안현님 보고 · PR #511)가 대표를
 * 아예 응답에서 빼던 것도 이 자리를 함께 고쳤다 — `teamId: null`·`name: "미배정"`인 팀 칸을
 * 응답 맨 뒤에 추가로 보낸다. 그 칸도 그냥 팀처럼 평평하게 펴면 된다 — `buildOrgChart`는
 * `teamName`이 아니라 `authority === OWNER`로 대표를 뽑아내므로 이 칸의 이름이 뭐든 상관없다.
 *
 * ⚠️ **이메일·겸직·근무상태·입사일이 없다.** 전 구성원이 보는 화면이라 인사 정보를 안
 *    싣는다(BE 주석: "조직도 응답에는 이름·직급·권한만 들어간다"). `OrgRosterMember`가
 *    이 화면이 실제로 쓰는 값만 계약으로 남기는 이유다(`org-types.ts`) — `ManagedMember`로
 *    억지로 채우면 없는 값을 지어내게 된다(§정직성).
 */
interface BeOrgChartTeam {
  teamId: number | null;
  name: string;
  subTeams: BeOrgChartSubTeam[];
}

/** 팀 안의 역할 묶음 — `roleLabel`이 사원 관리 목록의 그것과 같은 값이다 */
interface BeOrgChartSubTeam {
  roleLabel: string | null;
  members: BeOrgChartMember[];
}

/** 조직도 응답의 사람 한 칸 — 목록·상세보다 훨씬 적다(위 주석 참고) */
interface BeOrgChartMember {
  memberId: number;
  name: string;
  positionName: string | null;
  role: string;
}

/**
 * 조직도(`getPeopleDirectory`)가 쓰는 명부 전체 — BE 조직도 전용 응답 하나로 받는다.
 *
 * ⚠️ **더 이상 `GET /api/members`를 페이지 순회하지 않는다**(2026-08-14, 프로덕션 장애
 *    수정). 그 API는 `size`가 `@Max(100)`인 데다 `hasAnyRole('OWNER','ADMIN','LEADER')`
 *    전용이라(2026-08-18 실코드 재대조 — PO 결정으로 Leader까지는 열려 있다),
 *    `/app/people`(전 구성원이 쓰는 화면)에서 **Member 계정이 열면 403**이 났다.
 *    BE가 조직도 전용 응답(`GET /api/members/org-chart`)을 이미 열어 두고 있어 — 페이지
 *    단위가 아니라 명부 전체를 한 번에 주고, 권한도 전 구성원에게 열려 있다 — 그걸 그대로
 *    쓴다.
 * ⚠️ **3단계로 온 것을 도로 평평하게 편다.** `buildOrgChart`(`org-chart.ts`)는 원래
 *    평평한 `OrgRosterMember[]`를 받아 자기가 팀별로 다시 묶고 리더를 앞으로 당긴다 — BE가
 *    이미 팀·역할별로 준다고 그 로직을 새로 짤 필요는 없다. 팀이 나온 순서, 팀 안 사람 순서를
 *    그대로 유지해서 펴면 `buildOrgChart`가 같은 순서로 다시 묶는다(§목록: 순서는 회사가
 *    정한 것이라 프론트가 안 바꾼다).
 */
export async function listAllManagedMembersForOrgChart(): Promise<OrgRosterMember[]> {
  if (isMock) return listManagedMembers();

  const accessToken = await requireAccessToken();
  const teams = await serverApi<BeOrgChartTeam[]>(ep.memberOrgChart(), { accessToken });

  /*
    ⚠️ **`subTeams`·`members`가 없는 칸을 방어한다**(2026-08-14, 앞선 2단계 가정이 겪었던
       것과 같은 종류의 사고 — 사람·역할이 없는 팀에서 그 필드가 빈 배열이 아니라 필드째
       빠져 오면 `.flatMap`이 `undefined`에서 터진다).
  */
  return teams.flatMap((team) =>
    (team.subTeams ?? []).flatMap((subTeam) =>
      (subTeam.members ?? []).map((member): OrgRosterMember => ({
        id: member.memberId,
        name: member.name,
        teamName: team.name?.trim() ? team.name : null,
        position: member.positionName ?? "",
        authority: toAuthority(member.role),
        roleLabel: toRoleLabel(subTeam.roleLabel),
        // 이 응답엔 근무상태가 없다 — 지어내지 않는다(`OrgRosterMember.status` 주석)
      })),
    ),
  );
}

/**
 * 목록 한 페이지 — **거르기·자르기를 서버가 한다.**
 *
 * ⚠️ 전부 받아 화면에서 `slice`하지 않는다(CLAUDE.md §목록·페이지네이션). 사원이 수백
 *    명이면 그 수백을 다 받아 오고, 화면만 잘릴 뿐이다.
 * ⚠️ 지금은 목이라 메모리에서 자른다. 연동되면 이 함수만 질의 파라미터를 그대로 넘기면
 *    되고, 부르는 쪽(page.tsx·액션)은 안 바뀐다(§격리막).
 * ⚠️ 검색·필터도 **여기서** 건다. 화면에서 걸면 지금 받아 온 페이지 안에서만 찾게 되어,
 *    "없습니다"가 거짓말이 된다.
 */
export async function getManagedMembersPage(
  query: MemberQuery,
  page: number,
  pageSize: number = MEMBER_PAGE_SIZE,
): Promise<PaginatedResult<ManagedMember>> {
  if (isMock) {
    const all = await listManagedMembers();
    return paginate(searchMembers(filterMembers(all, query.filter), query.keyword), page, pageSize);
  }

  /*
    ⚠️ **검색·필터·자르기를 전부 서버가 한다**(`GET /api/members`, [확인] BE `MemberController.list`).
       받아 와서 화면이 거르면 지금 페이지 안에서만 찾게 되어 "없습니다"가 거짓말이 된다.
    ⚠️ 회사는 **토큰의 `companyId`** 로 정해진다 — 파라미터로 안 보낸다. 보내면 남의 회사
       사원을 조회할 수 있는 구멍이 된다(BE도 principal에서만 읽는다).
    ⚠️ `filter`는 이름이 갈린다 — 우리 `VACATION_PENDING` ↔ BE `LEAVE_PENDING`(`toBeFilter`).
    ⚠️ **번호 기준은 같다.** `page`는 우리 쪽도 BE도 0-base다(BE 표준 확정, 2026-08-10) —
       변환 없이 그대로 넘긴다.
  */
  const accessToken = await requireAccessToken();
  const params = new URLSearchParams({
    filter: toBeFilter(query.filter),
    page: String(Math.max(0, page)),
    size: String(pageSize),
  });
  if (query.keyword.trim()) params.set("q", query.keyword.trim());

  /*
    ⚠️ **`totalElements`다**(`totalCount` 아님 — [확인] BE `MemberPageResponse.java` record:
       `totalElements·totalPages·hasNext·page·size·content`, 2026-08-12 재대조). 전에는
       `totalCount`로 읽었는데 그 필드가 응답에 없어 `undefined`가 되고, `전체 N건`이 비고
       `totalPages`가 `NaN`이라 **다음 페이지 판정이 통째로 무너졌다**. 주석의 [확인] 표시까지
       반대로 적혀 있었다 — 이름 하나가 화면 전체를 조용히 죽이는 자리라 응답 그대로 옮긴다.
    ⚠️ `totalPages`도 **서버 값을 그대로 쓴다.** 우리가 나눠 만들면 반올림 규칙이 갈릴 때
       마지막 페이지가 한 번 더 불리거나 잘린다 — 세는 쪽과 자르는 쪽은 같은 곳이어야 한다.
  */
  const response = await serverApi<{
    totalElements: number;
    totalPages: number;
    hasNext: boolean;
    page: number;
    size: number;
    content: BeMemberListItem[];
  }>(`${ep.members()}?${params}`, { accessToken });

  /*
    ⚠️ **지워진 사람은 여기서 뺀다**(§도메인 상수). 퇴사자(`RESIGNED`)는 남는다 — 그 사람이
       남긴 회의·액션의 출처라 이름이 사라지면 추적이 끊긴다.
    ⚠️ 거른 만큼 전체 건수를 줄이지 않는다. 그 숫자는 **서버가 센 전체**이고, 화면의
       `전체 N건`은 그 값을 말해야 다음 페이지가 있는지와 어긋나지 않는다.
  */
  const items = response.content
    .map(toManagedMember)
    .filter((member) => isVisibleMemberStatus(member.status));

  return {
    items,
    page: response.page,
    totalPages: Math.max(1, response.totalPages),
    totalCount: response.totalElements,
  };
}

/**
 * 담당 액션 카드에 뜨는 줄 수 — BE 기본값(20)과 같게 둔다([확인] `CompanyActionController`).
 * ⚠️ 이 카드는 **무한 스크롤이 아니다.** 승인 직전에 "이 사람이 뭘 들고 있나"를 훑는
 *    자리라 한 화면이면 되고, 넘치면 몇 건만 보이는지 카드가 적는다(`member-action-list`).
 */
const MEMBER_ACTION_PAGE_SIZE = 20;

/**
 * 그 사원이 맡은 개인 액션 첫 페이지 — **`null`은 "못 읽었다"**(§manage-types).
 *
 * ⚠️ [확인] BE 실코드 대조(2026-08-13) — `action/presentation/api/CompanyActionController.java`
 *    (`GET /api/company/actions`, 커밋 `9646c7a2`). `@PreAuthorize("hasRole('OWNER') or
 *    principal.isAdmin()")`라 **사원 관리 화면 권한(`canManageMembers`)과 같은 문**이다 —
 *    이 함수를 부르는 자리가 이미 그 판정을 통과한 뒤다(`page.tsx`).
 * ⚠️ **`/api/actions`로는 못 채운다.** 거기의 `assigneeMemberId`는 LEADER 전용(같은 팀만)이라
 *    Owner·Admin이 부르면 남의 팀 사람에서 막힌다 — 그래서 BE가 회사 스코프로 이 경로를
 *    따로 냈다(같은 파라미터 이름, 다른 스코프).
 * ⚠️ **실패를 빈 목록으로 뭉개지 않는다.** 여기서 `[]`를 돌려주면 화면이 `맡고 있는 액션이
 *    없습니다`라고 말하는데, 그 말을 믿고 오프보딩을 승인하면 인수인계 없이 액션이 붕 뜬다.
 *    그렇다고 던지지도 않는다 — 액션 조회 하나가 안 된다고 사원 상세 전체가 오류 화면이 되면
 *    직급 변경·승인까지 막힌다. 못 읽었다는 사실만 `null`로 실어 보내고 카드가 말한다.
 * ⚠️ 마감 임박순(`sort=dueDate&order=asc`)이다 — 카드가 잘라 보여 주므로, 잘려 나가는 건
 *    **가장 급하지 않은 것**이어야 한다.
 */
async function findMemberActions(
  memberId: number,
  accessToken: string,
): Promise<ManagedMemberActions | null> {
  try {
    const response = await serverApi<BePageResponse<BeCompanyAction>>(
      ep.companyActions({
        assigneeMemberId: memberId,
        sort: "dueDate",
        order: "asc",
        page: 0,
        size: MEMBER_ACTION_PAGE_SIZE,
      }),
      { accessToken },
    );

    return {
      items: response.content.map(toManagedMemberAction),
      /*
        ⚠️ **`totalElements`다**(`totalCount` 아님 — 목록 3종 공용 봉투 `PageResponse`).
           이름을 잘못 읽으면 머리의 `전체 N건`이 비고, 잘렸는지 아닌지도 알 수 없게 된다.
      */
      totalCount: response.totalElements,
    };
  } catch {
    return null;
  }
}

/**
 * 없는 사람이면 `null` — 화면이 `notFound()`를 부른다.
 *
 * ⚠️ **탈퇴 처리된 계정도 없는 사람이다.** 목록만 거르고 상세를 안 거르면 비대칭이 생긴다 —
 *    목록에서 사라진 계정의 주소를 그대로 열 수 있고(탈퇴 직후 뒤로 가기가 흔한 길이다),
 *    상태 라벨이 빈칸으로 뜨는 데다 직급·권한 폼까지 열려서 **없는 사람에게 Admin 겸직을
 *    얹을 수 있다**. 액션들도 이 함수로 대상을 찾으므로 여기서 막으면 서버 재검사까지 함께 닫힌다.
 */
export async function getManagedMember(id: number): Promise<ManagedMemberDetail | null> {
  if (isMock) {
    const found = findMockManagedMember(id);
    if (!found || !isVisibleMemberStatus(found.member.status)) return null;

    /*
      ⚠️ **목 저장소는 역할을 이름(`roleLabel`)으로만 들고 있다.** 화면 계약(`roleId`)을
         채우려면 그 팀의 역할 목록에서 이름이 같은 항목의 id를 되찾아야 한다 — 실서버는
         애초에 id로 답하므로 이 다리가 필요 없다(`roleIdOf`).
    */
    const company = await getCompanyOrg();
    const roleId = roleIdOf(
      buildTeamRoles(company.departments),
      found.member.teamName ?? "",
      found.member.roleLabel,
    );
    return { ...found, roleId };
  }

  /*
    [확인] BE `MemberController.detail` — `GET /api/members/{memberId}`.
    ⚠️ **담당 액션은 이 응답에 없다** — `MemberDetailResponse`가 주는 건 사람 정보뿐이다.
       2026-08-13부터 별도 엔드포인트(`GET /api/company/actions`)로 따로 읽는다
       (`findMemberActions`). (인수인계 대기 신청도 마찬가지로 `findPendingHandoverForMember`가
       따로 채운다, 2026-08-12.)
  */
  const accessToken = await requireAccessToken();
  let detail: BeMemberDetail;
  try {
    detail = await serverApi<BeMemberDetail>(ep.member(id), { accessToken });
  } catch (error) {
    /*
      ⚠️ **모든 실패를 "없는 사람"으로 만들지 않는다.** 통신 장애나 500까지 `null`로 바꾸면
         화면이 `notFound()`를 띄워 **사원이 지워진 것처럼 보인다** — 실제로는 서버가 잠깐
         맛이 간 것이다(§정직성).
      ⚠️ 404·403만 `null`이다. 있는지 없는지를 알려 주지 않으려고 둘을 같이 묶는다.
    */
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) return null;
    throw error;
  }

  const member = toManagedMember(detail);
  if (!isVisibleMemberStatus(member.status)) return null;

  /*
    ⚠️ **나란히 부른다.** 담당 액션과 대기 신청은 서로를 안 보므로 차례로 부를 이유가 없다 —
       줄 세우면 이 화면이 두 번의 왕복만큼 늦게 뜬다.
  */
  const [pendingHandover, actions] = await Promise.all([
    findPendingHandoverForMember(id, member.authority, accessToken),
    findMemberActions(id, accessToken),
  ]);

  /*
    ⚠️ **id를 문자열로 옮긴다** — 팀·직급 id와 같은 관례다(BE 숫자를 화면 계층에서는
       문자열로 다루고, BFF로 나갈 때만 다시 숫자로 바꾼다).
    ⚠️ **`!= null`이다(`!==` 아님)** — BE PR #489가 아직 배포 전이면 `roleId` 필드
       자체가 없어 `undefined`로 온다. `!== null`만 보면 `String(undefined)`가 되어
       역할 셀렉트에 문자열 `"undefined"`가 값으로 실린다(2026-08-14 프로덕션 재현).
  */
  return {
    member,
    actions,
    pendingHandover,
    roleId: detail.roleId != null ? String(detail.roleId) : null,
  };
}

/** 이미 쓰고 있는 메일 주소 — 중복 발급을 막는다 */
export async function listMemberEmails(): Promise<string[]> {
  if (isMock) return listMockMemberEmails();

  /*
    ⚠️ **중복 판정은 서버가 한다.** 발급 API(`POST /api/manage/members`)가 이미 쓰는 주소를
       거르므로, 전체 메일 주소를 받아 와 화면에서 비교할 이유가 없다 — 그 목록은 그 자체로
       개인정보이기도 하다. 목으로 돌 때 폼 검증을 보여 주려고 남겨 둔다.
  */
  return [];
}

/**
 * 팀별 현재 팀장 — **팀당 한 명 규칙**을 서버에서 재검사할 때 쓴다.
 *
 * ⚠️ **명부 전체를 받아 거르지 않는다.** 사원이 수백 명이면 그 수백을 다 받아 오는데,
 *    필요한 건 팀마다 한 명뿐이다 — BE의 팀 조회가 `leaderMemberId`·`leaderName`을
 *    이미 얹어 준다([확인] `TeamNodeResponse`).
 * ⚠️ 목으로 돌 때는 명부에서 뽑는다 — 목에는 팀 조회가 따로 없다.
 */
export async function getTeamLeaders(): Promise<Map<string, { id: number; name: string }>> {
  if (isMock) {
    const leaders = new Map<string, { id: number; name: string }>();
    for (const member of listMockManagedMembers()) {
      if (!member.teamName) continue;
      if (member.authority !== "LEADER") continue;
      if (member.status === "RESIGNED") continue;
      leaders.set(member.teamName, { id: member.id, name: member.name });
    }
    return leaders;
  }

  const accessToken = await requireAccessToken();
  const teams = await serverApi<
    { name: string; leaderMemberId: number | null; leaderName: string | null }[]
  >(ep.teams(), { accessToken });

  const leaders = new Map<string, { id: number; name: string }>();
  for (const team of teams) {
    if (team.leaderMemberId === null) continue;
    leaders.set(team.name, { id: team.leaderMemberId, name: team.leaderName ?? "" });
  }
  return leaders;
}
