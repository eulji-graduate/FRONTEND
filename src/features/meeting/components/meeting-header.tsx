"use client";

import { Sparkles, Video } from "lucide-react";
import { usePathname } from "next/navigation";

import { PageHeader } from "@/features/shell/components/page-header";

const MEETING_LIST_PATH = "/app/meeting";

/**
 * 회의 목록·상세·AI 검토가 함께 쓰는 상단바 — 공지(`NoticeHeader`)와 같은 패턴이다.
 * 목록·상세를 각자 레이아웃으로 나누면 이동 때 헤더가 통째로 다시 마운트돼 덜컥거린다.
 *
 * ⚠️ 아이콘은 사이드바의 `meeting` 아이콘과 같은 `Video`다 — 다르면 같은 화면이 두 얼굴이 된다.
 * ⚠️ **AI 검토 화면도 여기서 맡는다**(2026-08-10). 그 화면이 자기 레이아웃에서 `PageHeader`를
 *    또 그리고 있었는데, 이 레이아웃이 상위라 **상단바가 두 겹으로 쌓였다** — 제목 줄이
 *    둘, 테마 전환 버튼도 둘이었다. 한 화면에 머리는 하나다.
 * ⚠️ 검토에서 뒤로가기는 **그 회의 상세**로 간다. 목록으로 보내면 방금 보던 회의를 다시
 *    찾아야 한다.
 */
export function MeetingHeader() {
  const pathname = usePathname();
  const isList = pathname === MEETING_LIST_PATH;
  const isReview = pathname.endsWith("/review");
  const meetingPath = isReview ? pathname.slice(0, -"/review".length) : null;

  if (isReview && meetingPath) {
    return (
      <PageHeader
        title="AI 액션 분배 결과"
        icon={Sparkles}
        backTo={{ href: meetingPath, label: "회의 상세" }}
      />
    );
  }

  return (
    <PageHeader
      title="내 회의"
      icon={Video}
      backTo={isList ? undefined : { href: MEETING_LIST_PATH, label: "내 회의" }}
    />
  );
}
