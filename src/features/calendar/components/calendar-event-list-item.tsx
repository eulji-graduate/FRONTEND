import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import {
  CALENDAR_TAG_DOT_COLOR,
  calendarStatusDotColor,
  getProjectTagColor,
  getTodoTitleColor,
} from "../tag-colors";
import {
  CALENDAR_ITEM_TAG,
  CALENDAR_ITEM_TAG_LABEL,
  getCalendarCompletionLabel,
  type PersonalCalendarEvent,
} from "../types";

interface CalendarEventListItemProps {
  event: PersonalCalendarEvent;
  /**
   * 완료 토글 — PERSONAL_TODO에서만 쓴다. PERSONAL_ACTION은 완료 처리 화면이 따로 있어서
   * 체크박스를 **그리되 `disabled`로 둔다**(`calendar-board.tsx` 참고).
   */
  onToggleCompletion?: (id: string) => void;
}

/**
 * 일정 카드의 한 줄.
 *
 * ⚠️ **옅은 면 하나**로 띄운다(회의 자막 줄과 같은 결). 선 하나로만 가르니 줄이 흘러내리는
 *    목록처럼 보여 항목의 경계가 약했다 — 면이 있으면 한 건이 한 덩어리로 잡힌다.
 * ⚠️ 면은 **무채색**(`--secondary`)이다. 일정 색(sky·fuchsia)을 여기 깔면 오른쪽 카드가
 *    알록달록해지고, 그 색이 뜻하는 건 달력 칩에서 이미 말했다(§5: 색은 한 종류의 대상에만).
 * ⚠️ **두 줄이 같은 왼쪽 축에서 시작한다.** 태그는 왼쪽, 상태는 오른쪽으로 떼어 놨더니
 *    줄마다 눈이 좌우로 튀었다 — 제목 아래에 나란히 붙인다(§3: 열마다 축이 따로 선다).
 */
export function CalendarEventListItem({ event, onToggleCompletion }: CalendarEventListItemProps) {
  const isTodo = event.tag === CALENDAR_ITEM_TAG.PERSONAL_TODO;
  // ⚠️ 개인 Todo는 제목마다, 프로젝트는 프로젝트 태그마다 색이 갈린다(2026-08-14) — 달력 칩
  //    (`month-grid.tsx`)과 같은 규칙.
  const tagColor =
    event.color ??
    (isTodo
      ? getTodoTitleColor(event.title).solidColor
      : event.projectTag
        ? getProjectTagColor(event.projectTag).solidColor
        : CALENDAR_TAG_DOT_COLOR[event.tag]);

  return (
    <li className="border-border bg-secondary/40 flex items-center gap-3 rounded-lg border px-3.5 py-3">
      {/*
        ⚠️ 체크박스(16px)와 색점(8px)의 실제 크기가 달라서, 이 자리를 고정폭(size-4)으로
        감싸지 않으면 제목 시작 x좌표가 항목 종류에 따라 흔들린다 — 둘 다 이 상자 안에서
        가운데 정렬해 시작점을 맞춘다.
      */}
      {/*
        ⚠️ 세로 **가운데**다 — 위에 붙여 두니 두 줄짜리 항목에서 체크만 떠 있었다.
        ⚠️ 개인 액션도 **체크박스로 그리되 못 누르게** 둔다. 완료 여부는 액션 처리 화면에서
           정해져 내려오는 값이라, 여기서 개인이 상태를 바꾸면 안 된다 — 그렇다고 다른 모양으로
           그리면 두 줄이 서로 다른 물건처럼 보인다. 같은 모양, **다른 권한**이 사실에 맞다.
        ⚠️ `disabled`라 스크린리더에도 "못 바꾼다"가 그대로 전해진다(§a11y).
      */}
      <div className="flex size-4 shrink-0 items-center justify-center">
        <Checkbox
          checked={event.isCompleted}
          disabled={!isTodo}
          onCheckedChange={isTodo ? () => onToggleCompletion?.(event.id) : undefined}
          aria-label={
            isTodo ? `${event.title} 완료 처리` : `${event.title} — 여기서 바꿀 수 없습니다`
          }
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/*
          ⚠️ **곁가지가 위, 제목이 아래다.** 제목을 위에 두니 그 아래 작은 글씨가 꼬리처럼
             딸려 붙어 항목이 아래로 흘러내렸다 — 태그·상태를 머리에 얹으면 제목이 바닥에
             단단히 앉고, 여러 줄이 쌓여도 눈이 제목 줄만 따라간다.
        */}
        {/*
          ⚠️ **콩 둘이 한 줄에** 있다 — 태그 콩이 맨 앞, 그다음 태그명, 구분선, 상태 콩, 상태명.
             태그 콩을 왼쪽 체크박스 자리에 두었더니 Todo 줄에는 체크박스, 액션 줄에는 콩이
             와서 **같은 자리가 줄마다 다른 뜻**이었다.
          ⚠️ 태그 칸을 **고정폭**으로 잡는다. "개인 Todo"와 "개인 액션"은 글자 수가 달라서,
             흐르는 대로 두면 구분선과 상태 콩이 줄마다 다른 자리에 서고 목록이 들쭉날쭉해진다
             (§3: 열마다 축이 따로 선다).
          ⚠️ 두 콩은 **색벌이 다르다**(`tag-colors.ts`) — 태그는 sky·fuchsia, 상태는
             teal·slate. 같은 벌로 그리면 나란히 놓인 두 콩이 같은 말을 하는 줄 안다.
        */}
        <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] leading-4">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: tagColor }}
          />
          <span className="w-14 shrink-0">{CALENDAR_ITEM_TAG_LABEL[event.tag]}</span>
          <span className="bg-border mx-0.5 h-2.5 w-px shrink-0" aria-hidden />
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: calendarStatusDotColor(event.isCompleted) }}
          />
          <span className="shrink-0 whitespace-nowrap">
            {getCalendarCompletionLabel(event.isCompleted)}
          </span>
        </div>

        {/*
          ⚠️ **제목이 전부다.** 상세 화면이 따로 없어서 이 줄만 보고 무슨 일인지 알아야 한다.
          ⚠️ **한 줄에서 끊는다.** 두 줄로 흘려 봤더니 글자 폭에 따라 카드 높이가 줄마다 달라져
             목록이 들쭉날쭉했다 — 한 줄로 고정해야 행이 같은 높이로 선다. 띄어쓰기 없는 긴
             문자열은 `wrap-anywhere`로 꺾어도 결국 줄 수가 들쭉날쭉해 같은 문제가 남았다.
          ⚠️ 그래서 제목을 **20자**로 막아(`validate.ts`) 이 폭(244px)에 한 줄로 들어오게 했다.
             그래도 넘치면 `...`으로 자르고 전문은 `title`로 hover에 남긴다.
        */}
        <p
          title={event.title}
          className={cn(
            "truncate text-[13px] leading-5 font-medium",
            event.isCompleted && "text-muted-foreground line-through",
          )}
        >
          {event.title}
        </p>
      </div>
    </li>
  );
}
