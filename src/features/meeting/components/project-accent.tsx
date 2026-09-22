import { pickPaletteColor } from "@/lib/palette";

/**
 * 카드 위쪽의 프로젝트 띠 — **목록과 상세가 같은 것을 쓴다.**
 *
 * ⚠️ 두 화면이 각자 그리고 있었더니 상세에는 아예 띠가 없어서, 목록에서 색으로 프로젝트를
 *    알아보고 들어온 사람이 상세에서 그 단서를 잃었다 — 같은 회의인지 확인할 방법이 없다.
 * ⚠️ 세로 띠는 둥근 모서리에서 잘려 보여 가로로 눕혔다. 감싸는 카드에 `overflow-hidden`이
 *    있어야 모서리를 따라 잘린다.
 * ⚠️ 색은 **이름에서 나온다**(`pickPaletteColor`) — 어느 화면에서든 같은 프로젝트는 같은 색이다.
 */
export function ProjectAccent({ tag }: { tag: string }) {
  const color = pickPaletteColor(tag);
  return (
    <span
      className="absolute inset-x-0 top-0 h-1"
      style={{ backgroundColor: color.solidColor }}
      aria-hidden
    />
  );
}
