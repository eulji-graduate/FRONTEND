"use client";

import { useFormStatus } from "react-dom";

import { ResultDialog } from "@/components/common/result-dialog";
import { buttonVariants } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

import { SUBSCRIPTION_STATUS, type SubscriptionStatus } from "../subscription";

/**
 * 결제 권한이 없는 사람이 만료된 회사로 로그인했을 때 — **여기서 막는다.**
 *
 * ⚠️ **결제 화면을 보여주지 않는다.** 눌러도 못 하는 결제 칸을 주는 건 안내가 아니라
 *    막다른 길이다. 이 사람이 할 수 있는 일은 없으므로 화면을 만들지 않고 창으로 끝낸다.
 * ⚠️ 모양은 **공통 결과 창**(`ResultDialog`)이다. 결제 실패 창과 같은 것을 쓴다 —
 *    돈 때문에 막히는 자리가 화면마다 다르게 생기면 같은 서비스로 안 읽힌다(§컴포넌트 위생).
 * ⚠️ **닫을 수 없다.** X도 없고 바깥을 눌러도 안 닫힌다 — 닫으면 뒤에 아무것도 없는
 *    빈 화면만 남아서, 막힌 게 아니라 고장 난 것처럼 보인다.
 * ⚠️ 나가는 길은 **로그아웃**뿐이다 — 세션 쿠키가 살아 있는 채로 `/login`에 링크만
 *    걸면 로그인 화면에서 다시 이 회사로 돌아와 버린다. `logoutAction`(`LogoutButton`과
 *    같은 액션)으로 쿠키를 지우고 나서 `/login`으로 보낸다.
 */
export function SubscriptionBlockedDialog({ status }: { status: SubscriptionStatus }) {
  const isUnpaid = status === SUBSCRIPTION_STATUS.UNPAID;

  return (
    <ResultDialog
      isOpen
      // 닫히지 않는다 — 상태를 바꾸지 않으므로 열린 채로 남는다
      onOpenChange={() => {}}
      badge="alert"
      isDismissible={false}
      /*
        ⚠️ 제목은 `SubscriptionGate`와 **같은 말**이다. 같은 상태를 두 화면이 다르게 부르면
           대표와 사원이 같은 상황을 이야기할 때 말이 어긋난다.
      */
      title={isUnpaid ? "결제가 확인되지 않았습니다" : "구독이 종료되었습니다"}
      /*
        ⚠️ **두 가지만 말한다** — 왜 못 들어오는지, 누가 풀 수 있는지.
           "결제가 끝나면 바로 들어올 수 있습니다" 같은 말을 덧붙이면 같은 말이 두 번이 된다.
      */
      description={
        <>
          결제가 끝나야 워크스페이스가 열립니다.
          <br />
          결제는 대표 또는 Admin 권한을 가진 분만 할 수 있습니다.
        </>
      }
      action={
        <form action={logoutAction} className="w-full">
          <LogoutSubmitButton />
        </form>
      }
    />
  );
}

function LogoutSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        buttonVariants({ variant: "ink" }),
        "h-11 w-full text-[13px] leading-none disabled:opacity-60",
      )}
    >
      {pending ? "로그아웃하는 중" : "로그인 화면으로"}
    </button>
  );
}
