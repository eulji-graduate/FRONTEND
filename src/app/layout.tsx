import "./globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { NavHistoryTracker } from "@/components/common/nav-history";
import { ThemeProvider } from "@/components/common/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AppScaleScope } from "@/features/appearance/components/app-scale-scope";
import { SCALE_BOOT_SCRIPT } from "@/features/appearance/scale";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const LANDING_THEME_KEY = "z:landing-theme";

/*
  ⚠️ **첫 페인트 전에** 저장해 둔 랜딩 밝기를 `<html>`에 붙인다.
     서버는 방문자의 선택을 모르므로 늘 어두운 기본값으로 그려 보낸다. 하이드레이션까지
     기다리면 밝게 쓰던 사람은 새로고침마다 검은 화면이 번쩍였다가 흰 화면으로 바뀐다.
  ⚠️ **`<head>`에 둔다.** 컴포넌트 트리 안의 `<script>`는 클라이언트 렌더에서 실행되지 않아
     React가 경고를 낸다 — SSR로는 돌지만 콘솔이 지저분해진다.
  ⚠️ 스킨 클래스는 `<html>`이 들지만 **토큰은 `#landing-stage`에만** 선언한다(globals.css).
     토큰까지 html에 두면 로그인 뒤 앱 화면도 따라 어두워진다.
  ⚠️ 스크립트가 막히거나(CSP) 저장소를 못 읽어도 화면은 산다 — 기본값(어두움)으로 남을 뿐이다.
*/
const LANDING_THEME_BOOT = `try{var d=localStorage.getItem("${LANDING_THEME_KEY}")!=="light";document.documentElement.classList.add(d?"landing-night":"landing-day")}catch(e){document.documentElement.classList.add("landing-night")}`;

/**
 * ⚠️ **OG 이미지 절대경로를 만들려고만 둔다** — SEO 대상은 여전히 아니다(§SEO,
 *    `robots.ts`는 그대로 noindex). 링크 미리보기(카톡·슬랙 unfurl)는 검색 노출과 다른
 *    기능이라 별개로 켠다. 랜딩(`/`) 한 곳만 이미지를 붙였고(`(public)/page.tsx`), 로그인
 *    뒤 화면은 여기 붙는 게 없어 여전히 이미지 없이 공유된다.
 * ⚠️ 배포 도메인은 `https://www.z-groupware.site`다(2026-08-19 확인). 로컬 개발에서는
 *    `NEXT_PUBLIC_SITE_URL`이 없으면 localhost로 떨어진다 — 배포 빌드에서 env를 안 심어도
 *    이 기본값이 실제 도메인이라 안전하다(`NODE_ENV`로 가른다).
 * ⚠️ **`??`가 아니라 `||`다**(적대적 검증에서 발견). env가 빈 문자열(`""`)로 잘못 심기면
 *    `??`는 그걸 "값이 있다"로 보고 안 걸러 `new URL("")`이 던져 앱 전체가 죽는다 —
 *    이 값은 URL이라 빈 문자열이 유효한 값일 수 없으므로 `||`로 같이 걸러도 안전하다.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://www.z-groupware.site"
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // 각 화면은 자기 이름만 쓴다 — 탭 제목에 브랜드를 뒤에 붙이지 않는다
  title: {
    default: "Z — 회의 기반 지식관리",
    template: "%s",
  },
  description: "회의를 캡처하면 요약·결정·액션이 담당자에게 전달됩니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: next-themes가 첫 렌더 전에 <html>의 class를 바꾸기 때문에 필요하다.
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: LANDING_THEME_BOOT }} />
        {/*
          ⚠️ 화면 배율도 **첫 페인트 전에** 건다. 하이드레이션까지 기다리면 새로고침마다
             100%로 한 번 그려졌다가 확대되면서 화면이 통째로 튄다 — 랜딩 밝기와 같은 이유다.
        */}
        <script dangerouslySetInnerHTML={{ __html: SCALE_BOOT_SCRIPT }} />
      </head>
      <body className="bg-background text-foreground flex flex-col">
        <ThemeProvider>
          {/*
            ⚠️ **스크롤은 여기서 돈다.** `body`는 화면 배율을 거는 자리라
               `transform`이 걸려 있고(§globals.css `--app-scale`), 변형된 요소는 그 안
               `position: fixed`의 기준이 된다 — 거기서 스크롤까지 하면 상단바·모달 같은
               고정 요소가 내용과 함께 밀려 나간다. 스크롤을 한 겹 안으로 내려 갈라 둔다.
            ⚠️ `Toaster`는 **이 상자 밖**이다. 토스트는 `fixed`라 스크롤과 무관해야 하고,
               `body` 바로 안에 있어야 배율도 같이 받는다.
          */}
          <div id="app-scroll">{children}</div>
          {/* 변경 결과 토스트 — 앱 전체에 하나만 둔다(DECISIONS) */}
          <Toaster />
          {/*
            상단바 뒤로가기가 **왔던 길**로 갈 수 있는지 판정하려고 앱 안 이동을 기록한다.
            화면에는 아무것도 안 그린다(`components/common/nav-history`).
          */}
          <NavHistoryTracker />
          {/*
            배율을 로그인 이후 화면에만 붙였다 뗀다 — 부트 스크립트는 문서 로드 때 한 번뿐이라
            클라이언트 내비게이션(로그인 → 워크스페이스, 워크스페이스 → 랜딩)은 이게 맡는다.
          */}
          <AppScaleScope />
        </ThemeProvider>
      </body>
    </html>
  );
}
