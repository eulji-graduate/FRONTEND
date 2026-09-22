"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { commitOnboardingAction } from "./actions";
import { markDraftCommitted } from "./draft";
import type { DepartmentNode, Invite, Position } from "./types";

interface UseInviteCommitArgs {
  invites: Invite[];
  /** 이번에 실제로 나갈 줄 */
  sendable: Invite[];
  /** 1·2단계 입력 — [완료]에서 초대 명단과 **함께** 커밋된다 */
  departments: DepartmentNode[];
  positions: Position[];
  markSent: () => void;
}

/**
 * 3단계 [완료] — **확인 창을 거친 뒤에야** 확정된다(2026-08-04 변경).
 *
 * ⚠️ 확인 없이 넘기지 않는다. 이 한 번으로 앞 세 단계가 굳고 초대장이 나가는데,
 *    나간 메일은 취소되지 않고 이 단계로 돌아올 수도 없다.
 * ⚠️ 실제 계정 발급·메일 발송은 서버가 한다 — 1·2·3단계가 **한 요청**으로 나간다
 *    (`commitOnboardingAction` → `POST /api/companies/me/onboarding`).
 */
export function useInviteCommit({
  invites,
  sendable,
  departments,
  positions,
  markSent,
}: UseInviteCommitArgs) {
  const router = useRouter();
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  /** 보내는 중 — 확인 창의 버튼을 잠가 두 번 눌리지 않게 한다 */
  const [isCommitting, setCommitting] = useState(false);
  /**
   * 실패 사유 — **창 안에** 적는다.
   * ⚠️ 토스트로만 알리면 창은 그대로 떠 있어서, 몇 초 뒤에 온 사람은 아무 일도 안 일어난 줄
   *    알고 같은 버튼을 다시 누른다(§토스트는 보조다).
   */
  const [error, setError] = useState<string | null>(null);

  /**
   * 주소는 적었는데 **이번에 안 나가는** 줄 — 확인 창에서 알린다.
   *
   * ⚠️ **빠지는 이유를 여기서 나열하지 않는다.** 전에는 `부서·역할·직급이 비었는지`만 봤는데,
   *    그 뒤로 발송 검증에 규칙이 늘면서(주소 중복 · 팀당 리더 한 명) **세 칸이 다 찬 채로
   *    빠지는 줄**이 생겼다 — 그런 줄은 여기서 안 세어져서 조용히 안 나갔다.
   *    `sendable`을 뒤집어 세면 규칙이 몇 개든 항상 맞는다(§정직성).
   * ⚠️ 이미 보낸 줄은 빼는 게 아니라 **이미 나간** 줄이다 — 세지 않는다.
   */
  const goingIds = new Set(sendable.map((invite) => invite.id));
  const skipped = invites.filter(
    (invite) => invite.email.trim().length > 0 && !invite.isSent && !goingIds.has(invite.id),
  );

  /*
    ⚠️ **두 갈래로 나눠 센다.** 확인 창이 "목록에서 표시된 줄을 보라"고만 말했더니, 가장 흔한
       사유(아직 안 고른 줄)에는 **줄에 아무 표시가 없어서** 찾을 수가 없었다 — 안 고른 건
       "틀렸다"가 아니라 "아직"이라 일부러 빨간 글씨를 안 띄우기 때문이다(`InviteRow`).
       표시가 없는 줄은 확인 창이 직접 말하고, 표시가 있는 줄만 "표시가 뜬 줄"이라 부른다
       (적대적 검토 #163).
  */
  /** 아직 안 고른 줄 — 목록에 표시가 없다 */
  const unfilledCount = skipped.filter(
    (invite) => !invite.departmentId || !invite.roleId || !invite.positionId,
  ).length;
  /** 다 골랐는데 규칙에 걸린 줄 — 그 줄에 문구가 떠 있다(주소 형식·주소 중복·리더 중복) */
  const flaggedCount = skipped.length - unfilledCount;

  /**
   * 커밋 — **서버가 받았다고 답한 뒤에만** 확정 도장을 찍는다.
   *
   * ⚠️ 실패하면 아무것도 찍지 않고 그 자리에 머문다. 확인 창을 닫고 넘어가 버리면
   *    저장된 적 없는 조직으로 결제 화면에 서게 된다 — 되돌아올 길이 없는 자리다.
   * ⚠️ **빠진 주소는 반드시 알린다.** 같은 주소가 두 번 적혀 있으면 서버가 첫 줄만 발급하고
   *    나머지를 `skipped`로 돌려준다(400이 아니다) — 조용히 넘기면 오너는 다 보낸 줄 안다.
   */
  const commit = async () => {
    if (isCommitting) return;
    setCommitting(true);
    setError(null);

    /*
      ⚠️ **거절도 받아 낸다**(2026-08-12, 코드래빗 지적). 액션은 BE 실패를 `{ok:false}`로
         돌려주지만, **브라우저에서 Next 서버까지 가는 길**이 끊기면(네트워크·서버 재시작·배포)
         이 `await`가 통째로 던진다 — 그러면 아래 실패 분기를 못 타고 `isCommitting`이 `true`로
         남아 버튼이 [등록 중]에서 영영 굳는다. `serverApi`의 타임아웃은 **Next↔BE 구간**만
         지키므로 이 구간은 여기서 따로 받아야 한다.
      ⚠️ **성공 처리까지 감싸지 않는다.** 보관함 쓰기(`markDraftCommitted`)가 던지는 것까지
         잡으면 저장은 됐는데 "연결하지 못했습니다"라고 말하게 된다 — 부르는 자리만 감싼다.
    */
    let result;
    try {
      result = await commitOnboardingAction({ departments, positions, invites: sendable });
    } catch {
      setCommitting(false);
      setError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    if (!result.ok) {
      setCommitting(false);

      /*
        ⚠️ **오류로 세우지 않는다**(2026-08-14, 프로덕션 사고). 이 코드(`AU-035`)는 지금 이
           시도가 잘못된 게 아니라 **앞선 시도가 응답만 못 받고 서버에서는 이미 성공**했다는
           뜻이다 — 타임아웃·네트워크 단절 뒤 재시도가 실제로 이 자리를 밟는다. 창에 오류를
           띄우고 멈추면 사용자는 "등록이 안 됐다"고 오해해 계속 다시 누르게 된다. 이미 끝난
           일이니 그대로 다음 단계로 넘긴다 — 4단계(결제)는 어차피 막지 않는 자리다
           (`guard.ts`: "4단계·완료 화면은 막지 않는다").
      */
      if (result.alreadyOnboarded) {
        markDraftCommitted();
        setConfirmOpen(false);
        /*
          ⚠️ **"전원 초대됨"이라고는 말하지 않는다**(적대적 검토, 2026-08-14). 앞선 시도가
             실제로 몇 명을 발급하고 몇 명은 주소 중복으로 건너뛰었을 수 있는데, 그 결과를
             우리는 영영 모른다(`actions.ts`의 `issuedEmails`/`skipped` 주석 참고) — 그래도
             그 불확실함을 여기서 사용자에게 알리지는 않는다(팀 결정). "완료"·"성공"이라고
             단정하지 않고 사실("이미 등록됨")만 짧게 말한다.
        */
        toast.success("이미 등록된 회사입니다");
        router.replace("/onboarding/payment");
        return;
      }

      setError(result.error ?? "등록하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    // ⚠️ 실제로 계정이 나간 줄에만 도장을 찍는다 — 빠진 줄은 잠기지 않는다
    if (result.issuedEmails.length > 0) {
      markSent();
      toast.success(`${result.issuedEmails.length}명에게 계정을 발급했습니다`);
    }
    if (result.skipped.length > 0) {
      toast.warning(
        `${result.skipped.map((item) => item.email).join(", ")}은(는) 발급되지 않았습니다. 계정 발급 화면에서 다시 만들어 주세요.`,
      );
    }

    markDraftCommitted();
    setConfirmOpen(false);
    /*
      ⚠️ `push`가 아니라 `replace`다. 넘어간 뒤 뒤로가기를 누르면 3단계가 잠깐 보였다가
         가드에 걸려 다시 튕겨 나온다 — 되돌아갈 수 없는 자리는 히스토리에 남기지 않는다.
    */
    router.replace("/onboarding/payment");
  };

  return {
    isConfirmOpen,
    setConfirmOpen,
    unfilledCount,
    flaggedCount,
    commit,
    isCommitting,
    error,
  };
}
