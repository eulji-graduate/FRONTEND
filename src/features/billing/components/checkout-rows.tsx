"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 결제 칸의 **작은 조각 둘** — 금액 한 줄과 동의 한 줄.
 *
 * ⚠️ `checkout-panel`에서 떼어냈다. 그 파일이 215줄이라 200줄 규칙을 넘었는데
 *    (CLAUDE.md §폴더·네이밍), 둘 다 그 화면에서만 쓰는 조각이라 `ui`·`common`이 아니라
 *    같은 도메인 폴더에 둔다.
 * ⚠️ `common`으로 올리지 않는다 — 다른 화면에서 쓰이기 시작하면 그때 올린다.
 *    쓰는 데가 하나인데 공용으로 올리면 바꿀 때마다 영향 범위를 다시 재야 한다.
 */

export function Row({
  label,
  value,
  isMuted,
}: {
  label: string;
  value: string;
  isMuted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt
        className={
          isMuted
            ? "text-muted-foreground/70 text-[11px] leading-4"
            : "text-muted-foreground text-[13px] leading-5"
        }
      >
        {label}
      </dt>
      <dd
        className={
          isMuted
            ? "text-muted-foreground/70 text-[11px] leading-4 tabular-nums"
            : "text-[13px] leading-5 tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export function Agreement({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      {/*
        ⚠️ 브라우저 기본 체크박스는 OS마다 다르게 생겨 이 카드만 마감이 덜 된 것처럼 보인다.
           상자는 우리가 그리고, 진짜 `input`은 숨겨서 키보드·스크린리더는 그대로 쓴다.
        ⚠️ 상자를 **내리지 않는다**(한때 `mt-[1px]`). 상자(18px)와 라벨 줄 높이(18px)가 같아
           `items-start`면 이미 위가 맞는데, 1px을 더하면 글자보다 아래로 처진다 — 재서 확인했다
           (라벨 잉크 중심 기준 -1.4px → -0.4px). `items-center`가 아니라 `items-start`인 건
           라벨이 두 줄로 넘칠 때 상자가 가운데로 내려가지 않게 하려는 것이다.
      */}
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        className="border-input bg-background peer-checked:bg-foreground peer-checked:border-foreground peer-focus-visible:ring-ring text-background flex size-[18px] shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2"
        aria-hidden
      >
        <Check className={cn("size-3 transition-opacity", checked ? "opacity-100" : "opacity-0")} />
      </span>
      <span className="text-muted-foreground text-[12px] leading-[18px] break-keep">
        {children}
      </span>
    </label>
  );
}
