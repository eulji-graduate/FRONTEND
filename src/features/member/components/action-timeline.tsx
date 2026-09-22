import { ListChecks, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import type { StatusTone } from "@/components/common/status-dot";
import { ACTION_DELAYED_LABEL, ACTION_STATUS, ACTION_STATUS_LABEL } from "@/constants/domain";
import {
  buildActionTimeline,
  TIMELINE_DAY_WIDTH_PX,
  type TimelineActionInput,
  type TimelineBar,
  type TimelineDay,
} from "@/features/member/action-timeline";
import { cn } from "@/lib/utils";

/**
 * 처리할 액션 타임라인 — GitHub Projects Roadmap 결. 좌측 아이템 열 + 우측 날짜 축.
 * 각 액션을 **시작일→마감일 기간 바**로 그리고, 오늘 세로선이 가로지른다.
 * ⚠️ 날짜 칸은 고정폭(`TIMELINE_DAY_WIDTH_PX`)이다 — 기간이 길어지면 칸을 눌러 욱여넣지 않고
 *    **가로 스크롤**로 보여준다(2026-08-06 정정).
 * ⚠️ **스크롤 컨테이너는 하나뿐이다**(가로·세로 전부). 헤더는 `sticky top-0`, 좌측 아이템 열은
 *    `sticky left-0`로 고정한다 — 세로 스크롤용 안쪽 컨테이너를 따로 두면(`overflow-y-auto`),
 *    그 안의 `sticky left-0`가 바깥 가로 스크롤이 아니라 그 안쪽 컨테이너 기준으로 붙어버려서
 *    가로로 스크롤할 때 라벨 열이 통째로 사라진다(2026-08-06에 실제로 겪은 버그 — sticky의
 *    포함 블록은 "가장 가까운 스크롤 컨테이너"라 컨테이너를 하나로 합쳐야 한다).
 * ⚠️ 상태는 색만으로 전하지 않는다 — 바의 `aria-label`에 상태·기간을 함께 넣는다(§a11y).
 * ⚠️ 왼쪽 라벨 열에 **이음매 선**을 둔다(`shadow-[1px_0_0_0_var(--border)]`). 없으면 막대가
 *    그 경계에서 **뚝 잘린 것처럼** 보인다 — 선이 있으면 "여기서부터 가려진다"가 모양으로
 *    드러나 잘린 게 아니라 아래로 이어지는 것으로 읽힌다. 보더가 아니라 그림자인 건
 *    열 폭(`LABEL_COL_PX`)을 1px도 안 건드리려는 것이다.
 */

const TONE_LABEL: Record<StatusTone, string> = {
  DELAYED: ACTION_DELAYED_LABEL,
  IN_PROGRESS: ACTION_STATUS_LABEL[ACTION_STATUS.IN_PROGRESS],
  TODO: ACTION_STATUS_LABEL[ACTION_STATUS.TODO],
  DONE: ACTION_STATUS_LABEL[ACTION_STATUS.DONE],
};

/** 상태점(좌측 열) — `StatusDot`과 같은 색 셋. */
const DOT_CLASS: Record<StatusTone, string> = {
  DELAYED: "bg-destructive",
  IN_PROGRESS: "bg-status-progress",
  TODO: "bg-status-todo",
  DONE: "bg-status-done",
};

/**
 * 기간 바 배경·테두리·글자 — **상태점과 같은 색 셋**이다(DESIGN §5: 할 일 회색 · 진행중 초록 ·
 * 완료 보라 · 지연 빨강).
 *
 * ⚠️ **완료가 회색이었다.** 할 일과 같은 색이라 막대만 봐서는 끝난 것과 아직 안 한 것이
 *    구분되지 않았다 — 왼쪽 점은 보라인데 막대는 회색이라 같은 줄이 두 말을 했다.
 * ⚠️ 바탕은 옅게(12%), 글자는 진하게 둔다. 막대 위에 `D-12` 같은 글자가 얹히므로 단색으로
 *    채우면 글자가 안 읽힌다 — 채도가 아니라 **명도**로 상태를 가른다.
 */
const BAR_CLASS: Record<StatusTone, string> = {
  DELAYED: "border-destructive/30 bg-destructive/10 text-destructive",
  // ⚠️ 점·캡과 **같은 토큰**을 쓴다. `--success`와 `--status-progress`는 지금 값이 같을 뿐
  //    각각 따로 선언된 별개 토큰이라, 막대만 `success`로 두면 한쪽만 조정되는 날 갈린다.
  IN_PROGRESS: "border-status-progress/40 bg-status-progress/12 text-status-progress",
  TODO: "border-border bg-foreground/[0.06] text-muted-foreground",
  DONE: "border-status-done/35 bg-status-done/12 text-status-done",
};

/** 마감 지점 캡 — 막대 오른쪽 끝을 같은 색으로 못박는다(어디서 끝나는지가 이 표의 요점이다). */
const CAP_CLASS: Record<StatusTone, string> = {
  DELAYED: "bg-destructive",
  IN_PROGRESS: "bg-status-progress",
  TODO: "bg-muted-foreground",
  DONE: "bg-status-done",
};

/** 기간 바(또는 href 없을 때의 비클릭 바) 공통 클래스. */
function barClassName(tone: StatusTone): string {
  return cn(
    "absolute top-1/2 flex h-[22px] min-w-[42px] -translate-y-1/2 items-center justify-end rounded border pr-2 text-[11px] font-semibold tabular-nums",
    BAR_CLASS[tone],
  );
}

/**
 * 하위 진척을 그릴 줄인지 판정 — **`null`과 `0/0`은 다른 뜻이다**(BE #355 주석, #421).
 *
 * - `null` / 필드 없음 = **하위라는 개념 자체가 없는 줄**(개인 액션·인수인계 보드 등)
 *   → 아무것도 안 그린다. 이 타임라인은 여러 화면이 같이 쓰는데, 팀 액션 말고는
 *   값을 안 넘기므로 그쪽은 자동으로 조용하다.
 * - `0/0` = **하위를 가질 수 있는데 아직 비어 있음**(아직 안 쪼갠 팀 액션) → `0/0`으로 그린다.
 *
 * ⚠️ 둘을 `!count`로 한데 묶어 거르면 "아직 안 쪼갠 팀 액션"이 "하위가 없는 줄"처럼
 *    사라져 화면이 사실을 덜 말하게 된다(DESIGN §9 — 화면은 사실만 말한다).
 * ⚠️ `0/0`에 `없음` 같은 말을 따로 붙이지 않는다. 문구를 만들면 **안 그리는 `null`과
 *    화면에서 구분이 안 되고**, 숫자 자리에 글자가 섞여 줄 폭도 흔들린다.
 */
function hasChildProgress(
  bar: TimelineBar,
): bar is TimelineBar & { childDoneCount: number; childTotalCount: number } {
  return typeof bar.childDoneCount === "number" && typeof bar.childTotalCount === "number";
}

function barAriaLabel(bar: TimelineBar): string {
  const base = `${bar.title}, ${bar.tag}, ${TONE_LABEL[bar.tone]}, ${bar.ddayLabel}, ${bar.periodLabel}`;
  /*
    ⚠️ 행이 `Link`면 `aria-label`이 **안쪽 글자를 통째로 덮는다** — 진척 숫자를 span으로만
       두면 스크린리더는 영영 못 듣는다. 뜻을 폭·명도에 담지 않고 여기에도 적는다(§a11y).
  */
  return hasChildProgress(bar)
    ? `${base}, 하위 액션 ${bar.childTotalCount}개 중 ${bar.childDoneCount}개 완료`
    : base;
}

/**
 * 하위 개인 액션 진척 — **막대가 아니라 숫자다**(`3/5`).
 *
 * ⚠️ 왼쪽 열은 200px(`LABEL_COL_PX`)뿐인데 점·액션명·태그 칩이 이미 서 있다. 막대를 더
 *    얹으면 액션명 자리가 50px대로 눌려 정작 무슨 액션인지가 안 읽힌다. 행 높이(44px)를
 *    안 늘리기로 했으니 아래로 쌓을 수도 없다 — DESIGN §10이 "얼마나 찼나"에 막대를
 *    허용하긴 하지만, **이 칸이 그걸 감당 못 한다**. 숫자는 20px 남짓이고 값 자체가 정확하다.
 * ⚠️ 색을 안 쓴다 — 완료 수만 `foreground`, 나머지는 `muted-foreground`로 **명도**가 가른다
 *    (DESIGN §5: 색으로 알리는 건 에러뿐 / §10: 조각은 색이 아니라 명도로).
 * ⚠️ 숫자라 `tabular-nums`다(DESIGN §4) — 없으면 `9/10`으로 넘어갈 때 칩이 좌우로 흔들린다.
 */
function ChildProgress({ done, total }: { done: number; total: number }) {
  return (
    <span className="shrink-0 text-[11px] leading-4 tabular-nums">
      <span className="text-foreground font-semibold">{done}</span>
      <span className="text-muted-foreground">/{total}</span>
    </span>
  );
}

/** 마감 지점 캡 — Link·div 양쪽에서 같이 쓴다. */
function BarCap({ tone }: { tone: StatusTone }) {
  return (
    <span
      className={cn("absolute inset-y-0 right-0 w-[3px] rounded-r", CAP_CLASS[tone])}
      aria-hidden
    />
  );
}

/** 축 날짜 색 — 오늘은 파랑 대신 먹색 볼드(토요일 파랑과 안 겹치게) · 토=파랑 · 일=빨강. */
function dayToneClass(day: TimelineDay): string {
  if (day.isToday) return "text-foreground font-bold";
  if (day.isSaturday) return "text-primary";
  if (day.isSunday) return "text-destructive";
  return "text-muted-foreground";
}

/**
 * 왼쪽 아이템 열 폭 — 축 머리·그리드·행이 같은 값을 공유한다. 스크롤 중에도 고정(sticky).
 *
 * ⚠️ **200 → 224로 넓혔다**(#421). 하위 진척(`3/5`)이 칩 뒤에 붙으면서 200px에서는 액션명
 *    자리가 72px밖에 안 남아 `협업툴 리뉴얼 착수`가 `협업툴 리뉴...`로 잘렸다 — 이 열의
 *    요점은 **무슨 액션인지**라, 보조 숫자를 넣겠다고 이름을 깎으면 앞뒤가 바뀐다.
 *    24px(8의 배수)면 목의 액션명이 전부 들어간다. 타임라인 쪽은 어차피 가로 스크롤이라
 *    잃는 게 없고, 이 열을 함께 쓰는 다른 화면(대시보드·프로젝트 상세·인수인계 보드)도
 *    이름이 더 보일 뿐 손해가 없다.
 */
const LABEL_COL_PX = 224;
const LABEL_COL_STYLE = { width: LABEL_COL_PX, minWidth: LABEL_COL_PX };
/** 행 높이(px) — 그리드 오버레이 높이 계산에 쓴다(행 수 × 이 값). */
const ROW_HEIGHT_PX = 44;

interface ActionTimelineProps {
  items: TimelineActionInput[];
  /** 오늘(서버 렌더 시각). 축 기준점. */
  today: Date;
  /** 비었을 때 문구 */
  emptyLabel?: string;
  /** 비었을 때 아이콘 — 무엇이 안 하달됐는지 가리킨다(기본: 액션) */
  emptyIcon?: LucideIcon;
}

export function ActionTimeline({
  items,
  today,
  emptyLabel = "표시할 액션이 없습니다.",
  emptyIcon = ListChecks,
}: ActionTimelineProps) {
  const model = buildActionTimeline(items, today);

  if (!model) {
    /*
      ⚠️ **카드를 채운다**(2026-08-11). 회색 글씨 한 줄만 남겨 두니 제목 바로 밑에서 카드가
         뚝 끊겨, 아직 안 그려진 화면처럼 보였다 — 빈 상태도 화면이다(§3상태).
    */
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyLabel}
        /* ⚠️ 여러 화면이 함께 쓰는 자리라 **어느 도메인에도 치우치지 않는 말**을 쓴다 —
           `회의에서 하달되면`은 인수인계·마이페이지에서는 맞지 않는 설명이었다(코드래빗 지적) */
        description="액션이 생기면 이 자리에 기간 막대로 쌓입니다."
        className="flex-1"
      />
    );
  }

  const { days, bars, todayLeftPx, totalWidthPx, monthLabel } = model;
  const gridHeightPx = bars.length * ROW_HEIGHT_PX;

  return (
    <div className="scrollbar-hidden min-h-0 flex-1 overflow-auto">
      <div className="relative" style={{ minWidth: LABEL_COL_PX + totalWidthPx }}>
        {/* 날짜 축 — 세로 스크롤 중에도 위에 고정. z는 아래 그리드(0)·행(20)보다 항상 높게(30) */}
        {/*
          ⚠️ 날짜 축에 **머리 띠**를 깐다(DESIGN §3, 표 머리와 같은 결). 카드 제목과 같은 흰
             바탕이면 둘이 한 덩어리로 붙어, 위에 있는 제목이 "머리"가 아니라 첫 줄로 읽혔다.
          ⚠️ 띠 색은 **불투명이어야 한다.** `bg-secondary/50`처럼 알파가 섞인 값을 쓰면 왼쪽
             라벨 칸(`sticky left-0`)이 반투명이 되어, 가로로 스크롤할 때 **뒤로 지나가는 날짜가
             라벨 위로 비친다**(`7~9월` 위에 `토 8`이 겹쳐 보였다). 같은 색을 `color-mix`로
             섞어 불투명하게 만든다 — 라이트·다크 모두 토큰에서 나온다.
          ⚠️ 글자는 11px(힌트 규격)다. 10.5px은 다섯 크기에 없는 값이었다.
        */}
        <div className="border-border sticky top-0 z-30 flex border-b bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))] text-[11px] leading-4">
          {/*
            ⚠️ `self-stretch` + 내부 `items-end`로 라벨이 헤더 전체 높이를 채운다 — `self-end`(짧은
            박스)만 쓰면 라벨 위쪽 몇 px가 이 칸의 배경으로 안 덮여서, 가로 스크롤로 지나가는 날짜
            칸이 그 틈으로 살짝 비친다(2026-08-06에 실제로 겪은 버그).
          */}
          <div
            className="sticky left-0 z-10 flex shrink-0 items-end self-stretch bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))] px-3 pb-1.5"
            style={LABEL_COL_STYLE}
          >
            <span className="text-muted-foreground">{monthLabel}</span>
          </div>
          <div className="flex bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))]">
            {days.map((day) => (
              <div
                key={day.iso}
                className={cn("shrink-0 py-1.5 text-center leading-tight", dayToneClass(day))}
                style={{ width: TIMELINE_DAY_WIDTH_PX }}
              >
                <span className="block">{day.isToday ? "오늘" : day.weekday}</span>
                <span className="block font-semibold tabular-nums">{day.dayOfMonth}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 행 묶음 — 그리드 오버레이가 이 래퍼 하나에만 딱 맞으면 되니 헤더 높이를 몰라도 된다 */}
        <div className="relative" style={{ height: gridHeightPx }}>
          {/* 배경 그리드·오늘선(뒤) — 항상 행(z-20)보다 아래 */}
          <div className="pointer-events-none absolute inset-0 z-0 flex" aria-hidden>
            <div className="shrink-0" style={LABEL_COL_STYLE} />
            <div className="relative flex" style={{ width: totalWidthPx }}>
              {/*
                ⚠️ 주말 열만 아주 옅게 깐다(2%). 날짜 글자색(토 파랑·일 빨강)만으로는 축을
                   봐야 알 수 있어서, 막대만 훑을 때 한 주가 어디서 끊기는지 안 잡혔다.
                   색이 아니라 **명도**라 뜻을 더하지 않는다(§5: 색으로 알리는 건 에러뿐).
              */}
              {days.map((day) => (
                <div
                  key={day.iso}
                  className={cn(
                    "border-border/55 shrink-0 border-l first:border-l-0",
                    (day.isSaturday || day.isSunday) && "bg-foreground/[0.02]",
                  )}
                  style={{ width: TIMELINE_DAY_WIDTH_PX }}
                />
              ))}
              {/*
                ⚠️ 오늘 선은 **먹색**이다. 파랑(`--primary`)이었는데 축의 토요일 날짜도 파랑이라
                   같은 색이 두 가지를 뜻했다 — 축 색 규칙(오늘=먹색 볼드)과도 앞뒤가 안 맞았다.
                ⚠️ 색으로 알리는 건 에러(빨강)뿐이다(DESIGN §5) — 오늘은 명도로 알린다.
              */}
              <span
                className="bg-foreground/70 absolute inset-y-0 w-0.5 -translate-x-1/2"
                style={{ left: todayLeftPx }}
              />
            </div>
          </div>

          {/* 행들 — 보통 흐름(세로 스크롤은 바깥 컨테이너가 한다) */}
          {bars.map((bar, index) => {
            // ⚠️ 좌측 아이템(제목·칩)과 우측 막대를 한 행으로 묶어 같이 클릭되게 한다 —
            //    막대만 눌리면 클릭 영역이 좁고, 좌측을 눌렀을 때 반응이 없어 헷갈린다.
            const rowContent = (
              <>
                {/* 좌: 상태점 · 액션명 · 칩(호출부마다 뜻 다름 — 태그 또는 팀명) */}
                <div
                  className="bg-card sticky left-0 z-10 flex min-w-0 shrink-0 items-center gap-2 px-3 shadow-[1px_0_0_0_var(--border)]"
                  style={LABEL_COL_STYLE}
                >
                  <span
                    className={cn("size-1.5 shrink-0 rounded-full", DOT_CLASS[bar.tone])}
                    aria-hidden
                  />
                  <span className="min-w-0 truncate text-[13px]">{bar.title}</span>
                  <span
                    className="shrink-0 rounded px-1.5 py-px text-[11px] leading-4 font-medium"
                    style={{ backgroundColor: bar.tagBgColor, color: bar.tagTextColor }}
                  >
                    {bar.tag}
                  </span>
                  {/*
                    하위 진척은 **칩 뒤 맨 끝**에 붙인다 — 줄마다 같은 자리에 서야 여러 줄을
                    세로로 훑을 때 눈이 안 흔들린다. 없는 줄은 그 자리가 비고, 액션명이
                    그만큼 더 보인다(자리를 비워 두지 않는다 — 빈 칸을 남기면 200px이 더 준다).
                  */}
                  {hasChildProgress(bar) ? (
                    <ChildProgress done={bar.childDoneCount} total={bar.childTotalCount} />
                  ) : null}
                </div>

                {/* 우: 기간 바 */}
                <div className="relative" style={{ width: totalWidthPx }}>
                  <div
                    aria-hidden
                    className={barClassName(bar.tone)}
                    style={{ left: bar.leftPx, width: bar.widthPx }}
                  >
                    {bar.ddayLabel}
                    <BarCap tone={bar.tone} />
                  </div>
                </div>
              </>
            );

            const rowClassName = cn(
              "border-border relative flex items-stretch",
              index > 0 && "border-t",
              bar.href && "transition-colors hover:bg-foreground/[0.03]",
            );

            /*
              ⚠️ 상세 라우트가 없으면(`href` 없음) 클릭 안 되는 행으로만 표시한다.
              ⚠️ 이때도 `role="group"`을 준다 — 맨 `div`는 암묵 역할이 `generic`이라
                 **`aria-label`이 접근 가능한 이름으로 안 나간다**(ARIA: generic은 이름을
                 못 가진다). 막대는 `aria-hidden`이라, 이름이 날아가면 상태·D-day·기간·하위
                 진척이 스크린리더에 통째로 안 들린다 — 링크 행은 들리고 이 행만 안 들리면
                 같은 표가 줄마다 다른 말을 한다(§a11y).
            */
            return bar.href ? (
              <Link
                key={bar.id}
                href={bar.href}
                aria-label={barAriaLabel(bar)}
                className={rowClassName}
                style={{ height: ROW_HEIGHT_PX }}
              >
                {rowContent}
              </Link>
            ) : (
              <div
                key={bar.id}
                role="group"
                aria-label={barAriaLabel(bar)}
                className={rowClassName}
                style={{ height: ROW_HEIGHT_PX }}
              >
                {rowContent}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** 축과 짝이 되는 범례 — 카드 헤더 우측에 둔다(색=상태 의미를 한 줄로). */
export function ActionTimelineLegend() {
  /*
    ⚠️ **완료도 적는다.** 막대에 네 가지 색이 나오는데 범례가 셋뿐이라, 보라 막대만 무슨
       뜻인지 화면에 없었다 — 색을 쓰면 그 색이 무엇인지도 같이 적어야 한다.
    ⚠️ 순서는 상태가 흐르는 순서다(할 일 → 진행중 → 완료), 지연은 그 흐름 밖이라 끝에 둔다.
  */
  const legend: { tone: StatusTone; label: string }[] = [
    { tone: "TODO", label: TONE_LABEL.TODO },
    { tone: "IN_PROGRESS", label: TONE_LABEL.IN_PROGRESS },
    { tone: "DONE", label: TONE_LABEL.DONE },
    { tone: "DELAYED", label: TONE_LABEL.DELAYED },
  ];

  return (
    <div className="text-muted-foreground flex items-center gap-3 text-[12px] leading-4">
      {legend.map(({ tone, label }) => (
        <span key={tone} className="flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full", DOT_CLASS[tone])} aria-hidden />
          {label}
        </span>
      ))}
    </div>
  );
}
