import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { CalendarLegend } from "./calendar-legend";

/**
 * 달력 카드의 **머리**.
 *
 * ⚠️ 이 사이트의 카드는 전부 `● 제목`으로 자기가 뭔지 말하고 시작한다(저장소 `전체 용량`,
 *    구독 패널들). 달 이름이 곧 이 카드의 제목이라 같은 표식을 단다.
 * ⚠️ 왼쪽은 **이게 뭔지**, 오른쪽은 **뭘 할 수 있는지**로 축을 가른다(DESIGN §3).
 * ⚠️ [Todo 추가]는 여기 없다 — **일정 카드 머리**로 옮겼다(`calendar-day-detail-panel.tsx`).
 *    어느 날짜에 붙는 일인지는 그 카드가 말한다.
 */
interface CalendarToolbarProps {
  month: Date;
  onNavigate: (action: "PREV" | "NEXT" | "TODAY") => void;
}

export function CalendarToolbar({ month, onNavigate }: CalendarToolbarProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      {/*
        ⚠️ 제목 앞 점을 뺀다 — 상태점과 같은 생김새라 뜻이 있는 표식처럼 읽힌다(§DESIGN 5).
        ⚠️ `flex`를 다시 세운다 — 점을 빼면서 인라인이 되어 아래 고정폭(`w-[104px]`)이 안 먹었다.
      */}
      <h2 className="flex items-center text-[17px] leading-7 font-semibold tracking-[-0.3px]">
        {/*
          ⚠️ **고정 너비**를 준다 — `9월`·`12월`처럼 글자수가 달라지면 제목 폭이 흔들려
             오른쪽 조작 묶음이 매번 다른 자리에 선다.
        */}
        <span className="w-[104px] tabular-nums">
          {format(month, "yyyy년 M월", { locale: ko })}
        </span>
      </h2>

      <div className="flex items-center gap-4">
        <CalendarLegend />

        {/*
          달 이동 — 테두리 하나 안에 세 칸(segmented). 버튼 셋을 떼어 놓으면 테두리가 세 번
          반복되고 사이 간격까지 생겨, 조작 하나가 아니라 잡동사니로 보인다.
          ⚠️ **[오늘]이 가운데다.** 몇 달 넘기고 나면 돌아올 길이 그만큼 다시 누르는 것뿐이었다 —
             달력에서 가장 자주 하는 일이 "오늘로 돌아가기"이고, 화살표 사이에 두면 손이
             움직이는 거리가 가장 짧다.
        */}
        <div className="border-border inline-flex items-center overflow-hidden rounded-lg border">
          <button
            type="button"
            aria-label="이전 달"
            onClick={() => onNavigate("PREV")}
            className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] focus-visible:ring-ring flex size-7 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-hidden focus-visible:ring-inset"
          >
            <ChevronLeft className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onNavigate("TODAY")}
            className="border-border text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] focus-visible:ring-ring flex h-7 items-center border-x px-2.5 text-[11px] leading-4 transition-colors focus-visible:ring-2 focus-visible:outline-hidden focus-visible:ring-inset"
          >
            오늘
          </button>
          <button
            type="button"
            aria-label="다음 달"
            onClick={() => onNavigate("NEXT")}
            className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] focus-visible:ring-ring flex size-7 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-hidden focus-visible:ring-inset"
          >
            <ChevronRight className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
