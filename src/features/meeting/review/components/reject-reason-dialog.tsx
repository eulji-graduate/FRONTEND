"use client";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  ACTION_REJECT_REASON,
  ACTION_REJECT_REASON_LABEL,
  type ActionRejectReason,
} from "@/constants/meeting";
import { subjectParticle } from "@/lib/korean";
import { cn } from "@/lib/utils";

const REASONS = Object.values(ACTION_REJECT_REASON);

interface RejectReasonDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  actionTitle: string;
  reason: ActionRejectReason | null;
  onReasonChange: (reason: ActionRejectReason) => void;
  onConfirm: () => void;
}

/**
 * ✕ 반려 사유 3택(WORKFLOW.md §3-4). `ConfirmDialog`의 `children` 슬롯에 채워야 할 칸이라
 * `isConfirmDisabled`로 실행 버튼만 잠근다 — 취소는 항상 열어 둔다(§confirm-dialog).
 */
export function RejectReasonDialog({
  isOpen,
  onOpenChange,
  actionTitle,
  reason,
  onReasonChange,
  onConfirm,
}: RejectReasonDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="이 액션을 반려할까요?"
      description={
        <>
          {/* 조사는 받침을 보고 고른다(`lib/korean.ts`) — `이(가)`로 두면 괄호가 그대로 보인다 */}
          &lsquo;{actionTitle}&rsquo;
          {subjectParticle(actionTitle)} 확정 대상에서 제외됩니다.
          <br />
          사유를 골라 주세요.
        </>
      }
      confirmLabel="반려"
      isDestructive
      isConfirmDisabled={reason === null}
      onConfirm={onConfirm}
    >
      <div className="flex flex-col gap-1.5">
        {REASONS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-pressed={candidate === reason}
            onClick={() => onReasonChange(candidate)}
            className={cn(
              "cursor-pointer rounded-lg border px-3 py-2 text-left text-[13px] leading-5 transition-colors",
              candidate === reason
                ? "border-foreground bg-foreground/5"
                : "border-input hover:bg-foreground/5",
            )}
          >
            {ACTION_REJECT_REASON_LABEL[candidate]}
          </button>
        ))}
      </div>
    </ConfirmDialog>
  );
}
