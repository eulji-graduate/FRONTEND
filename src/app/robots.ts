import type { MetadataRoute } from "next";

/**
 * 로그인 뒤에만 쓰는 사내 도구다 — 검색 노출 대상이 아니다(CONVENTIONS §14).
 * sitemap·OG는 만들지 않고, 크롤러는 전 경로를 막는다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
