import { format } from "date-fns";
import type { Metadata } from "next";

import { CalendarBoard } from "@/features/calendar/components/calendar-board";
import { getMonthEvents } from "@/features/calendar/server";

export const metadata: Metadata = {
  title: "캘린더",
};

const MONTH_PARAM_PATTERN = /^\d{4}-\d{2}$/;

function parseMonthParam(raw: string | undefined): Date {
  if (raw && MONTH_PARAM_PATTERN.test(raw)) {
    const [yearPart, monthPart] = raw.split("-");
    const month = Number(monthPart);
    if (month >= 1 && month <= 12) {
      return new Date(Number(yearPart), month - 1, 1);
    }
  }
  return new Date();
}

interface CalendarPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const { month: monthParam } = await searchParams;
  const month = parseMonthParam(monthParam);
  const events = await getMonthEvents(month);

  return (
    /*
      ⚠️ **`lg` 이상에서만 본문이 안 흐른다.** 달력은 한 달을 **한 눈에** 보는 화면이라,
         아래로 내려서 마지막 주를 보게 되면 달력인 의미가 없다 — 남는 높이를 달력이 다 먹는다.
      ⚠️ 그 아래에서는 **스크롤을 연다.** `lg` 미만에서는 달력과 일정 카드가 위아래로 쌓이는데
         (`calendar-board.tsx`), 그때도 `overflow-hidden`이면 격자가 잘린 채 갈 방법이 없다 —
         짧은 화면에서 마지막 주가 통째로 사라진다.
    */
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 py-7 lg:overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col gap-7">
        <CalendarBoard
          key={format(month, "yyyy-MM")}
          initialEvents={events}
          month={format(month, "yyyy-MM")}
        />
      </div>
    </main>
  );
}
