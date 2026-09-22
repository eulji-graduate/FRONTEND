import { AUTHORITY_BADGE_CLASS, AUTHORITY_LABEL } from "@/constants/authority";
import { formatDate } from "@/lib/date";
import { pickPaletteColor } from "@/lib/palette";
import { cn } from "@/lib/utils";

import type { SearchResultItem } from "../types";
import { KindBadge } from "./kind-badge";
import { MatchText } from "./match-text";
import { RecordViewLink } from "./record-view-link";

/*
  ⚠️ **줄마다 낱장 카드다**(랜딩 목록과 같은 결). 구분선으로 이은 한 덩이는 값을 **비교하는**
     표의 생김새인데, 검색 결과는 훑다가 **하나를 고르는** 자리다.
*/
/*
  ⚠️ **가운데 정렬이다**(`items-center`). 배지를 위에 붙여 뒀더니 옆 글이 두 줄일 때
     배지만 첫 줄에 매달려 줄이 기울어 보였다 — 배지는 그 항목 **전체**를 가리키는 표식이라
     항목의 한가운데 서야 한다.
  ⚠️ 색 막대는 예외로 위아래를 꽉 채운다(아래 `self-stretch`) — 그건 표식이 아니라 경계다.
*/
const ROW_SHAPE =
  "border-border bg-card flex items-center gap-3 rounded-xl border py-3.5 pr-4 pl-3";

interface SearchResultRowProps {
  item: SearchResultItem;
  keyword: string;
}

/**
 * 결과 한 줄 — 종류를 가리지 않는 평평한 필드(`제목·발췌·project·date·role`)만으로 그린다.
 * 순수 표시(+ 프로젝트만 이동)라 서버에서 그린다.
 *
 * ⚠️ **프로젝트만 링크다.** 회의·액션 상세 화면 경로가 아직 이 목의 id 체계로 안 정해져
 *    있다 — 안 되는 이동을 만드느니 지금은 정보만 보여준다(§명세에 없는 기능은 안 만든다).
 * ⚠️ **태그 코드가 없다.** `GET /search`의 `project`는 표시용 문구뿐이라(BE 실코드 미대조,
 *    §연동 검증) 프로젝트 칩(`ProjectTag`)을 못 그린다 — 색 막대만 `project` 문구 기준으로 낸다.
 */
export function SearchResultRow({ item, keyword }: SearchResultRowProps) {
  const meta = rowMeta(item);

  const content = (
    <>
      {/*
        ⚠️ **랜딩 목록과 같은 색 막대를 세운다.** 결과 줄만 없으니 검색 전과 후의 생김새가
           달랐다 — 같은 화면인데 훑는 눈이 다시 적응해야 한다.
      */}
      <span
        className="w-1 shrink-0 self-stretch rounded-full"
        style={{ backgroundColor: pickPaletteColor(item.project ?? String(item.id)).solidColor }}
        aria-hidden
      />
      {/*
        ⚠️ **얼굴을 여기 끼우지 않는다.** 사람 줄에만 아바타를 넣었더니 그 줄만 제목이
           오른쪽으로 밀려 **줄마다 제목이 다른 자리에서 시작했다** — 목록은 한 세로선을
           따라 읽는다. 종류는 이미 왼쪽 배지가 말한다.
      */}
      <KindBadge kind={item.kind} />

      <div className="min-w-0 flex-1">
        {/*
          ⚠️ **제목 줄에 다 세운다.** 제목만 한 줄, 보조값은 아랫줄로 내렸더니 한 항목이
             세 줄을 먹으면서 오른쪽은 통째로 비었다 — 위아래로는 길고 좌우로는 텅 빈 모양이다.
             한 줄에 이어 붙이면 그 줄이 문장으로 읽히고 카드도 낮아진다.
        */}
        <p className="flex min-w-0 items-center gap-2">
          <span className="text-foreground truncate text-[13px] leading-5 font-semibold">
            <MatchText text={item.title} keyword={keyword} />
          </span>
        </p>
        {item.snippet && (
          /*
            ⚠️ **본문 크기(13px)로 올린다.** 12px 흐린 글씨로 두니 정작 찾던 말이 들어 있는
               줄이 제일 안 읽혔다 — 검색어가 걸린 문장이 이 화면에서 제일 중요한 값이다.
            ⚠️ 색은 본문보다 한 단계만 낮춘다. 제목과 같으면 둘 중 뭘 먼저 볼지 알 수 없다.
            ⚠️ **회의 요약이 아직 없으면 이 줄이 통째로 빠진다** — 발췌를 지어내지 않는다.
          */
          <p className="text-foreground/75 mt-1 truncate text-[13px] leading-5">
            <MatchText text={item.snippet} keyword={keyword} />
          </p>
        )}
      </div>

      {/*
        ⚠️ **보조값은 오른쪽 끝이다.** 제목 뒤에 이어 붙였더니 줄은 1440인데 내용이 왼쪽에만
           뭉쳐 오른쪽 절반이 통째로 비었다 — 양쪽 끝에 닻이 있어야 줄이 줄로 읽힌다.
        ⚠️ 제목 줄이 아니라 **항목 전체의 세로 중앙**에 선다(배지와 같은 높이) — 두 줄짜리
           항목에서 첫 줄에만 매달리면 다시 기울어 보인다.
      */}
      {meta && (
        /*
          ⚠️ **여기도 줄어들 수 있어야 한다**(2026-08-10 리뷰). `shrink-0 truncate`는 서로 어긋난다 —
             못 줄이는 상자에는 넘칠 일이 없어 말줄임이 안 걸리고, 긴 값이 줄을 밀고 나간다.
        */
        <span className="text-muted-foreground min-w-0 truncate text-[12px] leading-4">
          <MatchText text={meta} keyword={keyword} />
        </span>
      )}

      {/* ⚠️ `role`이 `null`이면(안 오면) 빈 값으로 다룬다 — 배지를 안 그린다 */}
      {item.role && (
        <span
          className={cn(
            AUTHORITY_BADGE_CLASS[item.role],
            "shrink-0 rounded px-1.5 py-0.5 text-[11px] leading-4",
          )}
        >
          {AUTHORITY_LABEL[item.role]}
        </span>
      )}
    </>
  );

  if (item.kind === "PROJECT") {
    return (
      <li>
        <RecordViewLink
          kind="PROJECT"
          itemId={item.id}
          href={`/app/projects/${item.id}`}
          className={cn(ROW_SHAPE, "hover:border-foreground/25 transition-colors")}
        >
          {content}
        </RecordViewLink>
      </li>
    );
  }

  return (
    <li>
      <div className={ROW_SHAPE}>{content}</div>
    </li>
  );
}

/** 소속 프로젝트·일시를 한 줄로 — 둘 다 없으면 빈 문자열(그 줄을 안 그린다) */
function rowMeta(item: SearchResultItem): string {
  const parts = [item.project, item.date ? formatDate(item.date) : null].filter(
    (part): part is string => Boolean(part),
  );
  return parts.join(" · ");
}
