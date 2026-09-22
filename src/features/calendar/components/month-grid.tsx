"use client";

import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ko } from "date-fns/locale";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

import {
  CALENDAR_TAG_BG,
  CALENDAR_TAG_FG,
  calendarStatusDotColor,
  getProjectTagColor,
  getTodoTitleColor,
} from "../tag-colors";
import { CALENDAR_ITEM_TAG, type PersonalCalendarEvent } from "../types";

/**
 * 월간 격자 — **직접 그린다.**
 *
 * ⚠️ `react-big-calendar`를 쓰다 걷어냈다(2026-08-08). 월 뷰가 일정을 **주 단위 행**에
 *    가로로 겹쳐 배치해서, 하루가 넘칠 때 **그 날만 스크롤**시킬 DOM이 아예 없었다 —
 *    라이브러리 CSS를 이기려고 덧댄 것들(붙박이 날짜 줄, 선택 색 되받기)도 서로 부딪혀
 *    격자가 어긋나고 드래그하면 칸이 밀렸다. 개인 캘린더는 **하루짜리 항목만** 다루므로
 *    격자를 직접 그리는 편이 단순하고, 하루 칸이 곧 스크롤 상자가 된다.
 * ⚠️ 회의실 주간 달력은 아직 그 라이브러리를 쓴다 — 의존성은 남는다.
 * ⚠️ **오늘은 마운트한 뒤에 켠다.** `new Date()`를 렌더 중에 부르면 서버(대개 UTC)와
 *    브라우저(KST)의 날짜가 갈리는 순간 하이드레이션이 어긋난다 — 자정 무렵엔 실제로 갈린다.
 *    첫 프레임엔 테두리 원이 없다가 바로 붙는데, 한 프레임이라 눈에 안 띈다.
 */

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/**
 * 이 수를 넘기면 그 칸이 스크롤될 수 있다고 본다 — 그때만 일정 상자가 포인터·포커스를 받는다.
 * ⚠️ 정확한 값이 아니라 **어림수**다. 칸 높이는 화면 높이와 주 수에 따라 달라져 미리 계산할
 *    수 없다 — 넉넉히 잡아 두고, 실제로 안 넘치면 포커스가 한 번 더 갈 뿐이다.
 */
const MAX_VISIBLE_CHIPS = 3;

const DAY_KEY = "yyyy-MM-dd";

/** 그 날이 항목의 시작~끝 구간에 걸리는지 — 여러 날에 걸친 Todo도 지나는 날마다 걸린다. */
function eventOccursOnDay(event: PersonalCalendarEvent, day: Date): boolean {
  const dayStart = startOfDay(day).getTime();
  return (
    startOfDay(event.start).getTime() <= dayStart && dayStart <= startOfDay(event.end).getTime()
  );
}

/**
 * 여러 날 항목을 **연속 막대**로 이어 보이려면 구간 안에서 그 날이 어디쯤인지가 필요하다.
 * `single`은 하루짜리(기존 디자인 그대로), `start`/`middle`/`end`는 이어진 막대의 한 조각이다.
 */
type EventSpanEdge = "single" | "start" | "middle" | "end";

function getEventSpanEdge(event: PersonalCalendarEvent, day: Date): EventSpanEdge {
  if (isSameDay(event.start, event.end)) return "single";
  if (isSameDay(day, event.start)) return "start";
  if (isSameDay(day, event.end)) return "end";
  return "middle";
}

/** 항목이 걸치는 날수 — 하루짜리는 0. 줄 배정 우선순위(길수록 위)와 정렬에 쓴다. */
function eventSpanDays(event: PersonalCalendarEvent): number {
  return differenceInCalendarDays(startOfDay(event.end), startOfDay(event.start));
}

/**
 * 같은 주(週) 안에서 항목을 줄 순서로 세운다 — **긴 항목이 항상 위 줄**이다(2026-08-14 확정).
 * 시작일이 이른 쪽, 그래도 같으면 id로 안정 정렬한다(같은 입력이면 항상 같은 결과가 나와야
 * 화면을 새로고침해도 줄이 안 흔들린다).
 */
function compareEventsForStacking(a: PersonalCalendarEvent, b: PersonalCalendarEvent): number {
  const spanDiff = eventSpanDays(b) - eventSpanDays(a);
  if (spanDiff !== 0) return spanDiff;
  const startDiff = a.start.getTime() - b.start.getTime();
  if (startDiff !== 0) return startDiff;
  return a.id.localeCompare(b.id);
}

