import Link from "next/link";

import type { HandoverType } from "@/constants/domain";
import { cn } from "@/lib/utils";

import { DEFAULT_HANDOVER_TYPE, HANDOVER_TYPE_TABS } from "../lib";

interface HandoverControlsProps {
  activeType: HandoverType;
}

function buildHref(type: HandoverType): string {
  return type !== DEFAULT_HANDOVER_TYPE ? `/app/handover?type=${type}` : "/app/handover";
}

/** 휴직/오프보딩 탭 — **서버우선 `<Link>`**(team/members 컨트롤과 같은 결). */
export function HandoverControls({ activeType }: HandoverControlsProps) {
  return (
    <nav aria-label="인수인계 종류" className="border-border flex gap-4 border-b">
      {HANDOVER_TYPE_TABS.map((tab) => (
        <Link
          key={tab.type}
          href={buildHref(tab.type)}
          aria-current={activeType === tab.type ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-1 pb-2 text-[13px] leading-5 font-medium transition-colors",
            activeType === tab.type
              ? "border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground border-transparent",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
