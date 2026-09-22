/**
 * 로그인 전 화면의 **UI 계약**.
 *
 * ⚠️ 컴포넌트는 이 타입만 안다(§Mock 격리막). BE shape은 `actions.ts`의 매퍼가 흡수하고,
 *    연동할 때 고칠 곳은 `actions.ts`와 매퍼뿐이다 — 컴포넌트는 0줄 고친다.
 */
export interface Company {
  code: string;
  name: string;
}
