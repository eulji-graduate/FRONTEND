import { AUTHORITY, OWNER_POSITION_FALLBACK_LABEL } from "@/constants/authority";
import { MEMBER_STATUS, ROLE_NONE_LABEL } from "@/constants/member";

import {
  NO_TEAM_LABEL,
  type OrgChart,
  type OrgMember,
  type OrgRosterMember,
  type OrgSummary,
  type OrgTeam,
} from "./org-types";

/**
 * 구성원 화면이 쓰는 **순수 함수들**.
 *
 * ⚠️ 서버 파일(`org-server.ts`)에 두지 않는 건 그쪽이 `server-only`라 테스트가 import를
 *    못 하기 때문이다. 누구를 보여줄지 정하는 규칙이라 테스트가 붙어야 한다.
 */

/**
 * 사람 찾기 — **이름·팀·역할·직급** 네 곳을 본다.
 *
 * ⚠️ 사원 관리(`searchMembers`)와 **보는 곳이 다르다.** 저기는 이름·팀·이메일인데,
 *    관리자가 계정을 찾는 자리라 이메일이 열쇠다. 여기는 "프론트엔드가 누구지",
 *    "팀장이 누구지"로 찾는 자리라 역할·직급이 열쇠다.
 * ⚠️ 그래서 저 함수를 그대로 못 쓴다. 억지로 합치면 한쪽 화면의 검색이 조용히 나빠진다.
 */
export function searchOrgMembers(members: OrgRosterMember[], keyword: string): OrgRosterMember[] {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return members;

  return members.filter((member) =>
    [member.name, member.teamName ?? "", member.roleLabel ?? "", member.position].some((field) =>
      field.toLowerCase().includes(needle),
    ),
  );
}

/** 화면 맨 위 요약 — **검색 전 명부**를 넘겨야 한다(§org-types) */
export function summarizeOrg(members: OrgRosterMember[]): OrgSummary {
  const teams = new Set(
    members
      .filter((member) => member.authority !== AUTHORITY.OWNER)
      .map((member) => member.teamName ?? NO_TEAM_LABEL),
  );

  return {
    totalCount: members.length,
    teamCount: teams.size,
    vacationCount: members.filter((member) => member.status === MEMBER_STATUS.VACATION).length,
  };
}

/** 목록 한 줄에서 조직도가 쓰는 것만 꺼낸다 — 이메일·입사일은 안 싣는다(§org-types) */
function toOrgMember(member: OrgRosterMember): OrgMember {
  return {
    id: member.id,
    name: member.name,
    // BE는 Owner 직급을 안 준다(빈 문자열) — 그 자리는 `대표`로 채운다(§constants/authority)
    position:
      member.position ||
      (member.authority === AUTHORITY.OWNER ? OWNER_POSITION_FALLBACK_LABEL : member.position),
    // 없으면 `없음` — 화면이 정하지 않게 여기서 맞춘다(§org-types)
    roleLabel: member.roleLabel ?? ROLE_NONE_LABEL,
    authority: member.authority,
    status: member.status,
  };
}

/**
 * 대표 → 팀 → 팀원 순으로 세운다.
 *
 * **정렬 규칙**
 * - 팀 차례는 **명부에 나온 순서 그대로**다. 가나다순으로 다시 세우지 않는다 —
 *   그 순서는 회사가 온보딩에서 정한 것이고, 프론트가 바꾸면 화면이 회사와 다른 말을 한다.
 * - 팀 안에서는 **리더가 맨 앞**, 나머지는 명부 순서다(WORKFLOW §9: 팀당 리더는 한 명).
 *
 * ⚠️ 누구를 넣을지는 여기서 안 고른다 — 부르는 쪽이 `searchOrgMembers`로 추려서 넘긴다.
 *    세우는 일과 고르는 일을 한 함수에 담으면 검색할 때마다 규칙이 엉킨다.
 * ⚠️ **대표가 둘이면 첫 사람만 대표 자리에 세운다.** 회사에 대표는 하나라(CLAUDE.md §권한)
 *    둘째부터는 명부가 이상한 것인데, 조용히 버리면 전체 인원과 화면이 어긋난다 —
 *    팀이 없으니 `소속 없음`으로 내려가 눈에 띈다.
 */
export function buildOrgChart(members: OrgRosterMember[]): OrgChart {
  let owner: OrgMember | null = null;

  /*
    ⚠️ `Map`을 쓰는 건 **넣은 차례를 기억하기 때문**이다. 평범한 객체로 모으면 키 순서가
       엔진에 달려 있어 팀 차례가 조용히 바뀔 수 있다.
  */
  const byTeam = new Map<string, OrgMember[]>();

  for (const member of members) {
    if (member.authority === AUTHORITY.OWNER && owner === null) {
      owner = toOrgMember(member);
      continue;
    }

    const teamName = member.teamName ?? NO_TEAM_LABEL;
    const bucket = byTeam.get(teamName);
    if (bucket) bucket.push(toOrgMember(member));
    else byTeam.set(teamName, [toOrgMember(member)]);
  }

  const teams: OrgTeam[] = [...byTeam.entries()].map(([name, roster]) => ({
    name,
    // 리더를 앞으로 당긴다. 나머지 차례는 그대로 둔다(`filter` 둘이라 안정적이다)
    members: [
      ...roster.filter((member) => member.authority === AUTHORITY.LEADER),
      ...roster.filter((member) => member.authority !== AUTHORITY.LEADER),
    ],
  }));

  const totalCount = teams.reduce((sum, team) => sum + team.members.length, owner ? 1 : 0);

  return { owner, teams, totalCount };
}
