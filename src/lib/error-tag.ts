/**
 * 오류 문장에 붙는 **꼬리표의 모양**을 정하는 한 곳.
 *
 * ⚠️ `lib/api.ts`가 아니라 여기 있는 이유: 그 파일은 `server-only`라 **화면(클라이언트)이 못
 *    읽는다.** 붙이는 쪽(서버의 `toUserMessage`)과 가르는 쪽(화면)이 **같은 규칙**을 봐야 하는데,
 *    규칙이 그쪽에만 있으면 화면은 자기 나름의 정규식을 또 쓰게 된다.
 * ⚠️ **두 규칙이 갈리면 조용히 실패한다**(적대적 리뷰 2026-08-12). 붙일 때는 통과했는데 가를 때
 *    안 걸리면 꼬리표가 빨간 문장 안에 그대로 박히고, 아무도 눈치채지 못한다 — 실제로 추적 번호가
 *    8자보다 짧거나(붙이는 쪽의 `slice(0, 8)`은 상한일 뿐이다) 코드 없이 번호만 온 5xx에서 그랬다.
 *    그래서 **모양은 이 파일 하나가 정하고**, 붙이는 쪽은 여기 통과한 것만 붙인다.
 */

/**
 * 꼬리표 한 덩이 — `Z-003` · `Z-003 · 271d9bab` · `271d9bab` 셋 다 받는다.
 *
 * ⚠️ 코드도 번호도 **한쪽만 올 수 있다.** BE 실패 봉투는 `errorCode` 없이 `traceId`만 오기도
 *    한다(게이트웨이·필터 단 500) — 한쪽만 있으면 그 한쪽을 싣는 것이 `toErrorTag`의 계약이다.
 * ⚠️ 번호 길이를 **정확히 8자로 못 박지 않는다.** BE가 짧은 값을 주면 그보다 짧게 실린다.
 * ⚠️ 사람이 읽는 문장이 괄호로 끝나도(`이미 있는 부서 이름입니다 (개발팀)`) 안 걸린다 —
 *    한글·공백이 들어가면 이 모양이 아니다.
 */
const CODE = String.raw`[A-Z][A-Z0-9]{0,3}-\d{3}`;
const TRACE = String.raw`[0-9a-f]{4,8}`;
const TAG = `(?:${CODE}(?: · ${TRACE})?|${TRACE})`;

/** 문장 **끝**에 붙은 것만 본다 — 중간의 괄호는 사람이 쓴 말이다 */
const TAGGED_MESSAGE = new RegExp(String.raw`^(.*?)\s\((${TAG})\)$`);
const TAG_ONLY = new RegExp(`^${TAG}$`);

/**
 * 우리가 정한 꼬리표 모양인가 — **붙이기 전에** 확인한다.
 *
 * ⚠️ 이 검사를 거치면 "붙였는데 못 가르는" 경우가 원천적으로 없다. 모양에 안 맞는 값은
 *    아예 안 붙이므로, 문장은 꼬리표 없이 깨끗하게 남는다.
 */
export function isErrorTag(value: string): boolean {
  return TAG_ONLY.test(value);
}

/**
 * 화면에 그릴 때 **문장과 꼬리표를 다시 가른다**.
 *
 * ⚠️ 붙이는 일은 `toUserMessage` 한 곳이 한다(그래야 화면마다 배선할 필요가 없다). 다만 그렇게
 *    한 덩이가 된 문자열은 **전부 같은 무게로 그려진다** — 빨간 문장 안에 `(Z-003 · 271d9bab)`가
 *    끼어 있으면 정작 읽어야 할 말보다 코드가 먼저 눈에 걸린다.
 * ⚠️ 그래서 그리는 자리에서만 도로 가른다. 꼬리표는 흐린 작은 줄로 내려보내고, 사람이 읽을
 *    문장 하나가 주인공이 된다.
 */
export function splitErrorTag(message: string): { text: string; tag: string | null } {
  const match = TAGGED_MESSAGE.exec(message);
  if (!match) return { text: message, tag: null };
  return { text: match[1] ?? message, tag: match[2] ?? null };
}
