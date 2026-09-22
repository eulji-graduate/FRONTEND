"use client";

import { addMonths, format, parse } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

import type { PersonalCalendarEvent } from "../types";
import { CalendarToolbar } from "./calendar-toolbar";
import { MonthGrid } from "./month-grid";

/**
 * 개인 캘린더 월간 뷰.
 *
 * ⚠️ 달 이동은 로컬 state가 아니라 **URL 쿼리(`?month=`)** 로 반영한다 — 그래야 서버 컴포넌트가
 *    그 달 이벤트를 다시 내려준다(CLAUDE.md §핵심 4원칙: 조회는 Server Component).
 * ⚠️ 격자는 `MonthGrid`가 직접 그린다 — `react-big-calendar`를 걷어낸 이유는 그 파일에 적었다.
 */
interface PersonalCalendarProps {
  events: PersonalCalendarEvent[];
  /** "YYYY-MM" — 지금 보고 있는 달. 서버 컴포넌트가 이 값 기준으로 이벤트를 걸러 내려준다. */
  month: string;
  /** 지금 고른 날짜 — 그 칸을 표시해 오른쪽 카드가 보여주는 날이 어디인지 알린다. */
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export function PersonalCalendar({
  events,
  month,
  selectedDate,
  onSelectDate,
}: PersonalCalendarProps) {
  const router = useRouter();
  const currentMonth = useMemo(() => parse(`${month}-01`, "yyyy-MM-dd", new Date()), [month]);

  const handleNavigate = useCallback(
    (action: "PREV" | "NEXT" | "TODAY") => {
      const next =
        action === "TODAY" ? new Date() : addMonths(currentMonth, action === "PREV" ? -1 : 1);
      router.push(`/app/calendar?month=${format(next, "yyyy-MM")}`);
    },
    [currentMonth, router],
  );

  return (
    <>
      <CalendarToolbar month={currentMonth} onNavigate={handleNavigate} />
      <MonthGrid
        events={events}
        month={currentMonth}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />
    </>
  );
}
