import type { SVGProps } from "react";

/**
 * Z 로고 마크 — 세 조각(윗줄 · 사선 · 아랫줄)으로 끊긴 형태.
 *
 * `fill="currentColor"`라서 **배경이 없다.** 글자색을 따라가므로
 * 다크모드에서 따로 대응할 필요가 없다(CONVENTIONS §8: 커스텀 SVG는 currentColor).
 */
export function ZLogo({ title, ...props }: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M0 0 L63 0 L45.5 25 L0 25 Z" />
      <path d="M70 0 L100 0 L30 100 L0 100 Z" />
      <path d="M54.5 75 L100 75 L100 100 L37 100 Z" />
    </svg>
  );
}