/**
 * 한 주(週, 7일) 안에서 항목마다 **고정 줄 번호**를 매긴다.
 *
 * ⚠️ **왜 필요한가.** 하루 칸마다 그날 걸리는 항목만 따로 나열하면, 옆 항목이 있다 없다에 따라
 *    같은 항목이 어느 날은 2번째, 어느 날은 3번째 줄로 밀려 보인다 — 이어진 막대가 삐뚤어
 *    보이는 원인이다(§DESIGN 잔버그, 2026-08-14). 줄 번호를 이 항목이 걸치는 **모든 날에
 *    똑같이** 매겨 두고, 그 줄이 빈 날엔 자리만 채우는 빈 칸을 넣어야 막대가 안 흔들린다.
 * ⚠️ 탐욕(그리디) 배정이다 — `compareEventsForStacking` 순서로 훑으며, 그 항목이 걸치는
 *    요일들에서 **아직 아무도 안 쓴 가장 낮은 줄**을 고른다. 달력 라이브러리들이 흔히 쓰는
 *    "day-of-week 점유표" 방식과 같다.
 */
function computeWeekEventRows(
  weekDays: Date[],
  events: PersonalCalendarEvent[],
): Map<string, number> {
  const relevant = events.filter((event) => weekDays.some((day) => eventOccursOnDay(event, day)));
  const sorted = [...relevant].sort(compareEventsForStacking);

  const rowOccupancy: boolean[][] = [];
  const rowByEventId = new Map<string, number>();

  for (const event of sorted) {
    const dayIndexes = weekDays
      .map((day, index) => (eventOccursOnDay(event, day) ? index : -1))
      .filter((index) => index >= 0);

    let row = 0;
    for (;;) {
      const occupied = (rowOccupancy[row] ??= new Array(weekDays.length).fill(false));
      if (dayIndexes.every((index) => !occupied[index])) {
        dayIndexes.forEach((index) => (occupied[index] = true));
        rowByEventId.set(event.id, row);
        break;
      }
      row += 1;
    }
  }

  return rowByEventId;
}

/**
 * "오늘"을 **브라우저 기준으로** 잡는다 — 서버 렌더에서는 `null`이다.
 *
 * ⚠️ 렌더 중에 `new Date()`를 부르면 서버(대개 UTC)와 브라우저(KST)의 날짜가 갈리는 순간
 *    하이드레이션이 어긋난다 — 자정 무렵엔 실제로 갈린다. 그래서 서버 스냅샷은 `null`로 두고
 *    브라우저에서만 값이 온다. 첫 프레임엔 테두리 원이 없다가 바로 붙는데, 한 프레임이라
 *    눈에 안 띈다.
 * ⚠️ `Date`가 아니라 **날짜 문자열**을 돌려준다. `useSyncExternalStore`의 스냅샷은 값이 같으면
 *    같아야 하는데, `new Date()`는 부를 때마다 새 참조라 무한 렌더가 된다.
 * ⚠️ 구독은 빈 함수다 — 화면을 보는 동안 날짜가 바뀌는 일(자정)까지는 챙기지 않는다.
 */
function useTodayKey(): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => format(new Date(), DAY_KEY),
    () => null,
  );
}

