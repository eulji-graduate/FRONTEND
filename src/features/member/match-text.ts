/** 글자 한 토막 — 검색어에 걸린 자리인지 함께 들고 있다 */
export interface TextPart {
  text: string;
  isMatch: boolean;
}

/**
 * 검색어에 걸린 자리를 갈라낸다 — **화면이 왜 떴는지 말하게 하려고** 쓴다.
 *
 * ⚠️ 검색은 이름뿐 아니라 **팀·역할·직급**도 본다. 그래서 `자`로 찾으면 이름에 `자`가 없는
 *    강서연·한소율이 뜨는데(`디자인팀`이 걸린 것이다), 걸린 자리를 안 보여주면 잘못 뜬
 *    것처럼 읽힌다 — 실제로 그렇게 보였다.
 * ⚠️ **정규식을 안 쓴다.** 검색어는 사람이 아무 글자나 치는 값이라 `(`·`*` 같은 게 들어오면
 *    정규식이 터지거나 엉뚱한 데가 걸린다. 글자를 그대로 찾는다.
 * ⚠️ 찾을 때만 소문자로 맞추고 **보여주는 건 원문 그대로**다 — `Backend`를 `backend`로
 *    찾아도 화면에는 `Backend`로 남아야 한다.
 */
export function splitByMatch(text: string, keyword: string): TextPart[] {
  const needle = keyword.trim().toLowerCase();
  // 빈 검색어를 그대로 두면 아래 반복문이 제자리를 돈다
  if (!needle) return [{ text, isMatch: false }];

  const haystack = text.toLowerCase();
  const parts: TextPart[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const hit = haystack.indexOf(needle, cursor);
    if (hit < 0) {
      parts.push({ text: text.slice(cursor), isMatch: false });
      break;
    }
    if (hit > cursor) parts.push({ text: text.slice(cursor, hit), isMatch: false });
    parts.push({ text: text.slice(hit, hit + needle.length), isMatch: true });
    cursor = hit + needle.length;
  }

  return parts;
}
