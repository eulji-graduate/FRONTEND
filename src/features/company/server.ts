import "server-only";

import { requireAccessToken } from "@/features/auth/session";
import { serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { isMock } from "@/mocks/config";

import {
  type BeCompanyProfile,
  type BePosition,
  type BeTeam,
  toCompanyProfile,
  toDepartmentNode,
  toPosition,
  toRoleMemberCounts,
  toTeamMemberCounts,
  withoutSystemRoles,
} from "./mapper";
import { getMockCompanySetting } from "./mock/company";
import type { CompanySetting } from "./types";

/**
 * 기업 설정 조회 — **격리막**(CLAUDE.md §Mock 격리막).
 *
 * ⚠️ 컴포넌트는 반환 타입(`CompanySetting`)만 본다. 연동되면 여기 `isMock` 분기만
 *    실서버 호출로 바꾸고 매퍼가 shape을 흡수한다 — 화면은 안 바뀐다.
 * ⚠️ 회사는 세션(`companyId`)으로 정해진다 — 인자로 받지 않는다(§라우트 그룹).
 */
export async function getCompanySetting(): Promise<CompanySetting> {
  /*
    ⚠️ **팀 편집 화면 전용이라 시스템 역할을 뺀다**(`withoutSystemRoles`, 2026-08-14 BE PR
       #489). `없음`은 회사가 만든 역할이 아니라 전역 시드 행이다 — 그대로 두면 편집 트리에서
       사용자가 이름을 바꾸거나 지울 수 있는 것처럼 보인다. 목이든 실서버든 이 화면에
       나가는 값은 여기서 한 번에 거른다.
  */
  if (isMock) {
    const setting = getMockCompanySetting();
    return { ...setting, departments: setting.departments.map(withoutSystemRoles) };
  }

  /*
    ⚠️ **한 번에 주는 API가 없다.** 화면은 기본 정보·팀·직급을 한 화면에 그리는데 BE는 셋으로
       나뉘어 있다([확인] `CompanyController.getProfile` · `TeamController.list` ·
       `PositionController.list`) — 여기서 모아 하나로 돌려준다. 화면은 그 사실을 모른다.
    ⚠️ **나란히 부른다.** 줄줄이 기다리면 카드 셋이 다 그려질 때까지 세 번 왕복한다.
    ⚠️ 회사는 **토큰의 `companyId`** 로 정해진다 — 파라미터로 안 보낸다(§라우트 그룹).
  */
  const accessToken = await requireAccessToken();
  const [profile, teams, positions] = await Promise.all([
    serverApi<BeCompanyProfile>(ep.companyMe(), { accessToken }),
    serverApi<BeTeam[]>(ep.teams(), { accessToken }),
    serverApi<BePosition[]>(ep.jobPositions(), { accessToken }),
  ]);

  return {
    profile: toCompanyProfile(profile),
    departments: teams.map(toDepartmentNode).map(withoutSystemRoles),
    positions: positions.map(toPosition),
    teamMemberCounts: toTeamMemberCounts(teams),
    roleMemberCounts: toRoleMemberCounts(teams),
  };
}

/**
 * 팀·직급 목록만 — **사원 관리 화면들이 쓴다.**
 *
 * ⚠️ 이 자리에 `getCompanySetting`을 쓰면 안 된다(2026-08-12 고침). 그 함수가 부르는
 *    `GET /api/companies/me`는 **OWNER 전용**이라(BE `@PreAuthorize("hasRole('OWNER')")`),
 *    Admin 겸직자가 사원 관리에 들어가는 순간 403으로 **페이지가 통째로 죽었다** — FE 가드
 *    (`canManageMembers` = owner‖is_admin)와 데이터 소스의 권한이 어긋나 있었다.
 *    팀(`GET /api/teams`)·직급(`GET /api/job-positions`)은 로그인 전원에게 열려 있어
 *    (`isAuthenticated()`) 이 둘만 부르면 Admin도 막히지 않는다.
 * ⚠️ 기업 설정 화면(`/owner/setting`)은 계속 `getCompanySetting`을 쓴다 — 거긴 기본 정보
 *    (프로필)가 필요하고 OWNER 전용 화면이라 어긋날 일이 없다.
 */
export async function getCompanyOrg(): Promise<Pick<CompanySetting, "departments" | "positions">> {
  if (isMock) {
    const setting = await getMockCompanySetting();
    return { departments: setting.departments, positions: setting.positions };
  }

  const accessToken = await requireAccessToken();
  const [teams, positions] = await Promise.all([
    serverApi<BeTeam[]>(ep.teams(), { accessToken }),
    serverApi<BePosition[]>(ep.jobPositions(), { accessToken }),
  ]);

  return {
    departments: teams.map(toDepartmentNode),
    positions: positions.map(toPosition),
  };
}
