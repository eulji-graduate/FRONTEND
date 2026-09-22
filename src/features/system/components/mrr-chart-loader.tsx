"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

import type { MonthlyMrr } from "../types";

/**
 * `recharts`는 무겁다 — 첫 로드 번들에서 뺀다(CLAUDE.md §최적화).
 * `ssr: false`는 클라이언트 컴포넌트 안에서만 쓸 수 있어 이 로더가 따로 있다(`signup-chart-loader.tsx`와 같은 이유).
 */
const MrrChart = dynamic(() => import("./mrr-chart").then((m) => m.MrrChart), {
  ssr: false,
  loading: () => <Skeleton className="h-56 w-full" />,
});

export function MrrChartLoader({ data }: { data: MonthlyMrr[] }) {
  return <MrrChart data={data} />;
}
