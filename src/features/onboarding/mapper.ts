import { AUTHORITY } from "@/constants/domain";

import type { DepartmentNode, Invite, Position } from "./types";
import { LEADER_ROLE_ID, NO_ROLE_ID } from "./types";

/**
 * 온보딩 커밋 **매퍼** — 화면 계약(`DepartmentNode`·`Position`·`Invite`) → BE 요청 shape.
 *
 * ⚠️ 연동에서 고칠 곳은 여기와 `actions.ts`뿐이다. 컴포넌트는 0줄 고친다(§Mock 격리막).
 * ⚠️ BE 키 이름은 **옛 명세에서 바뀌었다**(BE `OnboardingRequest.java` 실코드로 확인):
 *    `departments→teams` · `children→subTeams` · `positions→jobPositions` · `role→defaultRole`.
 *    옛 이름으로 보내면 400이다.
 */

export interface OnboardingPayload {
  teams: { tempId: string; name: string; subTeams: { tempId: string; name: string }[] }[];
  jobPositions: { tempId: string; name: string; defaultRole: string }[];
  invites: {
    name: string;
    email: string;
    teamTempId: string;
    subTeamTempId: string | null;
    jobPositionTempId: string;
    isAdmin: boolean;
  }[];
}

/**
 * 화면에서 만든 id를 **그대로 `tempId`로 쓴다.**
 *
 * ⚠️ 따로 만들지 않는다. `tempId`는 요청 안에서 서로를 가리키는 임시 이름일 뿐이고,
 *    초대 줄이 이미 화면 id(`departmentId`·`positionId`)로 부서·직급을 가리키고 있다 —
 *    새 id를 발급하면 그 둘을 잇는 표를 하나 더 들고 다녀야 한다.
 */
export function toOnboardingPayload(input: {
  departments: DepartmentNode[];
  positions: Position[];
  invites: Invite[];
}): OnboardingPayload {
  return {
    teams: input.departments.map((department) => ({
      tempId: department.id,
      name: department.name,
      // ⚠️ 역할이 없는 부서는 `[]`다 — `null`은 400이다(BE `@NotNull`)
      subTeams: department.children.map((role) => ({ tempId: role.id, name: role.name })),
    })),

    jobPositions: input.positions.map((position) => ({
      tempId: position.id,
      name: position.name,
      /*
        ⚠️ `defaultRole`은 **LEADER·MEMBER 둘뿐**이다 — `OWNER`를 보내면 400이다.
           2단계 화면은 `POSITION_AUTHORITIES`(둘)만 고르게 하므로 정상 흐름에선 안 걸리지만,
           보관값이 손상됐을 때 400 대신 여기서 걸러야 무엇이 문제인지 알 수 있다.
      */
      defaultRole: position.role,
    })),

    invites: input.invites.map((invite) => ({
      /*
        ⚠️ 이름은 BE **필수**다(`@NotBlank`). 화면에선 비워 둘 수 있으므로 여기서 메운다 —
           주소 앞부분을 쓴다. 안 메우면 이름을 안 적은 줄 하나 때문에 커밋 전체가 400이 된다.
      */
      name: invite.name.trim() || (invite.email.trim().split("@")[0] ?? invite.email.trim()),
      email: invite.email.trim(),
      teamTempId: invite.departmentId,
      /*
        ⚠️ 화면 예약값 둘(`리더`·`없음`)은 **BE에 없는 값**이다 — `null`로 바꾼다.
           `리더`는 부서 전체를 맡는 자리라 부서 안의 한 역할에 매이지 않고,
           `없음`은 애초에 고를 역할이 하나도 없다는 뜻이다. 둘 다 "역할 미지정"으로 간다.
        ⚠️ 그대로 보내면 "그 부서에 실재하는 역할이어야 한다"는 검사에 걸려 400이다.
      */
      subTeamTempId:
        invite.roleId === LEADER_ROLE_ID || invite.roleId === NO_ROLE_ID || !invite.roleId
          ? null
          : invite.roleId,
      jobPositionTempId: invite.positionId,
      isAdmin: invite.isAdmin,
    })),
  };
}

/**
 * 보내기 전 마지막 확인 — 걸리면 **BE에 안 보내고** 여기서 멈춘다.
 *
 * ⚠️ 400을 받아서 알면 늦다. 커밋은 한 번뿐이라 실패 문구가 `잘못된 요청입니다`로 뭉뚱그려지면
 *    어느 줄이 문제인지 알 수 없다.
 */
export function findPayloadProblem(payload: OnboardingPayload): string | null {
  if (payload.teams.length === 0) return "팀을 하나 이상 만들어 주세요.";
  if (payload.jobPositions.length === 0) return "직급을 하나 이상 만들어 주세요.";

  const ownerPosition = payload.jobPositions.find(
    (position) => position.defaultRole === AUTHORITY.OWNER,
  );
  if (ownerPosition) {
    return `직급 [${ownerPosition.name}]의 권한을 Leader 또는 Member로 바꿔 주세요. Owner는 직급에 매길 수 없습니다.`;
  }

  return null;
}
