import { splitByMatch } from "../lib";

/**
 * 검색어에 걸린 글자를 표시한다 — **화면이 왜 떴는지 말하게 하려고** 쓴다(`match-text.ts`와 같은 이유).
 * ⚠️ **색을 안 쓴다.** 색으로 알리는 건 에러(빨강)뿐이라(§디자인 토큰) 옅은 먹색 바탕과
 *    글자 진하기로 나타낸다. `mark`를 쓰는 건 스크린리더에도 표시가 남기 때문이다(§a11y).
 */
export function MatchText({ text, keyword }: { text: string; keyword: string }) {
  const parts = splitByMatch(text, keyword);

  return (
    <>
      {parts.map((part, index) =>
        part.isMatch ? (
          <mark
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
