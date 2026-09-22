import {
  CALENDAR_STATUS_DOT_COLOR,
  CALENDAR_TAG_DOT_COLOR,
  CALENDAR_TODO_LEGEND_SWATCH,
} from "../tag-colors";
import { CALENDAR_ITEM_TAG } from "../types";

interface LegendItem {
  label: string;
  /** 콩(dot)에 그대로 얹는 배경 — 단색은 `backgroundColor`, Todo처럼 여러 색이면 `background`(그레이디언트). */
  swatchStyle: { backgroundColor: string } | { background: string };
}

/**
 * ⚠️ 라벨은 일부러 `CALENDAR_ITEM_TAG_LABEL`("개인 Todo")과 다르다 — 범례는 "Todo"로 짧게 쓰기로
 *    확정했다(2026-08-05). 색만 `tag-colors.ts`로 공유하고 라벨 문구는 여기서 따로 관리한다.
 * ⚠️ **Todo는 콩이 아니라 색동 원이다**(2026-08-14) — 제목마다 색이 달라져서 콩 하나로는
 *    "이 색"을 보여줄 수 없다. 실제로 나올 수 있는 색 풀 전체를 원으로 둘러 "색이 다양하게
 *    나온다"는 사실만 알린다. 개인 액션은 여전히 fuchsia 고정이라 콩 그대로 둔다.
 */
const TAG_ITEMS: LegendItem[] = [
  { label: "Todo", swatchStyle: { background: CALENDAR_TODO_LEGEND_SWATCH } },
  {
    label: "개인 액션",
    swatchStyle: { backgroundColor: CALENDAR_TAG_DOT_COLOR[CALENDAR_ITEM_TAG.PERSONAL_ACTION] },
  },
];

const STATUS_ITEMS: LegendItem[] = [
  { label: "진행중", swatchStyle: { backgroundColor: CALENDAR_STATUS_DOT_COLOR.IN_PROGRESS } },
  { label: "완료", swatchStyle: { backgroundColor: CALENDAR_STATUS_DOT_COLOR.DONE } },
];

function LegendGroup({ items }: { items: readonly LegendItem[] }) {
  return (
    <ul className="flex items-center gap-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 shrink-0 rounded-full" style={item.swatchStyle} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * 달력이 쓰는 **두 가지 말**을 한 줄로 가르쳐 준다.
 *
 * ⚠️ **콩 넷이 전부다.** 앞의 둘은 무엇인지(Todo·액션), 뒤의 둘은 어디까지 됐는지(진행중·완료).
 *    한때 뒤쪽을 "채운 칩 / 테두리 칩"이라는 **모양**으로 가르쳤는데, 그 칩을 태그 색으로
 *    그리는 바람에 "Todo"와 "진행중"이 같은 파랑이 되어 **색이 무엇을 가리키는지 알 수 없었다.**
 *    색벌을 둘로 가른 지금은 콩 넷으로 충분하고, 칸의 칩과도 그대로 이어진다(칩 앞의 콩이 이것이다).
 * ⚠️ 둘은 성격이 다르므로 **세로선으로 가른다.** 넷을 같은 간격으로 늘어놓으면 색과 상태가
 *    한 무리로 읽혀 서로 짝인 줄 안다.
 */
export function CalendarLegend() {
  return (
    <div className="text-muted-foreground flex items-center gap-3 text-[11px] leading-4">
      <LegendGroup items={TAG_ITEMS} />
      <span className="bg-border h-3 w-px shrink-0" aria-hidden />
      <LegendGroup items={STATUS_ITEMS} />
    </div>
  );
}
