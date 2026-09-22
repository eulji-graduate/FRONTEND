import { pickPaletteColor } from "@/lib/palette";

import type { SearchRecentViewItem } from "../types";
import { KindBadge } from "./kind-badge";
import { RecordViewLink } from "./record-view-link";
import { SearchSection } from "./search-section";

interface RecentlyViewedGridProps {
  items: SearchRecentViewItem[];
}

/**
 * 최근 본 항목 — 2열 카드. 순수 표시(+ 프로젝트만 이동)라 서버에서 그린다.
 *
 * ⚠️ **프로젝트만 링크다.** 회의·액션·사람 상세 화면 경로가 아직 이 목의 id 체계로
 *    안 정해져 있다 — 안 되는 이동을 만드느니 지금은 정보만 보여준다
 *    (§명세에 없는 기능은 안 만든다). 정해지면 실제 경로로 이어 붙인다.
 */
export function RecentlyViewedGrid({ items }: RecentlyViewedGridProps) {
  if (items.length === 0) return null;

  return (
    <SearchSection title="최근 본 항목" meta={`${items.length}건`}>
      {/*
        ⚠️ **한 줄에 하나씩 쌓는다**(2026-08-10 바꿈). 두 칸 격자로 두니 제목 길이가 제각각인
           카드 넷이 어긋나 보였고, 아래 `프로젝트로 찾기`·`사람으로 찾기`가 이미 낱장 목록이라
           이 덩이만 격자여서 화면 안에서 혼자 놀았다 — 같은 화면은 같은 결로 읽혀야 한다.
        ⚠️ 대신 **한 줄로 눕힌다.** 세로로 쌓기만 하면 넷이 화면을 길게 끌므로, 제목·태그·
           보조값을 한 줄에 세워 줄 높이를 낮춘다(대시보드 회의 줄과 같은 결).
      */}
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <RecentlyViewedCard item={item} />
          </li>
        ))}
      </ul>
    </SearchSection>
  );
}

interface RecentlyViewedCardProps {
  item: SearchRecentViewItem;
}

function RecentlyViewedCard({ item }: RecentlyViewedCardProps) {
  /*
    ⚠️ **이 API는 프로젝트 태그를 안 준다**(`GET /search/overview`의 `recentItems`는
       `{ type, id, title, meta }`뿐). 태그별 색 대신 `search-result-row.tsx`의 사람 항목과
       같은 규칙 — **자기 id로 고른 색**을 막대에 쓴다(`use-profile-avatar`와 같은 키 규칙).
  */
  const inner = (
    <>
      <span
        /* ⚠️ `h-full`은 부모 높이가 auto라 0이 된다 — 늘어나야 하므로 `self-stretch`다 */
        className="w-1 shrink-0 self-stretch rounded-full"
        style={{ backgroundColor: pickPaletteColor(String(item.id)).solidColor }}
        aria-hidden
      />
      <KindBadge kind={item.kind} />
      {/*
        ⚠️ **줄어들 수 있어야 말줄임이 듣는다**(2026-08-10 리뷰). `shrink-0 truncate`는 서로
           어긋나는 조합이라 — 못 줄이는 상자에는 넘칠 일이 없으니 `truncate`가 아무 일도
           안 한다 — 긴 제목이 그대로 카드를 밀고 나갔다. 줄어드는 쪽은 제목이다.
      */}
      <span className="text-foreground min-w-0 truncate text-[13px] leading-5 font-semibold">
        {item.title}
      </span>
      {/*
        ⚠️ **제목 뒤에 이어 붙인다.** 오른쪽 끝에 고정 열로 세워 봤더니 제목과 너무 멀어
           한 줄인데 두 덩이로 읽혔다 — 눈이 가운데 빈 자리를 건너뛰어야 했다.
        ⚠️ `meta`는 BE가 이미 조합해 내려준 한 줄이다 — 여기서 더 쪼개지 않는다.
      */}
      {item.meta && (
        <span className="text-muted-foreground min-w-0 truncate text-[12px] leading-4">
          {item.meta}
        </span>
      )}
    </>
  );

  /*
    ⚠️ **항목이 스스로 카드다.** 한때 바깥에 카드를 하나 더 두르고 이 안쪽은 면으로만
       갈랐는데(카드 안의 카드 금지 — §DESIGN 2), 바깥 카드를 걷어내면서 여기가 카드가 됐다.
       그래서 테두리·바탕(`bg-card`)이 다시 있다. 그림자는 `.app-shell .bg-card`가 얕게 깐다.
    ⚠️ 라운드는 `rounded-xl`(14px)이다. `2xl`(18px)은 화면을 나누는 **큰 카드**의 값이고,
       이건 그 안에 줄지어 서는 작은 카드라 한 단계 작다.
    ⚠️ 색 막대가 위아래로 꽉 차야 표식이 되므로 `items-stretch`다 — 가운데 정렬은 안쪽에서 한다.
  */
  const shape =
    "border-border bg-card flex items-stretch gap-2.5 rounded-xl border py-3 pr-4 pl-3 text-[13px] [&>*:not(:first-child)]:self-center";

  if (item.kind === "PROJECT") {
    return (
      <RecordViewLink
        kind="PROJECT"
        itemId={item.id}
        href={`/app/projects/${item.id}`}
        /* ⚠️ 누를 수 있는 것만 면이 짙어진다 — 넷 중 프로젝트 하나만 링크다 */
        className={`${shape} hover:border-foreground/25 transition-colors`}
      >
        {inner}
      </RecordViewLink>
    );
  }

  return <div className={shape}>{inner}</div>;
}
