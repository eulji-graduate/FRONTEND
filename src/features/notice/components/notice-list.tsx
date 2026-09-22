import { Megaphone } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";

import type { NoticeSummary } from "../types";
import { NoticeListItem } from "./notice-list-item";

interface NoticeListProps {
  notices: NoticeSummary[];
  action?: ReactNode;
  /** 상세 화면 왼쪽 목록에서 지금 보고 있는 공지 id — 목록 단독 화면에서는 안 넘긴다. */
  activeId?: string;
  /** 상세 화면 왼쪽 목록에 최소 높이를 주는 등, 쓰는 자리에 맞춰 바깥 카드를 조정할 때만 쓴다. */
  className?: string;
}

/**
 * 공지 목록 — 카드 헤더(점+제목+우측 건수)는 DESIGN §2 카드 anatomy를 따른다.
 * 비어있으면 안내 문구로 대체한다(CLAUDE.md §정직성 · loading/error/empty).
 * 공지 상세(`/app/notice/:id`) 왼쪽 목록으로도 쓴다 — `activeId`로 지금 글을 표시한다.
 */
export function NoticeList({ notices, action, activeId, className }: NoticeListProps) {
  return (
    <div
      className={cn(
        "border-border bg-card flex flex-col overflow-hidden rounded-2xl border",
        className,
      )}
    >
      <div className="border-border flex items-center justify-between gap-3 border-b px-7 pt-6 pb-3">
        {/* ⚠️ 제목 앞 검은 점을 뺀다 — 상태점과 같은 생김새라 뜻이 있는 표식처럼 읽혔다(DESIGN §5) */}
        <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">공지 목록</h2>
        {/*
          ⚠️ **[새 공지]를 카드 머리 안에 둔다.** 카드 밖 위쪽에 혼자 떠 있으면 그 줄이
             빈 띠가 되고, 다른 목록 화면(프로젝트·사원)은 전부 머리 안에 둔다 —
             같은 것이 화면마다 다르면 안 된다.
        */}
        <div className="flex shrink-0 items-center gap-3">
          <p className="text-muted-foreground text-[12px] leading-4 tabular-nums">
            전체 {notices.length}개
          </p>
          {action}
        </div>
      </div>

      {notices.length === 0 ? (
        /*
          ⚠️ 머리에 이미 `border-b`가 있어 `bordered`를 켜지 않는다 — 선이 두 줄이 된다.
          ⚠️ `flex-1` — 공지 상세 왼쪽 목록으로도 쓰여서, 빈 상태가 그 칸을 채워야 한다(develop #327).
        */
        <EmptyState
          className="flex-1"
          icon={Megaphone}
          title="아직 등록된 공지가 없습니다."
          description="공지를 올리면 전 사원이 이 목록에서 봅니다."
        />
      ) : (
        <ul className="divide-border min-h-0 flex-1 divide-y overflow-y-auto">
          {notices.map((notice) => (
            <li key={notice.id}>
              <NoticeListItem notice={notice} isActive={notice.id === activeId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
