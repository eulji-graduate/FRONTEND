"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";

import type { PersonalCalendarEvent } from "../types";
import { CalendarEventListItem } from "./calendar-event-list-item";

interface CalendarDayDetailPanelProps {
  selectedDate: Date;
  /** 이미 그 날짜로 걸러진 목록 — 필터링은 `calendar-board.tsx`가 한다. */
  events: PersonalCalendarEvent[];
  /** PERSONAL_TODO 완료 토글 — `calendar-event-list-item.tsx`로 그대로 흘려보낸다. */
  onToggleCompletion?: (id: string) => void;
  /** 카드 머리 오른쪽에 붙는 액션 — [Todo 추가] */
  action?: ReactNode;
}

/**
 * 캘린더 오른쪽에 고정으로 붙는 날짜 상세조회 패널. 셀 클릭마다 `calendar-board.tsx`가 이 props를 갈아 끼운다.
 * ⚠️ `lg` 미만에서는 캘린더 아래로 쌓인다(`calendar-board.tsx`) — 그때는 왼쪽 경계선 대신
 *    위쪽 경계선을 쓰고, 고정 높이 대신 최소 높이만 준다. 폭 제한(`max-w-[230px]`)도 `lg`에서만
 *    건다 — 그 아래에서는 좁은 화면 전체를 다 쓴다.
 */
export function CalendarDayDetailPanel({
  selectedDate,
  events,
  onToggleCompletion,
  action,
}: CalendarDayDetailPanelProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  // ⚠️ 전역 규칙(globals.css)이 스크롤바를 감춘다 — 아래쪽 그라데이션으로 "더 있다"를 대신
  //    알린다. 단, 실제로 넘칠 때만 — 짧은 목록엔 안 그리고, 끝까지 내리면 사라진다.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    function updateOverflow() {
      if (!list) return;
      const remaining = list.scrollHeight - list.clientHeight - list.scrollTop;
      setHasMoreBelow(remaining > 1);
    }

    updateOverflow();
    list.addEventListener("scroll", updateOverflow);
    const resizeObserver = new ResizeObserver(updateOverflow);
    resizeObserver.observe(list);

    return () => {
      list.removeEventListener("scroll", updateOverflow);
      resizeObserver.disconnect();
    };
  }, [events]);

  return (
    /*
      ⚠️ **카드다**(DESIGN §2). 세로 구분선 하나로 갈라 두니 달력의 연장처럼 보여, 오른쪽이
         잘린 표인지 다른 묶음인지 알 수 없었다.
      ⚠️ 폭은 **360px 고정**(§1). 230px에서는 제목이 두 줄로 접혔다.
    */
    <aside className="border-border bg-card flex min-h-[240px] w-full shrink-0 flex-col overflow-hidden rounded-2xl border lg:h-full lg:min-h-0 lg:w-[360px] lg:max-w-[360px]">
      {/* 카드 머리 — 다른 화면과 같은 문법(px-7 · pt-6 pb-3 · 점 표식) */}
      <div className="flex items-center justify-between gap-3 px-7 pt-6 pb-3">
        <h2 className="flex min-w-0 items-center gap-2 text-[17px] leading-7 font-semibold tracking-[-0.3px]">
          <span className="bg-foreground size-2 shrink-0 rounded-full" aria-hidden />
          <span className="truncate">
            {format(selectedDate, "yyyy년 M월 d일(EEE)", { locale: ko })}
          </span>
        </h2>
        <div className="flex shrink-0 items-center gap-4">
          <span className="text-muted-foreground text-[12px] leading-4 tabular-nums">
            {events.length}건
          </span>
          {action}
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          className="flex-1"
          icon={CalendarDays}
          title="이 날짜에 일정이 없습니다."
          description="위 [+ 할 일]로 이 날짜에 할 일을 적어 둘 수 있습니다."
        />
      ) : (
        <div className="relative min-h-0 flex-1">
          {/* ⚠️ `overflow-x-hidden`은 못 박아 둔다 — 긴 제목 하나가 카드 밖으로 밀고 나가 좌우 스크롤을 만든 적이 있다 */}
          <ul
            ref={listRef}
            className="flex h-full flex-col gap-2 overflow-x-hidden overflow-y-auto px-7 pb-6"
          >
            {events.map((event) => (
              <CalendarEventListItem
                key={event.id}
                event={event}
                onToggleCompletion={onToggleCompletion}
              />
            ))}
          </ul>
          {hasMoreBelow && (
            <div
              aria-hidden
              className="from-card pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t to-transparent"
            />
          )}
        </div>
      )}
    </aside>
  );
}
