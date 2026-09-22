import { HANDOVER_TYPE } from "@/constants/handover";
import { MEMBER_STATUS } from "@/constants/member";

import { type ManagedMember, MEMBER_FILTER, type MemberFilter } from "./manage-types";

/**
 * 목록 추리기 — **순수 함수**라 화면 밖에서도 검증된다.
 *
 * ⚠️ 검색은 **이름·팀·이메일** 세 곳을 본다(WORKFLOW §9의 칸 안내문 그대로).
 *    직급·역할까지 넣으면 "사원"으로 검색했을 때 직급이 사원인 사람이 다 걸려 소용이 없다.
 */
export function searchMembers(members: ManagedMember[], keyword: string): ManagedMember[] {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return members;

  return members.filter((member) =>
    [member.name, member.teamName ?? "", member.email].some((field) =>
      field.toLowerCase().includes(needle),
    ),
  );
}

/**
 * 승인 대기 필터.
 *
 * ⚠️ 종류는 **행이 들고 있다**(`pendingHandoverType`). 예전에는 이걸 알려고 목록이 상세를
 *    사람 수만큼 훑었다 — 하나만 실패해도 목록 전체가 오류 화면이 됐다.
 */
export function filterMembers(members: ManagedMember[], filter: MemberFilter): ManagedMember[] {
  if (filter === MEMBER_FILTER.ALL) return members;

  const wanted =
    filter === MEMBER_FILTER.VACATION_PENDING ? HANDOVER_TYPE.VACATION : HANDOVER_TYPE.OFFBOARDING;

  /*
    ⚠️ 상태와 종류를 **둘 다** 본다. 상태만 보면 휴직 대기와 오프보딩 대기가 안 갈리고,
       종류만 보면 이미 처리된 옛 신청까지 걸린다.
  */
  return members.filter(
    (member) => member.status === MEMBER_STATUS.WAITING && member.pendingHandoverType === wanted,
  );
}
