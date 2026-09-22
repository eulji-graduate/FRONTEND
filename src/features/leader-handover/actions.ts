"use server";

import { revalidatePath } from "next/cache";

import { LEADER_HANDOVER_CUSTODY_STATUS } from "@/constants/domain";
import { requireAccessToken } from "@/features/auth/session";
import { getViewer } from "@/features/shell/viewer";
import { serverApi, toUserMessage } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { canManageLeaderHandovers } from "@/lib/permission";
import { isMock } from "@/mocks/config";

import { findMockLeaderHandover, markMockLeaderHandoverAssigned } from "./mock/leader-handovers";
import { getLeaderHandoverDetail } from "./server";

/**
 * [OOO에게 귀속] — 이 인수인계서에 담긴 액션 전체의 담당자를 새 팀장에게 일괄 이전한다
 * (WORKFLOW.md §7).
 * ⚠️ 실제 액션 도메인(보드·내 액션 등)에 담당자를 반영하는 매퍼는 ERD 확정 후 연결한다
 *    (CLAUDE.md §Mock 격리막) — 지금은 이 화면의 귀속 상태 전환만 담당한다.
 * ⚠️ 사원 관리 승인 흐름과의 실제 연동(승인 시 이 목록에 새로 생기는 것)은 범위 밖이다
 *    (별도 이슈, 2026-08-08 사용자 확인).
 * ⚠️ **화면 권한 체크는 페이지가 하지만 이 Action은 따로 재검사한다**(§권한: 화면 숨김은
 *    보안이 아니다) — 주소만 알면 페이지를 거치지 않고 이 Action을 직접 부를 수 있다.
 *    이미 귀속 완료(`ASSIGNED`)된 건도 다시 못 돌린다 — 일괄 이전은 한 번뿐이다.
 */
export async function assignLeaderHandoverAction(
  handoverId: string,
  newLeaderId: string,
): Promise<{ isSuccess: boolean; message?: string }> {
  const viewer = await getViewer();
  if (!canManageLeaderHandovers(viewer)) return { isSuccess: false };

  if (isMock) {
    const handover = findMockLeaderHandover(handoverId);
    if (!handover) return { isSuccess: false };
    if (handover.custodyStatus !== LEADER_HANDOVER_CUSTODY_STATUS.PENDING) {
      return { isSuccess: false };
    }
    if (!handover.candidates.some((candidate) => candidate.id === newLeaderId)) {
      return { isSuccess: false };
    }
    markMockLeaderHandoverAssigned(handoverId);
  } else {
    /*
      ⚠️ 후보 목록에 있는지는 여기서 다시 본다(§권한: 화면 숨김은 보안이 아니다) — 주소만
         알면 이 액션을 직접 부를 수 있어, 화면이 안 보여준 값이라도 여기서 걸러야 한다.
    */
    /*
      ⚠️ **실패도 잡는다**(2026-08-15, `rooms/actions.ts`의 `getMeetingRooms()`와 같은 사고 —
         #553/#554/#556/#558). 감싸지 않으면 이 액션 전체가 죽어 페이지가 500으로 날아간다.
    */
    let handover: Awaited<ReturnType<typeof getLeaderHandoverDetail>>;
    try {
      handover = await getLeaderHandoverDetail(handoverId);
    } catch {
      return {
        isSuccess: false,
        message: "인수인계서를 불러오지 못했습니다 — 잠시 후 다시 시도해 주세요",
      };
    }
    if (!handover) return { isSuccess: false };
    if (handover.custodyStatus !== LEADER_HANDOVER_CUSTODY_STATUS.PENDING) {
      return { isSuccess: false };
    }
    if (!handover.candidates.some((candidate) => candidate.id === newLeaderId)) {
      return { isSuccess: false };
    }

    const accessToken = await requireAccessToken();
    try {
      await serverApi<unknown>(ep.handoverAttributeToLeader(Number(handoverId)), {
        method: "PATCH",
        json: { newLeaderId: Number(newLeaderId) },
        accessToken,
      });
    } catch (error) {
      return { isSuccess: false, message: toUserMessage(error) };
    }
  }

  revalidatePath("/owner/leader-handovers");
  revalidatePath(`/owner/leader-handovers/${handoverId}`);

  return { isSuccess: true };
}
