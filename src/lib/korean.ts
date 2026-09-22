/**
 * 한글 조사 — 앞말의 **받침**을 보고 고른다.
 *
 * ⚠️ 문구에 조사를 박아 두면 안 된다. `${label}은 준비 중입니다`처럼 한쪽으로 고정하면
 *    "프로젝트은"·"캘린더은"처럼 라벨 대부분이 틀린 말로 나온다 — 메뉴 이름은 모음으로
 *    끝나는 게 더 많다.
 * ⚠️ 라벨은 상수에서 오고 앞으로도 늘어난다. 새 라벨을 넣는 사람이 조사까지 확인하게 두면
 *    언젠가 틀린다 — 넣는 자리에서 고르게 한다.
 */

/** 한글 음절 영역(가 ~ 힣) */
const SYLLABLE_START = 0xac00;
const SYLLABLE_END = 0xd7a3;
/** 한 초성·중성 묶음이 갖는 종성 가짓수(받침 없음 포함) */
const FINAL_COUNT = 28;
/** 종성 `ㄹ`의 자리 — 방향 조사는 이 받침만 예외다(`회의실로`) */
const RIEUL_FINAL = 8;

/**
 * 마지막 글자에 받침이 있는지.
 *
 * ⚠️ 한글이 아니면(영문·숫자·기호) **받침이 있는 것으로 본다.** `Admin은`·`STT은`처럼
 *    자음으로 끝나 읽히는 경우가 흔해서, 둘 중에는 이쪽이 덜 어색하다.
 */
function hasFinalConsonant(word: string): boolean {
  const last = word.trim().at(-1);
  if (!last) return true;

  const code = last.charCodeAt(0);
  if (code < SYLLABLE_START || code > SYLLABLE_END) return true;

  return (code - SYLLABLE_START) % FINAL_COUNT !== 0;
}

/** 주제 조사 — `프로젝트`+`는`, `검색`+`은` */
export function topicParticle(word: string): "은" | "는" {
  return hasFinalConsonant(word) ? "은" : "는";
}

/** 주격 조사 — `프로젝트`+`가`, `검색`+`이` */
export function subjectParticle(word: string): "이" | "가" {
  return hasFinalConsonant(word) ? "이" : "가";
}

/** 목적격 조사 — `프로젝트`+`를`, `검색`+`을` */
export function objectParticle(word: string): "을" | "를" {
  return hasFinalConsonant(word) ? "을" : "를";
}

/**
 * 방향 조사 — `회의 상세`+`로`, `기업 가입 승인`+`으로`.
 *
 * ⚠️ **받침 `ㄹ`은 예외다.** 받침이 있으면 `으로`인데 `ㄹ`만 `로`를 쓴다 —
 *    `회의실으로`가 아니라 `회의실로`다. 다른 조사엔 없는 규칙이라 여기서만 따로 본다.
 * ⚠️ 한글이 아니면 다른 조사와 같은 쪽(`으로`)으로 둔다 — 이 자리를 지나는 값은
 *    화면 이름(`회의`·`공지`·`기업 가입 승인`)이라 한글이다.
 */
export function directionParticle(word: string): "로" | "으로" {
  const last = word.trim().at(-1);
  if (!last) return "으로";

  const code = last.charCodeAt(0);
  if (code < SYLLABLE_START || code > SYLLABLE_END) return "으로";

  const final = (code - SYLLABLE_START) % FINAL_COUNT;
  return final === 0 || final === RIEUL_FINAL ? "로" : "으로";
}
