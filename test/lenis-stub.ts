/**
 * 테스트용 Lenis 대역.
 *
 * ⚠️ `lenis`는 ESM만 내놓는데 `next/jest`가 `transformIgnorePatterns`를 자기 값으로 덮어써서
 *    변환 대상에 못 넣는다 — 그대로 두면 랜딩을 스치는 테스트가 통째로 `unexpected token`으로
 *    죽는다(2026-08-12).
 * ⚠️ **부드러운 스크롤은 테스트의 관심사가 아니다.** jsdom에는 스크롤도 애니메이션 프레임도
 *    실제로 없다 — 여기서 재야 할 것은 화면이 무엇을 그리느냐이지 관성 곡선이 아니다.
 */
export default class LenisStub {
  raf(): void {}
  scrollTo(): void {}
  destroy(): void {}
}
