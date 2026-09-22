import type { Metadata } from "next";

import { AccessDenied } from "@/components/common/access-denied";
import { getCompanyOrg } from "@/features/company/server";
import { MemberListView } from "@/features/member/components/member-list-view";
import { getManagedMembersPage } from "@/features/member/manage-server";
import { MEMBER_FILTER, type MemberFilter, type MemberQuery } from "@/features/member/manage-types";
import { buildTeamRoles } from "@/features/member/team-roles";
import { roleHome } from "@/features/shell/home";
import { getViewer } from "@/features/shell/viewer";
import { canIssueAccount, canManageMembers } from "@/lib/permission";

/*
  ⚠️ **정적으로 굳히지 않는다.** 승인·직급 변경이 값을 바꾸는 화면이라 빌드 시각 값이
     박히면 방금 처리한 게 안 보인다. 세션이 붙으면 `getViewer()`가 쿠키를 읽어 저절로
     동적이 되지만, 목인 지금은 동적 신호가 없어 `○`(Static)으로 빌드된다.
*/
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "사원 관리",
};

/** 주소에 적힌 값이 우리가 아는 필터인지 — 아니면 전체로 되돌린다 */
function parseFilter(value: string | undefined): MemberFilter {
  const known = Object.values(MEMBER_FILTER) as string[];
  return value && known.includes(value) ? (value as MemberFilter) : MEMBER_FILTER.ALL;
}

/**
 * 사원 관리 목록 — 회사의 사람을 한 줄씩 본다.
 *
 * ⚠️ **화면은 Owner·Admin 둘 다** 들어온다(WORKFLOW §11). 승인·반려 버튼만 Owner 전용이고
 *    그건 상세에서 판정한다 — 화면 접근과 개별 액션의 권한이 갈리는 사례다.
 * ⚠️ **첫 페이지만 여기서 그린다**(CLAUDE.md §목록·페이지네이션). 그 아래는 화면이
 *    이어 붙인다 — 첫 화면까지 클라이언트로 만들면 조회 전체가 넘어간다(§핵심 4원칙 ①).
 * ⚠️ 검색·필터는 **주소에서 읽는다.** 화면 안 상태로 두면 새로고침·뒤로 가기에서 조건이
 *    날아가고, 무엇보다 **받아 온 페이지 안에서만** 찾게 된다.
 */
export default async function ManageMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  /*
    ⚠️ **판정이 먼저다.** 조회와 나란히 두면 권한 없는 사람의 요청도 BE까지 나간다 —
       연동되면 프론트가 권한 없는 조회를 대신 쏴 주는 경로가 된다(§권한).
       왕복 한 번을 잃지만 그게 맞다.
  */
  const viewer = await getViewer();
  /*
    ⚠️ **`notFound()`가 아니라 403이다**(2026-08-11). 관리 화면이 있다는 사실은 이미
       사이드바·역할 안내(`/roles`)가 알리고 있어 숨겨서 지킬 것이 없다 — 자격이 없는 것을
       "없는 화면"이라 하면 화면이 거짓말을 한다(§정직성).
  */
  if (!canManageMembers(viewer)) return <AccessDenied homeHref={roleHome(viewer.role)} />;

  const { q, filter } = await searchParams;
  const query: MemberQuery = { keyword: q ?? "", filter: parseFilter(filter) };

  /*
    ⚠️ **직급 목록을 같이 받는다.** 발급 창에서 직급을 손으로 적게 두면 회사에 없는 직급이
       생긴다 — 직급은 온보딩 2단계·기업 설정이 만든 **회사 목록**이고, 거기에 권한이 매여 있다.
  */
  /*
    ⚠️ **팀 이름을 사원 목록에서 뽑지 않는다.** 전에는 `listTeamNames()`가 사원 전체를 한 번 더
       훑어서, 이 화면 하나에 목록 조회가 두 번 나갔다 — 팀의 정본은 기업 설정의 조직 체계이고
       이미 여기서 받고 있다.
  */
  /*
    ⚠️ `getCompanySetting`이 아니다(2026-08-12 고침) — 그건 OWNER 전용 `companies/me`를 물고
       있어 Admin 겸직자가 이 페이지에서 403으로 죽었다. 여기 필요한 건 팀·직급 목록뿐이다.
  */
  const [firstPage, company] = await Promise.all([
    getManagedMembersPage(query, 0),
    getCompanyOrg(),
  ]);
  const teamNames = company.departments.map((team) => team.name);

  return (
    <MemberListView
      initialItems={firstPage.items}
      initialPage={firstPage.page}
      initialTotalPages={firstPage.totalPages}
      initialTotalCount={firstPage.totalCount}
      query={query}
      canIssueAccount={canIssueAccount(viewer)}
      teamNames={teamNames}
      positionNames={company.positions.map((position) => position.name)}
      teamRoles={buildTeamRoles(company.departments)}
    />
  );
}
