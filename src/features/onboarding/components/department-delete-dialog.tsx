"use client";

import { ConfirmDialog } from "@/components/common/confirm-dialog";

import { countDepartments } from "../tree";
import type { DepartmentNode } from "../types";

interface DepartmentDeleteDialogProps {
  /** 지울 대상. null이면 닫힌 상태다. */
  target: DepartmentNode | null;
  onCancel: () => void;
  onConfirm: (id: string) => void;
}

/**
 * 안에 든 역할까지 함께 사라지므로 확인을 받는다(파괴적 작업은 토스트가 아니라 Dialog).
 *
 * ⚠️ 창은 공용 `ConfirmDialog`를 쓴다 — 확인 창이 화면마다 다르게 생기면
 *    같은 무게의 결정인데 다른 물건처럼 보인다(§컴포넌트 위생).
 */
export function DepartmentDeleteDialog({
  target,
  onCancel,
  onConfirm,
}: DepartmentDeleteDialogProps) {
  const childCount = target ? countDepartments(target.children) : 0;

  return (
    <ConfirmDialog
      isOpen={target !== null}
      onOpenChange={onCancel}
      title={`\u2018${target?.name ?? ""}\u2019 팀을 지울까요?`}
      description={
        <>
          역할 {childCount}개도 함께 사라집니다.
          <br />
          되돌릴 수 없습니다.
        </>
      }
      confirmLabel="삭제"
      isDestructive
      onConfirm={() => target && onConfirm(target.id)}
    />
  );
}
