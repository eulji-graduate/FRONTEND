"use client";

import { Megaphone } from "lucide-react";
import { usePathname } from "next/navigation";

import { PageHeader } from "@/features/shell/components/page-header";

/** 목록 경로 — 이 경로면 뒤로가기 없음, 더 깊으면(상세) 뒤로가기를 붙인다. */
const NOTICE_LIST_PATH = "/app/notice";

/**
 * 공지 목록·상세가 함께 쓰는 상단바 — `usePathname`만 클라이언트가 필요해 이 잎사귀만 분리했다
 * (CLAUDE.md §핵심 4원칙: `use client`는 상호작용 잎사귀만). `layout.tsx`는 서버 컴포넌트로 남는다.
 *
 * ⚠️ 목록·상세를 각자 레이아웃으로 나누면 목록→상세 이동 때 헤더가 **통째로 다시 마운트**돼
 *    뒤로가기 화살표가 튀어나오며 덜컥거린다. 그래서 헤더는 여기 **한 곳에서만** 그리고,
 *    경로만 보고 뒤로가기 유무를 바꾼다 — 헤더는 마운트된 채 화살표만 붙었다 떨어진다.
 */
export function NoticeHeader() {
  const pathname = usePathname();
  const isDetail = pathname !== NOTICE_LIST_PATH;

  return (
    <PageHeader
      title="공지"
      icon={Megaphone}
      backTo={isDetail ? { href: NOTICE_LIST_PATH, label: "공지" } : undefined}
    />
  );
}
