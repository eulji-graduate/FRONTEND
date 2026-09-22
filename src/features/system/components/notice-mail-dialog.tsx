"use client";

import { ConfirmDialog } from "@/components/common/confirm-dialog";

interface NoticeMailDialogProps {
  /** 발송 대상. `null`이면 닫힌 상태다(`department-delete-dialog.tsx`와 같은 패턴). */
  target: { companyId: string; companyName: string; ownerEmail: string } | null;
  onCancel: () => void;
  onConfirm: (companyId: string) => void;
  isPending: boolean;
}

/**
 * 미납 기업 담당자에게 안내 메일을 보낼지 묻는 확인창.
 *
 * ⚠️ **되돌릴 수 없는 조작은 토스트가 아니라 확인창으로 받는다**(§토스트).
 *    창은 공용 `ConfirmDialog`를 쓴다 — 확인창이 화면마다 다르게 생기면 같은 무게의 결정인데
 *    다른 물건처럼 보인다. (develop에서는 `Dialog` 프리미티브로 직접 그렸는데, 그때는 아직
 *    공용 확인창이 없었다 — #67에서 생겼으므로 여기로 모은다.)
 * ⚠️ 버튼 문구는 "예/아니오"가 아니라 **하는 일**을 적는다. 예/아니오는 무엇에 답하는지
 *    다시 위를 읽어야 한다.
 * ⚠️ **보내는 일은 부모가 한다.** 이 창은 묻기만 한다 — 표(`subscription-table`)가 목록을
 *    쥐고 있어서, 발송 뒤 어느 줄을 어떻게 바꿀지는 거기서 알아야 한다.
 */
export function NoticeMailDialog({
  target,
  onCancel,
  onConfirm,
  isPending,
}: NoticeMailDialogProps) {
  return (
    <ConfirmDialog
      isOpen={target !== null}
      onOpenChange={(open) => !open && onCancel()}
      title="안내 메일을 보낼까요?"
      description={
        <>
          {target?.companyName} 담당자에게 미납 안내 메일이 갑니다.
          <br />
          {target?.ownerEmail}
        </>
      }
      confirmLabel="발송"
      isPending={isPending}
      pendingLabel="발송 중"
      onConfirm={() => target && onConfirm(target.companyId)}
    />
  );
}
