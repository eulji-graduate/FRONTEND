import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface SystemCardHeadingProps {
  /** 카드가 무엇을 담는지 알리는 표식 — `lucide-react` 표준(CLAUDE.md §디자인 토큰) */
  icon: LucideIcon;
  children: ReactNode;
  /**
   * 제목 줄 오른쪽 끝에 붙는 것 — 이 카드에서 나가는 링크 같은 것.
   *
   * ⚠️ **카드 밖에 띄우지 않는다.** 구독 목록의 "전체 기업 목록 보기"가 카드 아래 허공에
   *    떠 있었는데, 어느 카드에 딸린 것인지 모양으로 알 수 없고 카드 모서리 밖으로
   *    삐져나와 마감이 안 된 것처럼 보였다. 제목과 같은 줄에 두면 무엇에 딸린 링크인지가
   *    분명해진다.
   */
  action?: ReactNode;
}

/**
 * 시스템(운영자) 카드의 제목 줄.
 *
 * ⚠️ **여덟 곳에 같은 문자열이 복사돼 있었다.** 규격(`px-7 pt-6 pb-3`·17px)이 한 벌이라
 *    한 곳이 어긋나면 카드마다 제목 높이가 달라진다 — 한 자리로 모은다.
 * ⚠️ 표식이 **먹색 점**이었다. 카드마다 같은 점이라 아무것도 안 알리고, 화면 전체가
 *    제목만 여덟 줄 늘어선 것처럼 읽혔다. 카드 주제를 가리키는 아이콘으로 바꾼다.
 * ⚠️ **여기서는 한글을 내리지 않는다.** "아이콘 옆 한글은 1px 내린다"를 그대로 적용했더니
 *    오히려 글자가 아이콘보다 **0.78px 아래로** 내려갔다(17px·`leading-7`·`items-center`에서
 *    실측). `items-center`가 이미 줄 상자를 맞춰 주고 있어서, 안 내리면 글자 잉크 중심이
 *    아이콘 중심에서 0.22px 위 — 사실상 정확히 맞는다.
 *    ⚠️ 크기·줄높이가 바뀌면 다시 재야 한다. 저 1px은 어느 조합에서 나온 값이라, 조합이
 *       달라지면 그대로 쓰면 안 된다.
 * ⚠️ 표식만 **액센트(`--chart-1`)로 칠한다.** 차트 막대와 같은 색이라 운영자 화면 전체가
 *    한 벌로 읽힌다 — 여기만 다른 색을 쓰면 액센트가 두 개가 된다.
 *    `--primary`(파랑)는 이 제품에서 안 쓰기로 한 색이라 쓰지 않는다.
 * ⚠️ **글자는 안 칠한다.** 색으로 알리는 건 에러(빨강)뿐이다(CLAUDE.md §디자인 토큰) —
 *    제목까지 물들이면 카드마다 뭔가 알리는 것처럼 읽힌다. 표식은 알림이 아니라 표식이다.
 *    대비는 두 테마 모두 3:1 위다(다크 3.4:1 · 라이트 3.2:1 — 그래픽 기준).
 */
export function SystemCardHeading({ icon: Icon, children, action }: SystemCardHeadingProps) {
  if (!action) {
    return (
      <div className={HEADING_ROW_CLASS}>
        <h2 className={HEADING_CLASS}>{renderTitle(Icon, children)}</h2>
      </div>
    );
  }

  return (
    <div className={`${HEADING_ROW_CLASS} flex items-center justify-between gap-3 pr-7`}>
      <h2 className={HEADING_CLASS}>{renderTitle(Icon, children)}</h2>
      {action}
    </div>
  );
}

const HEADING_CLASS =
  "flex min-w-0 items-center gap-2.5 px-7 pt-4 pb-4 text-[17px] leading-7 font-semibold tracking-[-0.3px]";

/**
 * 표식 상자.
 *
 * ⚠️ 아이콘을 글자 옆에 그냥 두면 **글머리 기호처럼** 읽힌다 — 16px 아이콘과 17px 글자가
 *    크기가 비슷해 같은 줄의 한 글자로 보였다. 상자에 담아 크기와 무게를 주면 글자와
 *    다른 층이 되어, 제목을 가리키는 표식이라는 게 드러난다.
 * ⚠️ 바탕은 **액센트를 아주 옅게** 깐다(10%). 아이콘만 색이면 점 하나가 떠 있는 것 같은데,
 *    상자까지 같은 색조면 표식 하나로 뭉쳐 보인다. 옅어서 색으로 뭘 알리지도 않는다
 *    (알리는 건 에러(빨강)뿐 — CLAUDE.md §디자인 토큰).
 */
const MARK_CLASS = "bg-chart-1/10 flex size-7 shrink-0 items-center justify-center rounded-lg";

/**
 * ⚠️ **제목 줄에 경계선을 둔다.** 여백만으로는 제목이 안 섰다 — 위 24px·아래 23px로 거의
 *    대칭이라, 카드의 머리가 아니라 본문 첫 줄처럼 읽혔다(위아래를 벌려 봐도 마찬가지였다).
 *    선을 그으면 "여기까지가 머리"가 모양으로 정해져서, 아래에 표 머리 띠가 붙든 차트가
 *    붙든 제목이 흔들리지 않는다.
 * ⚠️ 선이 나누는 몫을 하므로 아래 여백은 **줄인다**(`pb-4`). 선 밑 간격은 본문이 정한다 —
 *    표는 머리 띠가 선에 바로 붙는 게 맞고, 차트·목록은 자기 `pt`를 갖는다.
 */
const HEADING_ROW_CLASS = "border-border border-b";

function renderTitle(Icon: LucideIcon, children: ReactNode) {
  return (
    <>
      <span className={MARK_CLASS} aria-hidden>
        <Icon className="text-chart-1 size-[15px]" />
      </span>
      <span className="truncate">{children}</span>
    </>
  );
}
