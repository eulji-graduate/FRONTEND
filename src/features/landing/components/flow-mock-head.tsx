import type { ReactNode } from "react";

export function MockHead({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="border-landing-dark-border flex items-center justify-between border-b pb-2.5">
      <span className="flex items-center gap-1.5 text-[12px] leading-[18px]">{left}</span>
      <span className="text-landing-dark-muted text-[12px] leading-[18px] tabular-nums">
        {right}
      </span>
    </div>
  );
}
