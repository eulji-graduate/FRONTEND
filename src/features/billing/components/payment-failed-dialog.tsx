"use client";

import { ResultDialog } from "@/components/common/result-dialog";
import { Button } from "@/components/ui/button";

interface PaymentFailedDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** 실패 사유 **한 줄**(`payment.ts`가 코드를 옮겨 준다). 모르면 비운다 */
  message?: string;
}

/**
 * 결제 실패 — **토스트가 아니라 창이다.**
 *
 * ⚠️ 토스트는 몇 초 뒤 사라진다. 돈이 걸린 실패를 사라지는 말로 알리면, 자리를 비운 사이에
 *    지나가 버려 **결제된 줄 알고** 화면을 떠난다(CLAUDE.md §렌더링: 토스트는 보조다).
 * ⚠️ `error.tsx`도 아니다. 화면이 깨진 게 아니라 **하려던 일 하나가 안 된 것**이라,
 *    페이지를 통째로 갈아 끼우면 방금 채운 동의 체크가 날아간다.
 * ⚠️ **모양은 `ResultDialog`가 잡는다.** 여기서 창을 새로 그리지 않는다 — 결제 실패만
 *    다른 모양으로 뜨면 같은 서비스의 창으로 안 읽힌다(§컴포넌트 위생: 만들기 전 재사용 확인).
 * ⚠️ 배지만 `alert`다. 기본 체크를 그대로 두면 **실패 창에 완료 표식**이 뜬다.
 * ⚠️ **[다시 시도]를 두지 않는다.** 창 안에서 결제를 다시 부르면 결제창이 위에 또 뜨는
 *    모양이 되고, 실패한 그대로 다시 시도하게 된다 — 카드를 바꾸거나 한도를 푸는 건
 *    이 창 밖에서 하는 일이다. 닫고 [결제하기]를 다시 누르는 길 하나로 충분하다.
 */
export function PaymentFailedDialog({ isOpen, onOpenChange, message }: PaymentFailedDialogProps) {
  return (
    <ResultDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      badge="alert"
      title="결제가 완료되지 않았습니다"
      /*
        ⚠️ 설명은 **사유 한 줄뿐**이다. 안내를 덧붙이지 않는다 — "청구되지 않았다"는
           `완료되지 않았습니다`가 이미 말한다. 겹치는 말을 쌓으면 문단이 되어 안 읽힌다.
      */
      description={message}
      action={
        <Button
          type="button"
          variant="ink"
          onClick={() => onOpenChange(false)}
          className="h-11 w-full text-[13px]"
        >
          확인
        </Button>
      }
    />
  );
}
