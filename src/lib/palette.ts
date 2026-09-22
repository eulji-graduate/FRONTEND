/**
 * 이름에서 **항상 같은 색**을 뽑는 팔레트.
 *
 * **프로젝트는 BE가 색을 저장한다**(`ProjectSummaryResponse.color`·`ProjectDetailResponse.color`,
 * HEX). 그 값은 `tagNameFromHex`로 팔레트 이름을 되찾아 쓴다. 색을 안 주는 값
 * (프로필 아바타 · 회의/액션 응답의 프로젝트 태그)만 이름 해시(`pickPaletteColor`)로 배정한다.
 *
 * ⚠️ **값은 여기 없다.** 실제 색은 `globals.css`의 `--tag-*` 변수이고, 여기는 이름만 고른다 —
 *    라이트·다크가 다른 값이라 hex를 코드에 들고 있으면 테마가 바뀔 때 못 따라간다
 *    (§디자인 토큰: 하드코딩 금지 · CSS 변수로 정의).
 * ⚠️ **배열 순서·개수를 바꾸지 않는다.** 바꾸면 기존 이름들의 색 배정이 전부 밀린다.
 * ⚠️ 이 색들은 **구분용이지 알림용이 아니다.** 그래서 뜻이 이미 있는 색
 *    (에러 빨강 · 상태점 초록/보라/회색 · 액센트 파랑 · 경고 앰버 · Owner 오렌지)은
 *    팔레트에서 뺐다. 태그가 그 색을 쓰면 뜻이 있는 것처럼 읽힌다.
 * ⚠️ 열한 색뿐이라 **겹친다.** 프로젝트는 사용자가 직접 고른 색이라 겹쳐도 본인이 정한
 *    것이고, 해시로 자동 배정되는 자리(아바타 등)는 겹치는 게 정상이다. 색으로 프로젝트를
 *    **식별하지 않는다** — 식별은 이름과 태그가 한다.
 */
export const TAG_NAMES = [
  "slate",
  "yellow",
  "lime",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "indigo",
  "purple",
  "fuchsia",
  "pink",
] as const;

export type TagColorName = (typeof TAG_NAMES)[number];

/** 팔레트 이름의 화면 표시용 한글 라벨 — 사용자가 직접 색을 고르는 화면(프로젝트 생성 등)에서 쓴다. */
export const TAG_NAME_LABEL: Record<TagColorName, string> = {
  slate: "슬레이트",
  yellow: "옐로우",
  lime: "라임",
  emerald: "에메랄드",
  teal: "틸",
  cyan: "시안",
  sky: "스카이",
  indigo: "인디고",
  purple: "퍼플",
  fuchsia: "푸시아",
  pink: "핑크",
};

/** 팔레트 이름으로 바로 색을 뽑는다 — 사용자가 명시적으로 고른 이름을 그대로 쓸 때(해시를 거치지 않는다). */
export function paletteColorByName(name: TagColorName): PaletteColor {
  return {
    bgColor: `var(--tag-${name}-bg)`,
    textColor: `var(--tag-${name}-fg)`,
    solidColor: `var(--tag-${name}-solid)`,
  };
}

export interface PaletteColor {
  /** 칩 배경 — `var(--tag-teal-bg)`. 테마 전환은 CSS가 한다 */
  bgColor: string;
  /** 칩 글자 — 배경 위에서 4.5:1을 넘는 값이다 */
  textColor: string;
  /**
   * 원색 — **막대처럼 글자가 안 얹히는 자리**에 쓴다.
   * ⚠️ 글자에 쓰지 않는다. 바탕 위에서 보이기만 하면 되는 값이라 대비 기준이 다르다.
   */
  solidColor: string;
}

/**
 * BE가 저장하는 프로젝트 `color`(자유 HEX가 아니라 이 11개로 검증이 좁혀져 있다,
 * `ProjectColorPalette.REGEXP` — 2026-08-10 이홍근 요청으로 BE에 반영됨)를 팔레트 이름으로
 * 되돌린다. BE는 팔레트 키가 아니라 이 HEX 문자열 그대로를 저장·반환하므로, 화면이 라이트/다크
 * 짝을 알려면 이 역매핑을 거쳐야 한다.
 * ⚠️ 대소문자 무시(BE 검증도 무시) — 항상 대문자로 비교한다.
 */
const HEX_TO_TAG_NAME: Record<string, TagColorName> = {
  "#475569": "slate",
  "#A16207": "yellow",
  "#4D7C0F": "lime",
  "#059669": "emerald",
  "#0D9488": "teal",
  "#0891B2": "cyan",
  "#0284C7": "sky",
  "#4F46E5": "indigo",
  "#9333EA": "purple",
  "#C026D3": "fuchsia",
  "#DB2777": "pink",
};

/** BE `color` 값(HEX) → 팔레트 이름. 모르는 값이면 `slate`로 떨어뜨린다(임의로 지어내지 않는다). */
export function tagNameFromHex(hex: string): TagColorName {
  return HEX_TO_TAG_NAME[hex.toUpperCase()] ?? "slate";
}

/** 팔레트 이름 → BE에 보낼 `color` 값(HEX). `HEX_TO_TAG_NAME`의 역방향. */
export function hexFromTagName(name: TagColorName): string {
  const entry = Object.entries(HEX_TO_TAG_NAME).find(([, tagName]) => tagName === name);
  return entry?.[0] ?? "#475569";
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * 키 하나로 색을 고른다 — 같은 키는 언제나 같은 색이다.
 *
 * ⚠️ 무작위가 아니다. 새로고침마다 색이 바뀌면 "그 초록 프로젝트"로 기억할 수가 없다.
 */
export function pickPaletteColor(key: string): PaletteColor {
  const name = TAG_NAMES[hashString(key) % TAG_NAMES.length] ?? TAG_NAMES[0];
  return {
    bgColor: `var(--tag-${name}-bg)`,
    textColor: `var(--tag-${name}-fg)`,
    solidColor: `var(--tag-${name}-solid)`,
  };
}
