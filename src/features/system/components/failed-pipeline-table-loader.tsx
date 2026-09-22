"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

import type { FailedPipelineItem } from "../types";

/**
 * 실패 목록 표를 별도 청크로 쪼갠다(CLAUDE.md §최적화) — 재처리 상호작용이 붙은
 * 클라이언트 조각이라 첫 로드 번들에서 분리한다.
 *
 * ⚠️ `ssr: false`는 쓰지 않는다 — 이 표는 브라우저 전용 API(차트·STT)가 아니라
 *    서버에서 그려도 되는 목록이다. 오히려 초기 HTML에 내용이 실려 첫 화면이 비지 않는다.
 *    (`mrr-chart-loader.tsx`가 `ssr:false`인 건 recharts가 `window`를 만지기 때문이라 사정이 다르다.)
 */
const FailedPipelineTable = dynamic(
  () => import("./failed-pipeline-table").then((m) => m.FailedPipelineTable),
  {
    loading: () => <Skeleton className="h-[220px] w-full rounded-2xl" />,
  },
);

export function FailedPipelineTableLoader({ items }: { items: FailedPipelineItem[] }) {
  return <FailedPipelineTable items={items} />;
}
