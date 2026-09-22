/**
 * 답을 스트리밍 흉내용 조각으로 나눈다.
 *
 * ⚠️ **강조·링크·코드는 통째로 한 조각이다.** 낱말 단위로 잘라 흘리면 `**중요**`가
 *    `**중요` 상태로 한 틱 동안 별표가 그대로 보이다가 닫힌다 — 지나가는 깜빡임이지만
 *    안 예쁘다. 그 구간은 조각을 안 쪼개서 닫힌 채로 한 번에 나타나게 한다.
 * ⚠️ 나머지는 **한 글자 단위**로 쪼갠다(2026-08-19 변경 — 이전엔 낱말·공백 단위였다).
 *    한글 낱말은 2~4자라 낱말째로 뜨면 글이 덩어리로 튀어 "띠디딕"거렸다 — 프레임마다
 *    한 글자 정도씩 나아가면 같은 속도인데도 흐르는 것처럼 읽힌다.
 */
// ⚠️ **삼중 백틱 코드 블록을 먼저 매치**한다. 안 그러면 여는 ```가 인라인 `…`로 걸려
//    블록이 여러 조각으로 쪼개져 나온다 — 한 덩어리로 렌더돼야 하는 구간이라 지킨다.
const ATOMIC_MARKDOWN =
  /(```[\s\S]*?```|\*\*\*[^*]+?\*\*\*|\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/;

/**
 * ⚠️ **문단 나눔(`\n\n`)은 쪼개지 않는다.** 한 글자씩 흘리면 `\n` 하나만 먼저 도착해
 *    한 문단이던 글이 다음 프레임에 두 문단으로 갈린다 — 그 순간 아래 글이 통째로
 *    밀려 내려가 제일 크게 튄다. 붙은 채로 한 번에 넘긴다.
 */
const PARAGRAPH_BREAK = /(\n\n+)/;
const IS_PARAGRAPH_BREAK = /^\n\n+$/;

function splitPlainText(text: string): string[] {
  return text
    .split(PARAGRAPH_BREAK)
    .filter((part) => part !== "")
    .flatMap((part) =>
      // ⚠️ `Array.from`은 코드포인트 단위다 — `split("")`은 이모지(서로게이트 쌍)를 반으로 자른다.
      IS_PARAGRAPH_BREAK.test(part) ? [part] : Array.from(part),
    );
}

export function tokenizeForStreaming(markdown: string): string[] {
  const parts = markdown.split(ATOMIC_MARKDOWN);
  const chunks: string[] = [];

  parts.forEach((part, index) => {
    if (!part) return;
    // ATOMIC_MARKDOWN에 걸린 캡처 그룹은 홀수 자리에 온다(String.split 규약).
    if (index % 2 === 1) {
      chunks.push(part);
    } else {
      chunks.push(...splitPlainText(part));
    }
  });

  return chunks;
}
