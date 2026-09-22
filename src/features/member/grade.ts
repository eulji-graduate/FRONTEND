import { ADMIN_ELIGIBLE_AUTHORITIES } from "@/constants/authority";

import type { ManagedMember } from "./manage-types";

/**
 * 직급·권한을 못 고치는 이유. 고칠 수 있으면 `null`.
 *
 * ⚠️ **불리언이 아니라 이유다.** 전에는 `canChangeGradeOf` 하나뿐이라 사람 카드가 무조건
 *    "대표 계정은…"이라고 적었다 — 대표가 아닌 이유로 잠기는 사람이 생기는 순간 그 줄이
 *    바로 거짓말이 된다(§정직성).
 * ⚠️ **`RESIGNED`는 여기 없다**(2026-08-14 정리). 오프보딩 최종 승인 시 BE가 그 자리에서
 *    `deleted_at`을 찍어 이후 모든 조회에서 빠진다(BE `MemberJpaEntity.offboard` 확인) —
 *    이 화면에 `RESIGNED` 상태 사람이 올 길이 없어 그 분기는 죽은 코드였다.
 */
export type GradeLock = "OWNER";

/**
 * ⚠️ **Owner는 못 고친다.** 회사에 하나뿐인 자리라 옮기는 일이 "권한 변경"이 아니라
 *    **대표 교체**이고, 그건 이 화면이 다루는 일이 아니다(§명세에 없는 기능은 안 만든다).
 * ⚠️ **판정을 한 곳에 둔다.** 폼 카드와 사람 카드가 각자 세면, 한쪽은 폼을 감추고 다른 쪽은
 *    이유를 안 적는 상태가 조용히 생긴다.
 * ⚠️ 화면 판정일 뿐이다 — 진짜 검사는 Server Action이 다시 한다(§권한: 화면 숨김은 보안이 아니다).
 */
export function gradeLockOf(member: ManagedMember): GradeLock | null {
  const eligible: readonly string[] = ADMIN_ELIGIBLE_AUTHORITIES;
  return eligible.includes(member.authority) ? null : "OWNER";
}

export function canChangeGradeOf(member: ManagedMember): boolean {
  return gradeLockOf(member) === null;
}

/** 잠긴 이유를 적는 한 줄 — 폼 카드가 왜 없는지 사람 카드가 대신 답한다 */
export const GRADE_LOCK_NOTE: Record<GradeLock, string> = {
  OWNER: "대표 계정은 직급·권한을 여기서 바꿀 수 없습니다.",
};
