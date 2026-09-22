import { type PaletteColor, pickPaletteColor, TAG_NAMES } from "@/lib/palette";

import { CALENDAR_ITEM_TAG, type CalendarItemTag } from "./types";

/**
 * 태그별 색 — **공용 팔레트에서 가져온다**(DESIGN §5).
 *
 * ⚠️ 예전에는 `--calendar-todo`(#166534)·`--calendar-action`(#6d28d9)이라는 이 화면 전용
 *    값이었다. 팔레트 밖 색이라 프로젝트 태그·상태점 옆에 놓이면 같은 무리인지 알 수 없었고,
 *    진한 원색이라 셀을 칠하면 화면이 무거웠다.
 * ⚠️ **개인 액션은 fuchsia 고정.** 개인 Todo는 **제목마다 색이 달라진다**(2026-08-14,
 *    `getTodoTitleColor` 참고) — 항목이 많아질 때 색만으로도 서로 다른 일임을 구분하기
 *    쉽게 하려는 것이다. `CALENDAR_TAG_BG`/`FG`의 `PERSONAL_TODO` 값은 그 함수를 못 쓰는
 *    자리(예: 아직 제목이 없는 자리)를 위한 **기본값**으로만 남는다.
 * ⚠️ **PROJECT도 같은 이유로 프로젝트 태그마다 색이 갈린다**(`getProjectTagColor`) — 프로젝트
 *    목록(`project-list-table.tsx`)과 **같은 팔레트·같은 해시 규칙**(`pickPaletteColor`)을 써서,
 *    같은 프로젝트는 캘린더에서도 목록에서도 같은 색으로 보인다. `CALENDAR_TAG_BG`/`FG`/
 *    `DOT_COLOR`의 `PROJECT` 값은 태그 문자열이 없는 자리를 위한 기본값이다.
 * ⚠️ 빨강 계열은 피한다 — 우리 빨강은 **에러 전용**이라 일정 색으로 쓰면 뜻이 섞인다.
 *    fuchsia는 분홍이되 빨강 쪽으로 넘어가지 않는 자리다.
 * ⚠️ **벌을 섞지 않는다**(§5). 글자가 얹히는 칩은 `bg`+`fg` 한 벌, 글자가 없는 점은 `solid`다.
 *    섞으면 대비가 무너진다.
 */

/** 칩 배경 — 옅다(파스텔). 다크에서는 어두운 쪽으로 뒤집힌다 */
export const CALENDAR_TAG_BG: Record<CalendarItemTag, string> = {
  [CALENDAR_ITEM_TAG.PERSONAL_TODO]: "var(--tag-sky-bg)",
  [CALENDAR_ITEM_TAG.PERSONAL_ACTION]: "var(--tag-fuchsia-bg)",
  [CALENDAR_ITEM_TAG.PROJECT]: "var(--tag-slate-bg)",
};

/** 그 칩 **위의 글자** — 같은 벌이라 대비가 보장된다 */
export const CALENDAR_TAG_FG: Record<CalendarItemTag, string> = {
  [CALENDAR_ITEM_TAG.PERSONAL_TODO]: "var(--tag-sky-fg)",
  [CALENDAR_ITEM_TAG.PERSONAL_ACTION]: "var(--tag-fuchsia-fg)",
  [CALENDAR_ITEM_TAG.PROJECT]: "var(--tag-slate-fg)",
};

/**
 * 글자가 안 얹히는 점·막대용 원색(600단계).
 * 범례(`calendar-legend.tsx`)와 일정 목록의 점이 쓴다.
 */
export const CALENDAR_TAG_DOT_COLOR: Record<CalendarItemTag, string> = {
  [CALENDAR_ITEM_TAG.PERSONAL_TODO]: "var(--tag-sky-solid)",
  [CALENDAR_ITEM_TAG.PERSONAL_ACTION]: "var(--tag-fuchsia-solid)",
  [CALENDAR_ITEM_TAG.PROJECT]: "var(--tag-slate-solid)",
};

/**
 * 개인 Todo 제목에서 색을 뽑는다 — **아바타·프로젝트 태그와 같은 팔레트**(`lib/palette`)다.
 *
 * ⚠️ 왜 제목으로 거는가. Todo는 회의처럼 담당자·프로젝트가 따로 없어 색을 걸 다른 축이
 *    없다 — 그나마 화면에 늘 보이는 값이 제목이라, 같은 제목은 같은 색이 나오게 해서
 *    "그 파란 항목"처럼 색으로도 기억할 수 있게 한다.
 * ⚠️ 무작위가 아니다(`pickPaletteColor`가 해시로 고른다) — 새로고침해도 색이 안 바뀐다.
 */
