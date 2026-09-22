"use client";

import { ClipboardCheck } from "lucide-react";
import { usePathname } from "next/navigation";

import { PageHeader } from "@/features/shell/components/page-header";

/** 목록 경로 — 이 경로면 뒤로가기 없음, 더 깊으면(상세) 뒤로가기를 붙인다. */
const LIST_PATH = "/owner/leader-handovers";

/**
 * "인수인계서 관리" 목록·상세가 함께 쓰는 상단바.
 * ⚠️ **목록·상세를 각자 레이아웃으로 나누지 않는다** — 나누면 라우트를 옮길 때마다
 *    상단바가 통째로 다시 마운트돼 헤더가 두 번 겹쳐 뜬다(`members-page-header.tsx`와
 *    같은 이유로 정정, 2026-08-08). 여기 한 곳에서만 그리고 경로만 보고 토글한다.
 */
export function LeaderHandoversPageHeader() {
  const pathname = usePathname();
  const isDetail = pathname !== LIST_PATH;

  return (
    <PageHeader
      title="인수인계서 관리"
      icon={ClipboardCheck}
      backTo={isDetail ? { href: LIST_PATH, label: "인수인계서 관리" } : undefined}
    />
  );
}
