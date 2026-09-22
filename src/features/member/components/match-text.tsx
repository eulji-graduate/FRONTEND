import { splitByMatch } from "../match-text";

/**
 * 검색어에 걸린 글자를 표시한다 — **화면이 왜 떴는지 말하게 하려고** 쓴다.
 *
 * ⚠️ 검색은 이름뿐 아니라 팀·역할·직급도 본다. `자`로 찾으면 이름에 `자`가 없는
 *    강서연·한소율이 뜨는데(`디자인팀`이 걸린 것이다), 표시가 없으면 잘못 뜬 것처럼 읽힌다.
 * ⚠️ **색을 안 쓴다.** 색으로 알리는 건 에러(빨강)뿐이라(§디자인 토큰) 옅은 먹색 바탕과
 *    글자 진하기로 나타낸다. `mark`의 기본 노란 배경도 그래서 덮는다.
 * ⚠️ `mark`를 쓰는 건 **읽어 주는 기계에도 표시가 남기 때문**이다. `span`으로 두면
 *    눈에만 보이고 스크린리더에는 아무 말도 안 남는다(§a11y).
 */
export function MatchText({ text, keyword }: { text: string; keyword: string }) {
  const parts = splitByMatch(text, keyword);

  return (
    <>
      {parts.map((part, index) =>
        part.isMatch ? (
          <mark
            // 같은 글자가 여러 번 걸릴 수 있어 자리(index)를 같이 쓴다
            key={`${index}-${part.text}`}
            className="bg-foreground/10 text-foreground rounded-[2px] font-medium"
          >
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
