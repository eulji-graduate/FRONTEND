/**
 * 테스트용 `MarkdownContent` 대역.
 *
 * ⚠️ `react-markdown`·`remark-gfm`·`rehype-sanitize`는 ESM만 내놓는데 `next/jest`가
 *    `transformIgnorePatterns`를 자기 값으로 덮어써서 변환 대상에 못 넣는다 — 그대로 두면
 *    이 컴포넌트를 스치는 화면(고객센터 위젯·공지 상세 등)의 테스트가 통째로
 *    `unexpected token 'export'`로 죽는다(`test/lenis-stub.ts`와 같은 문제, 2026-08-13).
 * ⚠️ **마크다운 렌더링 자체는 지금 테스트의 관심사가 아니다.** 이 컴포넌트의 출력을 직접
 *    검증하는 테스트가 없다 — 원문을 그대로 보여주기만 해도 충분하다. 서식(굵게·목록 등)이
 *    실제로 뜨는지 검증해야 하는 테스트가 생기면, 이 대역을 그 테스트에서만 걷어내고
 *    진짜 렌더링을 쓰도록 손봐야 한다.
 */
export function MarkdownContent({ content, className }: { content: string; className?: string }) {
  return <div className={className}>{content}</div>;
}
