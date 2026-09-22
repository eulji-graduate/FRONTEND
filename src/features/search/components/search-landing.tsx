import { Info, Search } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { topicParticle } from "@/lib/korean";

import type { SearchHome } from "../types";
import { SEARCH_HOME_SECTION_LABEL } from "../types";
import { BrowsePeople, BrowseProjects } from "./browse-lists";
import { RecentlyViewedGrid } from "./recently-viewed-grid";

interface SearchLandingProps {
  home: SearchHome;
}

/**
 * 서버가 아직 못 주는 칸을 이름으로 말하는 한 문장 — 다 채웠으면 `null`.
 *
 * ⚠️ **빈 목록으로 두면 "아직 없다"는 말이 된다**(§정직성). 최근 본 항목이 안 보이는 이유가
 *    "안 봐서"인지 "못 받아서"인지 화면이 구분해 주지 않으면, 사용자는 자기가 안 본 줄 안다.
 * ⚠️ 조사는 앞말 받침을 보고 고른다 — 어떤 칸이 빠지느냐에 따라 마지막 라벨이 바뀐다(§lib/korean).
 */
function unavailableSentence(sections: SearchHome["unavailable"]): string | null {
  if (sections.length === 0) return null;

  const names = sections.map((section) => SEARCH_HOME_SECTION_LABEL[section]).join(" · ");
  return `${names}${topicParticle(names)} 아직 서버가 제공하지 않습니다.`;
}

function UnavailableNote({ sections }: { sections: SearchHome["unavailable"] }) {
  const sentence = unavailableSentence(sections);
  if (!sentence) return null;

  return (
    <p className="text-muted-foreground flex items-start gap-1.5 text-[12px] leading-5">
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{sentence}</span>
    </p>
  );
}

/** 검색어가 없을 때의 화면 — 최근 검색어 → 최근 본 항목 → 둘러보기 순서(CLAUDE.md §화면은 위에서 아래로) */
export function SearchLanding({ home }: SearchLandingProps) {
  /*
    ⚠️ **최근 검색어는 세지 않는다**(2026-08-10 리뷰). 이 화면에서 최근 검색어를 걷어내
       입력창 드롭다운으로 옮겼는데 조건만 남아 있었다 — 검색만 해 보고 아무것도 안 열어 본
       사람에게 "아직 둘러본 것이 없습니다" 대신 **텅 빈 화면**이 떴다. 세는 것은 이 화면이
       실제로 그리는 것뿐이다.
  */
  const isEmpty =
    home.recentlyViewed.length === 0 && home.projects.length === 0 && home.people.length === 0;

  if (isEmpty) {
    /*
      ⚠️ **둘러볼 게 없는 것과 못 받아 온 것은 다른 말이다.** 서버가 안 주는 칸이 있는데
         "아직 둘러본 것이 없습니다"라고만 하면 사용자 탓으로 읽힌다(§정직성) — 못 받은
         칸이 있으면 제목부터 바꿔 그 사실을 먼저 말한다.
    */
    const sentence = unavailableSentence(home.unavailable);

    return (
      <EmptyState
        className="py-24"
        icon={Search}
        title={sentence ? "지금은 둘러볼 목록이 없습니다." : "아직 둘러본 것이 없습니다."}
        description={
          sentence ? `${sentence} 검색어를 입력해 찾아 주세요.` : "검색어를 입력해 찾아 주세요."
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <RecentlyViewedGrid items={home.recentlyViewed} />

      {/*
        ⚠️ **둘을 좌우로 나란히 둔다.** 세로로 쌓으면 짧은 목록 두 개가 화면을 길게 끌어
           스크롤이 생기는데, 정작 오른쪽은 통째로 비었다 — 둘 다 짧은 목록이라 나란히 서는 게 맞다.
        ⚠️ 좁아지면 세로로 돌아간다(`lg:`) — 한 줄에 둘을 욱여넣으면 이름이 잘린다.
      */}
      {/*
        ⚠️ **`items-start`가 있어야 한다.** 없으면 두 카드가 **같은 높이로 늘어나** 줄 수가
           적은 쪽(프로젝트 3개 vs 사람 4명) 아래가 통째로 빈다 — 카드가 내용이 아니라
           빈 자리를 담게 된다. 격자의 기본값이 `stretch`라 일부러 꺼야 한다.
      */}
      <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-2">
        <BrowseProjects projects={home.projects} />
        <BrowsePeople people={home.people} />
      </div>

      {/*
        ⚠️ **맨 아래에 둔다.** 못 받은 칸을 알리는 말은 이 화면이 실제로 보여주는 것(프로젝트)
           뒤에 와야 한다 — 맨 위에 두면 쓸 수 있는 목록보다 안 되는 이야기가 먼저 읽힌다.
      */}
      <UnavailableNote sections={home.unavailable} />
    </div>
  );
}
