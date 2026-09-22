"use client";

import { endOfDay, isSameMonth, parse, startOfDay, startOfMonth } from "date-fns";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { toggleTodoCompletionAction } from "../actions";
import type { PersonalCalendarEvent } from "../types";
import { AddTodoDialog } from "./add-todo-dialog";
import { CalendarDayDetailPanel } from "./calendar-day-detail-panel";
import { PersonalCalendarLoader } from "./personal-calendar-loader";

interface CalendarBoardProps {
  initialEvents: PersonalCalendarEvent[];
  /** "YYYY-MM" — 서버 컴포넌트가 이 달 기준으로 `initialEvents`를 내려준다. */
  month: string;
}

/** "YYYY-MM"을 그 달의 1일로 — 월이 1~12를 벗어나면(방어적으로) 오늘이 속한 달로 대신한다. */
function parseMonth(month: string): Date {
  const [, monthPart] = month.split("-");
  const monthNumber = Number(monthPart);
  if (monthNumber < 1 || monthNumber > 12) return startOfMonth(new Date());
  return parse(`${month}-01`, "yyyy-MM-dd", new Date());
}

/** 기본 선택 날짜 — 지금 보는 달에 오늘이 있으면 오늘, 아니면 1일. */
function defaultSelectedDate(month: string): Date {
  const firstDay = parseMonth(month);
  const today = new Date();
  return isSameMonth(firstDay, today) ? today : firstDay;
}

/**
 * 개인 캘린더 화면 본체(client). 서버가 내려준 이벤트를 로컬 state로 들고 있다가,
 * Todo 추가 성공 시 재조회 없이 바로 얹는다(§최적화: action 리턴값으로 화면 반영).
 * ⚠️ 달을 옮기면(`?month=`) 서버가 새 `initialEvents`를 내려주는데, 이 컴포넌트는 그때마다
 *    호출부에서 `key={month}`로 다시 마운트된다 — props를 state로 동기화하는 effect 대신
 *    리마운트로 초기화한다(React 권장 패턴, `useEffect`로 setState하면 캐스케이딩 렌더가 생긴다).
 * ⚠️ "Todo 추가" 버튼은 오른쪽 **일정 카드 머리**에 산다 —
 *    아래 `action` prop으로 오른쪽 일정 카드 머리에 넘긴다.
 * ⚠️ 오른쪽 날짜 상세조회 패널은 셀/이벤트 클릭마다 `selectedDate`만 바뀌고 새로 마운트되지
 *    않는다 — 같은 달 안에서 API를 다시 부를 필요가 없어서(이미 이번 달 이벤트를 다 들고 있다).
 * ⚠️ 높이를 **계산하지 않는다**(2026-08-08). 예전에는 주 수로 픽셀을 미리 재서 바깥 행에
 *    내려 줬는데(`--calendar-total-height`), 그래서 달을 넘길 때마다 카드가 커졌다 작아졌다.
 *    지금은 `flex-1`로 남는 높이를 채우고 그 안에서 주들이 나눠 갖는다(`month-grid.tsx`).
 * ⚠️ 좌우 배치는 **`lg` 이상에서만** 켠다. 좁은 화면에서 캘린더와 패널을 나란히 두면 둘 다
 *    찌그러진다 — 그 아래에서는 위아래로 쌓는다.
 */
export function CalendarBoard({ initialEvents, month }: CalendarBoardProps) {
  const [events, setEvents] = useState(initialEvents);
  const [selectedDate, setSelectedDate] = useState(() => defaultSelectedDate(month));

  // 하루짜리 항목뿐이라 지금은 `isSameDay`와 결과가 같지만, 여러 날에 걸치는 항목이 와도
  // 그 구간이 선택한 날짜와 겹치면 보이도록 구간 비교로 본다(`server.ts`의 월 필터와 같은 이유).
  const dayEvents = useMemo(() => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);
    return events.filter((event) => event.start <= dayEnd && event.end >= dayStart);
  }, [events, selectedDate]);

  /**
   * 완료 토글 — **개인 Todo만** 다룬다. 개인 액션은 완료 처리 화면이 따로 있어서,
   * `calendar-event-list-item.tsx`가 체크박스를 **그리되 `disabled`로 둔다**(모양은 같고
   * 권한만 다르다). 먼저 화면에 반영하고 서버 액션을 부른 뒤, 실패하면 되돌리고 토스트로 알린다.
   * ⚠️ 그 `disabled`를 지우면 여기로 액션 id가 들어오는데, 서버는
   *    "개인 Todo만 완료 처리할 수 있습니다"로 거절한다.
   */
  function handleToggleCompletion(id: string) {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === id ? { ...event, isCompleted: !event.isCompleted } : event,
      ),
    );

    toggleTodoCompletionAction(id).catch(() => {
      setEvents((prev) =>
        prev.map((event) =>
          event.id === id ? { ...event, isCompleted: !event.isCompleted } : event,
        ),
      );
      toast.error("완료 처리하지 못했습니다");
    });
  }

  return (
    <div
      /*
        ⚠️ 곁 컬럼은 **360px 고정**이다(DESIGN §1). 230px은 규격에 없는 숫자였고, 그 폭에서는
           일정 제목이 두 줄로 접혀 목록이 들쭉날쭉했다.
        ⚠️ 카드 사이는 `gap-7`이다(§4 여백).
        ⚠️ **높이를 달마다 계산하지 않는다.** 예전에는 한 행 높이를 5주 기준으로 고정하고
           6주짜리 달에서 컨테이너를 늘렸는데, 그래서 달을 넘길 때마다 카드가 커졌다 작아지고
           6주 달은 화면 밖으로 넘쳐 스크롤해야 했다 — 달력은 **한 눈에 보는 화면**이다.
           지금은 남는 높이를 채우고 그 안에서 행이 나눠 갖는다(다른 달력 앱과 같은 방식).
      */
      className="flex min-h-0 flex-1 flex-col gap-7 lg:flex-row lg:items-stretch"
    >
      {/*
        ⚠️ 달력도 **카드 위에** 올린다(DESIGN §2). 표만 맨 배경에 떠 있으면 셸과 본문의
           경계가 없어져, 사이드바 옆에 표 하나가 얹힌 그림처럼 보였다.
      */}
      <div className="border-border bg-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border p-7">
        <PersonalCalendarLoader
          events={events}
          month={month}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </div>

      {/*
        ⚠️ [Todo 추가]는 **이 카드**에 있다. 달력 툴바에 뒀을 때는 어느 날짜에 추가되는지가
           안 보였다 — 고른 날짜를 머리에 띄우는 카드 안에 있어야 그 날짜에 붙는 일이라는
           게 드러난다(`defaultDate`가 실제로 그 날짜다).
      */}
      <CalendarDayDetailPanel
        selectedDate={selectedDate}
        events={dayEvents}
        onToggleCompletion={handleToggleCompletion}
        action={
          <AddTodoDialog
            defaultDate={selectedDate}
            onCreated={(created) => setEvents((prev) => [...prev, created])}
          />
        }
      />
    </div>
  );
}
