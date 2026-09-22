import { paletteColorByName, pickPaletteColor, type TagColorName } from "@/lib/palette";
import { cn } from "@/lib/utils";

/**
 * 프로젝트 태그 칩 — **한 곳에서 만든다.**
 *
 * ⚠️ 전에는 같은 마크업(`rounded px-1.5 py-px text-[11px]` + 인라인 색)이 **열일곱 파일**에
 *    흩어져 있었다. 한 군데를 다듬으면 나머지가 그대로 남아, 같은 태그가 화면마다 다른
 *    모양으로 떴다 — 칩은 프로젝트를 알아보는 표식이라 모양이 흔들리면 표식 노릇을 못 한다.
 * ⚠️ **색은 저장된 팔레트 이름**(`color` prop)이 정하고, 없으면 태그 이름 해시로 떨어진다
 *    (`pickPaletteColor`). 프로젝트 목록·상세는 BE가 저장한 색을 매퍼가 옮기니 `color`를
 *    넘긴다 — 회의·액션 응답에는 프로젝트 색이 없어 그 자리에서만 해시로 배정한다.
 * ⚠️ 색은 **구분용이지 알림용이 아니다**(§palette). 그래서 테두리를 진하게 두르거나 그림자를
 *    얹지 않는다 — 상태 배지처럼 보이면 뜻이 있는 것처럼 읽힌다.
 */

/** 칩 크기 — 목록·본문에 섞여 드는 기본과, 제목 옆에 서는 큰 것 */
type ProjectTagSize = "sm" | "md";

const SIZE_CLASS: Record<ProjectTagSize, string> = {
  /*
    ⚠️ 11px는 다섯 글자 크기의 막내다(DESIGN §4). 더 줄이면 규격 밖이고, 태그는 본문보다
       작아야 글이 먼저 읽힌다.
  */
  sm: "h-[18px] px-1.5 text-[11px]",
  md: "h-[22px] px-2 text-[12px]",
};

interface ProjectTagProps {
  tag: string;
  /**
   * 저장된 팔레트 이름 — 있으면 이걸 쓰고, 없으면 태그 이름 해시로 떨어진다.
   * ⚠️ 색을 안 주는 경로가 아직 남아 있다(회의·액션 응답에는 프로젝트 색이 없다).
   *    그때는 해시로 배정해 같은 태그가 같은 색을 얻는다(같은 프로젝트가 화면마다 다른
   *    표식으로 보이는 것보다 낫다).
   */
  color?: TagColorName;
  size?: ProjectTagSize;
  className?: string;
}

export function ProjectTag({ tag, color: colorName, size = "sm", className }: ProjectTagProps) {
  const color = colorName ? paletteColorByName(colorName) : pickPaletteColor(tag);

  return (
    <span
      className={cn(
        /*
          ⚠️ **모서리를 완전히 둥글리지 않는다**(`rounded-md`). 알약 모양은 상태 배지가 쓰는
             생김새라(예정·진행중·완료), 태그까지 그러면 둘이 같은 종류로 보인다.
          ⚠️ **높이를 고정한다.** 줄마다 글자 길이가 달라도 칩 높이가 같아야 목록을 위아래로
             훑을 때 줄이 흔들리지 않는다.
          ⚠️ 안쪽 테두리(`inset-ring`)는 **같은 색을 옅게** 쓴다. 배경만 있으면 밝은 팔레트
             (옐로우·라임)에서 카드와 경계가 사라져 글자가 떠 있는 것처럼 보인다.
        */
        "inline-flex w-fit shrink-0 items-center justify-center rounded-md font-medium",
        "tracking-[-0.1px] whitespace-nowrap inset-ring inset-ring-current/15",
        SIZE_CLASS[size],
        className,
      )}
      style={{ backgroundColor: color.bgColor, color: color.textColor }}
    >
      {tag}
    </span>
  );
}
