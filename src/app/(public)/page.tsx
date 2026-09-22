import type { Metadata } from "next";

import { redirectIfSignedIn } from "@/features/auth/me";
import { FlowSection } from "@/features/landing/components/flow-section";
import { LandingHero } from "@/features/landing/components/landing-hero";
import {
  CompareSection,
  FeatureSection,
  ProblemSection,
} from "@/features/landing/components/landing-sections";
import { LandingShell } from "@/features/landing/components/landing-shell";
import { ClosingSection } from "@/features/landing/components/pricing-section";
import { RoleSection } from "@/features/landing/components/role-section";

/*
  ⚠️ **OG·트위터 카드는 이 화면(랜딩)에만 붙인다.** 로그인 뒤 화면·`(public)`의 다른
     화면(로그인·가입·요금제 등)은 이 필드가 없어 공유해도 이미지 없이 나간다 — 파일
     컨벤션(`opengraph-image.tsx`)을 쓰면 세그먼트 상속 여부가 애매해지므로, 이 페이지의
     메타데이터 객체에 명시적으로만 건다(§SEO: 나머지는 여전히 대상 아님).
  ⚠️ 이미지는 `public/og-landing.png` 정적 파일이다 — 랜딩 카피가 안 바뀌는 한 다시 만들
     필요 없다. 카피가 바뀌면 이 이미지도 같이 바꾼다(따로 놀면 미리보기가 옛 문구를 보여준다).
*/
export const metadata: Metadata = {
  title: "Z — 회의를 하면, 조직의 기억이 된다",
  description:
    "회의가 끝나면 결정과 할 일이 담당자에게 배정됩니다. 사람이 바뀌어도 맥락은 남습니다.",
  openGraph: {
    title: "Z — 회의를 하면, 조직의 기억이 된다",
    description:
      "회의가 끝나면 결정과 할 일이 담당자에게 배정됩니다. 사람이 바뀌어도 맥락은 남습니다.",
    images: [{ url: "/og-landing.png", width: 1200, height: 630 }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Z — 회의를 하면, 조직의 기억이 된다",
    description:
      "회의가 끝나면 결정과 할 일이 담당자에게 배정됩니다. 사람이 바뀌어도 맥락은 남습니다.",
    images: ["/og-landing.png"],
  },
};

/**
 * 랜딩 — 로그인 전 첫 화면.
 *
 * ⚠️ 상단바·푸터를 `(public)/layout.tsx`에 두지 않는다 — 그 레이아웃은 `/login`·`/register`까지 감싸서
 *    온보딩 셸 위에 랜딩 껍데기가 덧씌워진다. 랜딩만 쓰는 껍데기는 랜딩이 직접 그린다.
 *
 * 읽는 순서를 그대로 따라간다: **문제 → 흐름 → 기능 → 비교 → 역할 → 시작하기**.
 */
export default async function LandingPage() {
  /*
    ⚠️ 로그인한 사람에게 소개 페이지를 보여 주지 않는다 — 갈 곳은 서버가 준
       `landingPath`가 정한다(온보딩 전 오너면 온보딩을 가리킨다).
  */
  await redirectIfSignedIn();

  return (
    /* 무대·상단바·푸터는 셸이 그린다 — 밝기 스위치도 거기 있다 */
    <LandingShell>
      <LandingHero />
      <ProblemSection />
      <FlowSection />
      <FeatureSection />
      <CompareSection />
      {/* 요금제 띠는 뺐다 — /plans가 따로 있고 헤더·마지막 CTA가 동선을 잇는다 */}
      <RoleSection />
      <ClosingSection />
    </LandingShell>
  );
}