interface MonthGridProps {
  /** 이 달에 속한 항목들 — 걸러 내는 일은 서버가 한다 */
  events: PersonalCalendarEvent[];
  /** 지금 보고 있는 달의 아무 날 */
  month: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export function MonthGrid({ events, month, selectedDate, onSelectDate }: MonthGridProps) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { locale: ko }),
    end: endOfWeek(endOfMonth(month), { locale: ko }),
  });

  const todayKey = useTodayKey();
  const weekCount = days.length / 7;

  return (
    <div className="border-border flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
      {/* 요일 머리 — 띠로 칠하지 않고 선 하나로만 가른다(DESIGN §5 표면) */}
      <div className="border-border grid shrink-0 grid-cols-7 border-b">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="text-muted-foreground py-2.5 text-center text-[11px] leading-4 font-medium"
          >
            {label}
          </div>
        ))}
      </div>

      {/*
        ⚠️ **남는 높이를 주(週)들이 똑같이 나눠 갖는다**(`grid-rows-*` + `flex-1`). 달마다 5주·6주로
           갈리지만 격자 전체 높이는 그대로라, 달을 넘겨도 카드가 커졌다 작아지지 않는다.
      */}
      <div
        className="grid min-h-0 flex-1"
        style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: weekCount }, (_, week) => {
          const weekDays = days.slice(week * 7, week * 7 + 7);
          // ⚠️ 줄 번호는 **주 단위**로 다시 매긴다 — 주가 바뀌면 이어지는 막대도 새로 시작하는
          //    모양이라(월간 격자가 주마다 행을 새로 그리므로), 줄도 주마다 새로 세는 게 맞다.
          const rowByEventId = computeWeekEventRows(weekDays, events);

          return (
            <div key={week} className="border-border grid grid-cols-7 not-first:border-t">
              {weekDays.map((day) => (
                <DayCell
                  key={day.toISOString()}
                  day={day}
                  events={events.filter((event) => eventOccursOnDay(event, day))}
                  rowByEventId={rowByEventId}
                  isOutside={!isSameMonth(day, month)}
                  isToday={format(day, DAY_KEY) === todayKey}
                  isSelected={isSameDay(day, selectedDate)}
                  onSelect={onSelectDate}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 하루 칸.
 *
 * ⚠️ **일정이 많으면 이 칸 안에서 스크롤한다.** 라이브러리를 걷어낸 가장 큰 이유다 —
 *    넘치는 일정이 말없이 잘리지 않는다(§정직성).
 * ⚠️ 날짜 숫자는 **붙박이**다. 아래 목록만 흐른다.
 */
function DayCell({
  day,
  events,
  rowByEventId,
  isOutside,
  isToday,
  isSelected,
  onSelect,
}: {
  day: Date;
  events: PersonalCalendarEvent[];
  /** 이 주(週) 안에서 항목마다 매긴 고정 줄 번호 — `computeWeekEventRows` 참고. */
  rowByEventId: Map<string, number>;
  isOutside: boolean;
  isToday: boolean;
  isSelected: boolean;
  onSelect: (date: Date) => void;
}) {
  const dateLabel = format(day, "M월 d일(EEE)", { locale: ko });

  /*
    ⚠️ **줄 번호만큼 자리를 채운다.** 이 날의 최고 줄 번호까지는 빈 줄도 자리를 차지해야,
       그 줄을 쓰는 다른 날의 항목과 세로 위치가 맞아 이어진 막대처럼 보인다
       (`computeWeekEventRows` 주석 — "밤티현상" 수정, 2026-08-14).
    ⚠️ 최고 줄 **뒤**는 채우지 않는다 — 이 날엔 아무것도 없어 맞출 대상이 없다.
  */
  const maxRow = events.reduce((max, event) => Math.max(max, rowByEventId.get(event.id) ?? 0), -1);
  const slots: (PersonalCalendarEvent | null)[] = Array.from(
    { length: maxRow + 1 },
    (_, row) => events.find((event) => rowByEventId.get(event.id) === row) ?? null,
  );
  const mayOverflow = slots.length > MAX_VISIBLE_CHIPS;

  return (
    /*
      ⚠️ **버튼을 칸 바닥에 깐다.** 예전엔 칸 전체가 `<button>`이고 일정 목록이 그 안에
         있었는데, 그러면 두 가지가 막혔다 —
         ① `aria-label`이 자식 텍스트를 덮어써서 스크린리더에 칸 안 일정이 통째로 안 읽혔다.
         ② 넘치는 일정의 스크롤 상자에 포커스를 줄 수가 없었다. 버튼 안에 포커스 가능한
            요소를 넣는 건 유효한 HTML이 아니다 — 키보드만 쓰는 사람은 넘친 일정을 못 봤다.
      ⚠️ 그래서 버튼은 **빈 곳을 누르는 판**으로만 남기고(`absolute inset-0`), 날짜 숫자와
         일정 목록은 그 위 형제로 올린다. 클릭 대상은 그대로 칸 전체다.
    */
    <div
      className={cn(
        "group border-border relative flex min-w-0 flex-col overflow-hidden not-first:border-l",
        "focus-within:z-10",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(day)}
        aria-pressed={isSelected}
        /*
          ⚠️ **일정 수까지 이름에 넣는다.** 칸을 훑는 단계에서는 있다/없다와 몇 건이면 되고,
             제목·상태는 그 날을 고르면 오른쪽 일정 카드가 목록으로 읽어 준다.
        */
        aria-label={events.length > 0 ? `${dateLabel}, 일정 ${events.length}건` : dateLabel}
        className={cn(
          "focus-visible:ring-ring absolute inset-0 transition-colors focus-visible:ring-2 focus-visible:outline-hidden",
          /*
            ⚠️ **고른 칸을 회색으로 칠하지 않는다.** 칸이 통째로 어두워지면 그 안의 칩까지 눌려
               보이고, 달력에 회색 덩어리가 하나 생긴다 — 고른 날은 **숫자의 채운 원**이 말한다.
          */
          "hover:bg-foreground/[0.02]",
        )}
      />

      {/* ⚠️ `pointer-events-none` — 숫자를 눌러도 아래 버튼이 받는다 */}
      <div className="pointer-events-none relative flex shrink-0 justify-end px-2 pt-1.5 pb-1">
        {/*
          아이폰 달력과 같은 문법 — **오늘은 테두리 원, 고른 날은 채운 원.**
          ⚠️ 오늘을 빨강으로 두지 않았다. 우리 빨강은 **에러 전용**이라(DESIGN §5) 달력에
             상시로 켜 두면 그 뜻이 닳는다 — 채움/테두리로만 가른다.
        */}
        <span
          className={cn(
            "inline-flex size-5 items-center justify-center rounded-full text-[12px] leading-4 tabular-nums",
            isSelected && "bg-foreground text-background font-semibold",
            !isSelected && isToday && "border-foreground/45 text-foreground border font-semibold",
            !isSelected &&
              !isToday &&
              (isOutside ? "text-muted-foreground/45" : "text-muted-foreground"),
          )}
        >
          {format(day, "d")}
        </span>
      </div>

      {/*
        일정 — 넘치면 **여기서만** 스크롤한다.
        ⚠️ 넘칠 때만 `tabIndex={0}`을 준다. 키보드로 짚어 스크롤할 수 있어야 하는데
           (§a11y: 드래그·스크롤만으로 되는 조작은 대체 경로가 있어야 한다), 안 넘치는
           칸까지 포커스를 받으면 달력을 지나가는 데 탭을 70번 눌러야 한다.
        ⚠️ 일정이 없으면 상자 자체를 안 그린다 — 빈 칸에 포커스 대상이 생기지 않게.
      */}
      {events.length > 0 && (
        <div
          role="group"
          aria-label={`${dateLabel} 일정`}
          tabIndex={mayOverflow ? 0 : undefined}
          className={cn(
            "focus-visible:ring-ring relative flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 pb-1.5 focus-visible:ring-2 focus-visible:outline-hidden",
            /*
              ⚠️ **넘칠 때만 포인터를 받는다.** 이 상자는 버튼 위에 얹혀 있어서, 늘 포인터를
                 받으면 칩을 눌렀을 때 아래 버튼에 안 닿아 그날이 안 골라진다. 반대로 늘
                 안 받으면 넘치는 칸을 휠로 못 굴린다 — 굴릴 게 있을 때만 받는다.
            */
            mayOverflow ? "pointer-events-auto" : "pointer-events-none",
          )}
        >
          {slots.map((event, row) =>
            event ? (
              <EventChip key={event.id} event={event} spanEdge={getEventSpanEdge(event, day)} />
            ) : (
              // 줄만 비었을 뿐 항목은 없다 — 자리만 채우고 스크린리더엔 아무것도 안 알린다.
              <div key={`gap-${row}`} aria-hidden className="h-4 shrink-0" />
            ),
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 일정 한 줄 — **옅은 칩 + 앞에 상태 콩**.
 *
 * ⚠️ **색 축이 둘이고, 색벌도 둘이다.** 바탕(파스텔)은 **무엇인지**(Todo·액션),
 *    앞의 콩은 **어디까지 됐는지**(진행중·완료)다.
 * ⚠️ 예전엔 상태까지 태그 색으로 그렸다 — sky 칩에 sky 콩이 되어 **콩이 제 바탕에 묻혔고**,
 *    "Todo"와 "진행중"이 같은 파랑이라 색이 무엇을 가리키는지 알 수 없었다. 두 축은 **색벌을
 *    갈라야** 비로소 두 축이 된다(`tag-colors.ts`의 teal·slate).
 * ⚠️ 채움/테두리로 상태를 말하던 방식은 걷어냈다 — 콩이 같은 말을 더 분명히 한다.
 * ⚠️ 취소선은 남긴다. 끝난 일은 훑을 때 건너뛸 수 있어야 한다.
 * ⚠️ 제목이 길면 자른다. `min-w-0`이 없으면 flex 자식이 안 줄어들어 칸을 밀어낸다.
 *
 * ⚠️ **여러 날에 걸친 항목은 이 칩을 지나는 칸마다 그려 하나의 막대처럼 잇는다**(2026-08-10).
 *    하루 칸을 격자로 직접 그리는 지금 구조를 바꾸지 않고, 시작~끝 칩 사이의 둥근 모서리와
 *    칸 사이 여백(`px-1.5`)만 없애 이어 붙인다 — `spanEdge`가 그 위치를 말해 준다.
 *    제목·상태 콩은 **시작 칸에서만** 보인다. 매 칸에 반복하면 이어진 막대가 아니라
 *    같은 항목이 여러 개 있는 것처럼 읽힌다.
 */
function EventChip({ event, spanEdge }: { event: PersonalCalendarEvent; spanEdge: EventSpanEdge }) {
  const done = event.isCompleted;
  const showContent = spanEdge === "single" || spanEdge === "start";
  // ⚠️ 개인 Todo는 제목마다, 프로젝트는 프로젝트 태그마다 색이 갈린다(2026-08-14) — 개인
  //    액션은 여전히 fuchsia 고정이다.
  const isTodo = event.tag === CALENDAR_ITEM_TAG.PERSONAL_TODO;
  const todoColor = isTodo ? getTodoTitleColor(event.title) : null;
  const projectColor = event.projectTag ? getProjectTagColor(event.projectTag) : null;

  return (
    <span
      title={event.title}
      style={{
        color: todoColor?.textColor ?? projectColor?.textColor ?? CALENDAR_TAG_FG[event.tag],
        backgroundColor:
          event.color ?? todoColor?.bgColor ?? projectColor?.bgColor ?? CALENDAR_TAG_BG[event.tag],
      }}
      className={cn(
        /*
          ⚠️ `shrink-0`이 **핵심**이다. 칩은 세로 flex의 자식이라 기본값(`flex-shrink:1`)이면
             칸이 모자랄 때 넘치는 대신 **하나씩 납작하게 눌린다** — 15개를 넣어도
             `scrollHeight`가 안 늘어나 스크롤이 아예 안 생겼다. 안 줄어들어야 넘치고,
             넘쳐야 그 칸만 스크롤한다(이게 라이브러리를 걷어낸 이유다).
        */
        "relative flex shrink-0 items-center gap-1 px-1.5 text-[11px] leading-[16px] font-medium",
        // 하루짜리는 네 모서리 다 둥글게, 이어진 막대는 시작·끝 칸만 그쪽 모서리를 둥글게 둔다.
        spanEdge === "single" && "rounded",
        spanEdge === "start" && "rounded-l",
        spanEdge === "end" && "rounded-r",
        // 이어지는 쪽은 칸의 좌우 여백(`px-1.5`)만큼 밀어내 옆 칸 칩과 맞붙는다.
        (spanEdge === "middle" || spanEdge === "end") && "-ml-1.5",
        (spanEdge === "middle" || spanEdge === "start") && "-mr-1.5",
        /*
          ⚠️ 취소선을 **칩 전체**에 긋는다. `line-through`는 글자 위에만 그어져서, 제목이
             짧거나 잘리면 선이 중간에 끊겨 지저분했다 — 가운데를 가로지르는 선 하나로 둔다.
          ⚠️ 좌우 인셋도 배경 여백(`-ml-1.5`/`-mr-1.5`)과 **같은 규칙**을 따른다(2026-08-14) —
             안 그러면 이어진 칸끼리 배경은 맞붙어도 취소선만 각 칸 여백(6px)에서 멈춰서,
             완료된 여러 날 Todo가 하루마다 선이 끊긴 것처럼 보인다.
        */
        done &&
          "after:absolute after:top-1/2 after:h-px after:-translate-y-1/2 after:bg-current after:opacity-70",
        done && (spanEdge === "middle" || spanEdge === "end" ? "after:left-0" : "after:left-1.5"),
        done &&
          (spanEdge === "middle" || spanEdge === "start" ? "after:right-0" : "after:right-1.5"),
      )}
    >
      {showContent ? (
        <>
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: calendarStatusDotColor(done) }}
          />
          <span className="min-w-0 truncate">{event.title}</span>
        </>
      ) : (
        // 이어지는 칸도 높이는 같아야 막대가 끊겨 보이지 않는다 — 보이는 글자 없이 자리만 채운다.
        <span aria-hidden className="min-w-0 truncate">
          &nbsp;
        </span>
      )}
    </span>
  );
}
