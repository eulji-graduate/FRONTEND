import { HANDOVER_TYPE_LABEL, type HandoverType } from "@/constants/handover";
import { MEMBER_STATUS, MEMBER_STATUS_LABEL, type MemberStatus } from "@/constants/member";

/**
 * 사원 상태 배지 문구 — **대기는 무엇을 기다리는지까지** 적는다(디자인 시안 ②, #14).
 *
 * ⚠️ `WAITING` 하나로는 휴직 대기와 오프보딩 대기가 구분이 안 된다 — 오프보딩은 승인하면
 *    퇴사라 무게가 다르다. 신청 종류를 붙여 "휴직 대기"·"오프보딩 대기"로 쓴다.
 * ⚠️ 종류를 모르면(값 없음·처음 보는 값 — 매퍼가 `null`로 접는다) **예전처럼 "대기"만** 쓴다.
 *    모르는 걸 지어 붙이지 않는다(§정직성).
 * ⚠️ 목록(`member-table`)과 상세(`member-profile-card`)가 같이 쓴다 — 두 화면이 같은 상태를
 *    다르게 부르지 않게 한 곳에 둔다.
 */
export function memberStatusLabel(
  status: MemberStatus,
  pendingHandoverType: HandoverType | null | undefined,
): string {
  if (status === MEMBER_STATUS.WAITING && pendingHandoverType) {
    return `${HANDOVER_TYPE_LABEL[pendingHandoverType]} 대기`;
  }
  return MEMBER_STATUS_LABEL[status];
}
