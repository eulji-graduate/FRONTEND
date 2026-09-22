import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";

import type { NoticeSummary } from "../types";

interface NoticeListItemProps {
  notice: NoticeSummary;
  /** 상세 화면 왼쪽 목록에서 지금 보고 있는 공지 표시 — 목록 단독 화면에서는 항상 false. */
  isActive?: boolean;
}

/** 공지 목록 한 줄 — 누르면 상세로 간다. 순수 표시라 서버에서 그린다. */
export function NoticeListItem({ notice, isActive = false }: NoticeListItemProps) {
  return (
    <Link
      href={`/app/notice/${notice.id}`}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "hover:bg-foreground/[0.04] focus-visible:ring-ring flex items-center gap-3 px-4 py-4 transition-colors focus-visible:ring-2 focus-visible:outline-none",
        isActive && "bg-foreground/[0.04]",
      )}
    >
      {/*
        ⚠️ **제목을 제목답게 세운다.** 굵기로 세운다 — 다른 목록의 첫 열과 같은 13px을 쓰되
           반굵게(semibold)라 옆의 날짜(12px 흐림)와 무게가 갈린다. 크기까지 올리면 화면마다
           목록 줄 높이가 달라져 사이드바로 옮겨 다닐 때 리듬이 흔들린다(§DESIGN: 새 숫자 금지).
        ⚠️ **날짜를 아래로 내리지 않고 오른쪽 끝에 세운다.** 아래에 두면 한 줄이 두 줄을 먹고,
           줄마다 제목 길이가 달라 날짜가 들쭉날쭉했다 — 오른쪽 고정이면 한 세로선에 선다.
      */}
      <span className="text-foreground min-w-0 flex-1 truncate text-[13px] leading-5 font-semibold">
        {notice.title}
      </span>

      <span className="text-muted-foreground shrink-0 text-[12px] leading-4 tabular-nums">
        {formatDate(notice.publishedAt)}
      </span>

      <ChevronRight
        className={cn(
          "size-4 shrink-0",
          isActive ? "text-foreground/70" : "text-muted-foreground/70",
        )}
        aria-hidden
      />
    </Link>
  );
}