export function getTodoTitleColor(title: string): PaletteColor {
  return pickPaletteColor(title);
}

/**
 * 프로젝트 태그에서 색을 뽑는다 — 프로젝트 목록(`project-list-table.tsx`)과 **같은 팔레트·
 * 같은 해시 규칙**이라 캘린더와 목록 어디서 봐도 그 프로젝트는 같은 색이다.
 */
export function getProjectTagColor(tag: string): PaletteColor {
  return pickPaletteColor(tag);
}

/**
 * 범례의 Todo 콩 — 제목마다 색이 달라지니 콩 하나로는 "이 색"을 못 보여준다. 실제로 나올 수
 * 있는 색 풀(`TAG_NAMES`, 팔레트 순서 그대로)을 색동 원(conic-gradient)으로 둘러 보여준다.
 *
 * ⚠️ **경계를 부드럽게 잇는다**(2026-08-11). 색마다 딱 끊어 붙였더니 11조각짜리 **파이 차트**처럼
 *    보였다 — 각 조각이 뜻을 가진 것으로 읽혀서, "색이 여러 개 나온다"는 한마디를 하려던 콩이
 *    도표가 됐다. 조각을 겹쳐 잇는 순간 그냥 **무지개 원**이 되어 뜻을 안 만든다.
 * ⚠️ 각 색을 자기 구간의 **가운데에만** 못 박고 사이를 브라우저가 섞게 둔다. 시작·끝을 같은
 *    색으로 닫아야 12시 자리에서 이음매가 안 보인다.
 * ⚠️ 팔레트가 늘거나 순서가 바뀌면 이 원도 자동으로 따라간다 — 색을 여기 따로 옮겨 적지 않는다.
 */
const TODO_LEGEND_STOPS = [
  ...TAG_NAMES.map((name, index) => {
    const midpoint = ((index + 0.5) / TAG_NAMES.length) * 360;
    return `var(--tag-${name}-solid) ${midpoint.toFixed(2)}deg`;
  }),
  /* 한 바퀴를 첫 색으로 닫는다 — 안 닫으면 12시에 마지막 색과 첫 색이 맞부딪혀 선이 생긴다 */
  `var(--tag-${TAG_NAMES[0]}-solid) 360deg`,
];

export const CALENDAR_TODO_LEGEND_SWATCH = `conic-gradient(from 0deg, var(--tag-${TAG_NAMES[0]}-solid) 0deg, ${TODO_LEGEND_STOPS.join(", ")})`;

/**
 * **진행 상태**의 색 — 태그 색과 **완전히 다른 벌**이다.
 *
 * ⚠️ 색이 총 넷이다: 무엇인지는 sky·fuchsia, 어디까지 됐는지는 **teal·slate**.
 *    한때 상태까지 태그 색으로 그렸는데, 그러면 "Todo"와 "진행중"이 같은 파랑이라
 *    **색이 무엇을 가리키는지 알 수 없었다** — 두 축은 색벌도 갈라야 축이 된다.
 * ⚠️ teal(진행중)·slate(완료)다. emerald는 sky 옆에서 탁했고 amber는 갈색으로 읽혔다.
 *    teal은 sky와 이웃이라 **채도로 갈린다** — 그래서 태그 콩과 상태 콩을 **구분선으로
 *    떼어 놓는 배치**가 전제다(`calendar-event-list-item.tsx`). 둘을 붙여 놓으면 헷갈린다.
 * ⚠️ 끝난 일은 무채색(slate)으로 물러난다 — 남은 일이 먼저 눈에 들어와야 한다.
 * ⚠️ 빨강은 안 쓴다 — 우리 빨강은 **에러 전용**이다(DESIGN §5).
 */
export const CALENDAR_STATUS_DOT_COLOR = {
  IN_PROGRESS: "var(--tag-teal-solid)",
  DONE: "var(--tag-slate-solid)",
} as const;

/** 완료 여부로 상태 색을 고른다 — 부르는 쪽이 삼항을 두 번 쓰지 않게. */
export function calendarStatusDotColor(isCompleted: boolean): string {
  return isCompleted ? CALENDAR_STATUS_DOT_COLOR.DONE : CALENDAR_STATUS_DOT_COLOR.IN_PROGRESS;
}
