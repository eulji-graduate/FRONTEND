import type { FaqEntry } from "./faq";
import { FAQ_ENTRIES } from "./faq-entries";

/**
 * 물어본 말에 걸리는 항목들을 **점수 순으로** 돌려준다.
 *
 * ⚠️ **AI가 아니다.** 키워드가 몇 글자나 겹치는지 세는 게 전부다 — 대단한 척하지 않는다.
 * ⚠️ 하나만 고르지 않는다. 여럿이 걸리면 화면이 **되묻는다** — 잘못 짚어 엉뚱한 답을
 *    내놓는 것보다, 이 중에 뭐냐고 묻는 쪽이 낫다(§정직성).
 * ⚠️ 화면(컴포넌트)이 아니라 여기서 판정한다. 로직이라 테스트가 붙는다(§테스트).
 */

/**
 * 이만큼은 겹쳐야 "걸렸다"고 본다.
 *
 * ⚠️ 문턱이 없으면 **한 글자 우연**으로 엉뚱한 답이 나간다 — "오늘 점심 뭐 먹지"가
 *    제품 소개로 잡혔던 적이 있다. 짧은 말은 아무 문장에나 들어간다.
 */
const MIN_SCORE = 2;

/** 되물을 때 보여줄 최대 개수 — 더 많으면 고르는 게 일이 된다 */
const MAX_CANDIDATES = 4;

/** 붙여 쓰든 띄어 쓰든 같게 본다 — "기업코드"와 "기업 코드"는 같은 말이다 */
function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, "");
}

/**
 * 겹치는 글자 수를 센다.
 *
 * ⚠️ **긴 키워드에 가중치를 준다.** "코드"보다 "기업코드"가 걸리는 쪽이 정확하다 —
 *    짧은 말은 아무 문장에나 우연히 들어간다.
 */
function scoreOf(entry: FaqEntry, normalized: string) {
  return entry.keywords.reduce((sum, keyword) => {
    const target = normalize(keyword);
    return normalized.includes(target) ? sum + target.length : sum;
  }, 0);
}

export function findFaqCandidates(input: string): FaqEntry[] {
  const normalized = normalize(input);
  if (!normalized) return [];

  return FAQ_ENTRIES.map((entry) => ({ entry, score: scoreOf(entry, normalized) }))
    .filter((row) => row.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES)
    .map((row) => row.entry);
}
