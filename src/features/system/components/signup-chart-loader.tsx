"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

import type { MonthlySignup } from "../types";

/**
 * `recharts`는 무겁다 — 대시보드 첫 로드 번들에서 뺀다(CLAUDE.md §최적화).
 * `ssr: false`는 클라이언트 컴포넌트 안에서만 쓸 수 있어 이 로더가 따로 있다 —
 * 서버 컴포넌트(카드 쪽)에서 바로 `dynamic(..., { ssr: false })`를 부르면 빌드가 깨진다.
 */
const SignupChart = dynamic(() => import("./signup-chart").then((m) => m.SignupChart), {
  ssr: false,
  loading: () => <Skeleton className="h-56 w-full" />,
});

export function SignupChartLoader({ data }: { data: MonthlySignup[] }) {
  return <SignupChart data={data} />;
}
