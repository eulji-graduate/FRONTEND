"use client";

import { Users } from "lucide-react";
import { usePathname } from "next/navigation";

import { PageHeader } from "@/features/shell/components/page-header";

/** 목록 경로 — 이 경로면 뒤로가기 없음, 더 깊으면(상세) 뒤로가기를 붙인다. */
const MEMBERS_LIST_PATH = "/manage/members";

/**
 * 사원 관리 목록·상세가 함께 쓰는 상단바.
 *
 * ⚠️ **뒤로가기는 상단바 한 곳에만 둔다.** 전에는 상세가 헤더 아래에 자기 뒤로가기 줄을
 *    따로 그렸는데, 그러면 같은 서비스에서 화면마다 되돌아가는 자리가 달라진다 —
 *    공지·프로젝트·기업 승인은 전부 상단바 화살표를 쓴다.
 * ⚠️ 목록·상세를 각자 레이아웃으로 나누면 이동할 때 헤더가 **통째로 다시 마운트**돼
 *    화살표가 튀어나오며 덜컥거린다. 헤더는 여기 한 곳에서만 그리고 경로만 보고 토글한다.
 * ⚠️ `reserveBack` — 화살표 자리를 늘 비워 둬서 목록↔상세를 오갈 때 제목이 좌우로 안 밀린다.
 */
export function MembersPageHeader() {
  const pathname = usePathname();
  const isDetail = pathname !== MEMBERS_LIST_PATH;

  return (
    <PageHeader
      title="사원 관리"
      icon={Users}
      backTo={isDetail ? { href: MEMBERS_LIST_PATH, label: "사원 관리" } : undefined}
    />
  );
}
