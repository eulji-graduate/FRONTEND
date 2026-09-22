"use client";

import { Plus, X } from "lucide-react";
import type { ReactNode } from "react";

interface DepartmentNodeActionsProps {
  name: string;
  canAddChild: boolean;
  onAddChild: () => void;
  onRemove: () => void;
}

/** 부서 한 줄의 우측 버튼 묶음. 마우스를 올리거나 포커스가 들어오면 나타난다. */
export function DepartmentNodeActions({
  name,
  canAddChild,
  onAddChild,
  onRemove,
}: DepartmentNodeActionsProps) {
  return (
    <span className="absolute right-2 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
      {canAddChild && (
        <IconButton label={`${name}에 역할 추가`} onClick={onAddChild}>
          <Plus className="size-3.5" />
        </IconButton>
      )}
      <IconButton label={`${name} 삭제`} onClick={onRemove}>
        <X className="size-3.5" />
      </IconButton>
    </span>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground hover:bg-foreground/10 focus-visible:ring-ring flex size-6 items-center justify-center rounded transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
    >
      {children}
    </button>
  );
}
