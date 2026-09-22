import type { ReactNode } from "react";

interface SearchLayoutProps {
  children: ReactNode;
}

/**
 * ⚠️ **머리글을 여기서 그리지 않는다.** 검색 중일 때만 뒤로가기를 달아야 하는데, 레이아웃은
 *    `?q=`를 볼 수 없다(Next의 레이아웃에는 `searchParams`가 안 온다) — 페이지가 직접 그린다.
 */
export default function SearchLayout({ children }: SearchLayoutProps) {
  return <>{children}</>;
}
