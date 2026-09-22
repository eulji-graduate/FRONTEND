"use client";

import { Plus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { MAX_ORG_NAME_LENGTH } from "../types";

interface DepartmentAddRowProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /**
   * 줄의 좌우 여백.
   * ⚠️ **쓰는 카드가 정한다.** 온보딩 카드와 기업 설정 카드는 머리 여백이 달라서, 여기서
   *    한 값으로 못박으면 한쪽은 반드시 오와 열이 어긋난다. 기본값은 온보딩 기준이다.
   */
  insetClassName?: string;
}

/** 카드 하단 — 부서 추가 줄. 역할은 부서를 만든 뒤 그 안에 넣는다. */
export function DepartmentAddRow({
  value,
  onChange,
  onSubmit,
  insetClassName = "px-4",
}: DepartmentAddRowProps) {
  return (
    <div
      className={cn(
        "border-border bg-muted flex h-[54px] shrink-0 items-center gap-2 border-t",
        insetClassName,
      )}
    >
      <label htmlFor="root-department" className="sr-only">
        팀 이름
      </label>
      <Input
        maxLength={MAX_ORG_NAME_LENGTH}
        id="root-department"
        value={value}
        placeholder="새 팀 이름 (Enter)"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          // 한글 입력 중(조합 중)의 Enter는 글자를 확정하는 키다 — 여기서 처리하면 두 번 등록된다
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
        className="h-8 flex-1 rounded-md border bg-transparent px-2.5 text-[12px] leading-4"
      />
      <button
        type="button"
        onClick={onSubmit}
        className="text-muted-foreground bg-foreground/5 hover:bg-foreground/10 focus-visible:ring-ring flex h-8 shrink-0 items-center gap-1 rounded-md px-2.5 text-[12px] leading-4 transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
      >
        <Plus className="size-3.5" />
        {/* ⚠️ 행간은 버튼이 정한 12/16을 그대로 쓴다 — `leading-none`을 덧대면 그 규격이 덮인다 */}
        <span>추가</span>
      </button>
    </div>
  );
}
