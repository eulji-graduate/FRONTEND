/**
 * 직급 목록의 열 폭 — **행(`PositionRow`)과 열 머리(`PositionSetup`)가 같은 값을 본다.**
 *
 * ⚠️ 두 곳에 숫자를 따로 적어 두면 한쪽만 고쳐져 열이 통째로 밀린다.
 *    이름 칸은 보기 모드(`button`)와 편집 모드(`input`)에도 같은 폭이 필요하다 —
 *    폭이 다르면 더블클릭하는 순간 칸이 들썩인다.
 */
export const POSITION_COLUMN = {
  /** 번호 · 드래그 손잡이 */
  INDEX: "w-5",
  /** 직급명 — 보기·편집 두 모드가 같이 쓴다 */
  NAME: "w-[80px]",
  /** 권한(역할) */
  ROLE: "w-[92px]",
  /** 줄 빼기(X) */
  REMOVE: "size-6",
} as const;
