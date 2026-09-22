"use client";

import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";

import { useLandingTheme } from "./landing-shell";

/**
 * 랜딩 전체의 고정 배경 — 검정 캔버스 위에 3D Z 하나가 계속 돈다.
 *
 * 섹션 배경이 반투명이라 스크롤 내내 이 층이 비친다 — 흰·검 조각 대신 한 몸의 무대.
 * ⚠️ **섹션마다 배경을 따로 칠하지 않는다.** 섹션별 그라데이션을 겹치면 경계가 띠처럼 드러나
 *    페이지가 조각나 보인다. 색은 여기 **한 장**에서만 나온다.
 * ⚠️ `pointer-events-none` — 배경이 스크롤·클릭을 뺏으면 안 된다(회전은 자전만).
 * ⚠️ three는 `ssr:false` 지연 로드, 로드 전에는 광원만 있는 바탕이다(§성능·폴백).
 * ⚠️ 밝은 쪽에서는 광원과 Z를 **훨씬 옅게** 깐다 — 검정 위에서 은은하던 세기가
 *    흰 바탕에서는 글을 덮는 회색 덩어리가 된다.
 */
const ThreeZ = dynamic(() => import("./three-z"), { ssr: false, loading: () => null });

export function LandingBackdrop() {
  const { isDark } = useLandingTheme();

  return (
    /*
      ⚠️ `-z-10` 대신 `z-0`이다. 음수 z는 **문서 배경보다 아래**라 body 배경색이 흰색인 순간
         (테마 토큰이 아직 안 붙은 첫 페인트 등) 이 층이 통째로 가려진다.
         이 위에 오는 콘텐츠는 `relative z-10`을 갖는다.
    */
    <div
      aria-hidden
      /*
        ⚠️ `overflow-hidden`이 필요하다. 안쪽 3D Z가 **980px 고정**이라 그보다 좁은 창에서는
           좌우로 삐져나간다 — 장식이라 잘려도 아무 손해가 없고, 안 자르면 가로 스크롤이
           생길 위험만 남는다.
      */
      className={cn("pointer-events-none fixed inset-0 z-0 overflow-hidden", "bg-landing-stage")}
    >
      {/* 화면 전체를 덮는 한 장의 그라데이션 — 위는 푸르게, 아래는 보랏빛으로 아주 천천히 넘어간다 */}
      <span
        className={cn(
          "absolute inset-0",
          isDark
            ? "bg-[radial-gradient(120%_80%_at_15%_0%,rgba(37,99,235,0.22)_0%,transparent_55%),radial-gradient(110%_75%_at_85%_100%,rgba(124,58,237,0.2)_0%,transparent_55%)]"
            : /*
                ⚠️ 밝은 무대에서는 색을 **모서리로 밀어낸다.** 화면 전체에 옅게 깔면
                   흰 바탕도 아니고 색도 아닌 뿌연 라벤더 한 겹이 된다 —
                   가운데는 흰 종이로 비워 두고 위·아래 끝에만 색기를 남긴다.
                ⚠️ 다만 **너무 걷어내면 색이 사라진다.** 모서리에서는 확실히 읽히는 세기로
                   두고, 가운데로 오면서 빠르게 끊는다(62%).
              */
              "bg-[radial-gradient(85%_55%_at_8%_-8%,rgba(37,99,235,0.16)_0%,transparent_62%),radial-gradient(80%_55%_at_94%_108%,rgba(124,58,237,0.15)_0%,transparent_62%)]",
        )}
      />

      {/*
        밝은 무대에만 까는 **종이 결**.
        ⚠️ 흰 화면은 그냥 두면 "비어 있다"로 읽힌다. 아주 옅은 점 격자를 깔면 같은 흰색이
           **여백**으로 읽힌다 — 온보딩이 이미 쓰는 결이라 같은 손에서 나온 화면이 된다.
        ⚠️ 위아래 끝은 지운다. 화면 끝까지 격자가 닿으면 표처럼 보인다.
      */}
      {!isDark && (
        <span
          aria-hidden
          className="bg-dot-grid absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,#000_18%,#000_82%,transparent)] opacity-[0.55]"
        />
      )}

      {/* 번진 광원 둘 — 검정이 평평해 보이지 않게 */}
      <span
        className={cn(
          "animate-drift absolute -top-24 -left-32 size-[480px] rounded-full bg-[#2563eb] blur-[130px]",
          isDark ? "opacity-20" : "opacity-[0.13]",
        )}
      />
      <span
        className={cn(
          "animate-drift absolute -right-32 -bottom-24 size-[480px] rounded-full bg-[#7c3aed] blur-[130px] [animation-delay:-7s]",
          isDark ? "opacity-20" : "opacity-[0.13]",
        )}
      />

      {/*
        정중앙 — 사선만 밝으면 막대처럼 읽히므로 조명을 키워 글자 전체가 보이게 한다.
        ⚠️ **자리와 크기는 두 무대가 같다.** 밝다고 옮기거나 줄이면 같은 사이트로 안 읽힌다 —
           밝은 쪽은 **재질과 빛**으로 읽히게 만든다(§three-z).
        ⚠️ 밝은 무대에서는 투명도를 거의 낮추지 않는다. 몸체가 흰색이라 남는 건 음영뿐인데
           거기서 더 흐리면 아무것도 안 보인다.
      */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          /*
            ⚠️ 밝은 쪽은 **은은해야 한다.** 형태가 또렷하면 글보다 먼저 눈에 걸린다.
            ⚠️ 가장자리는 `landing-z-fade`가 지운다 — 그만큼 지워지므로 본체 투명도는
               조금 올려 둔다. 중심은 보이고 바깥은 없는 상태가 된다.
          */
          /*
            ⚠️ 진하기는 **스크롤이 정한다**(`--hero-z-opacity`, `hero-scroll-driver.tsx`).
               첫 화면에서 0.9로 서 있다가 내려가면 0.35까지 물러난다 — 변수가 아직 없을 때
               (스크립트 전·모션 최소화)의 기본값을 함께 적어 둔다.
          */
          isDark ? "hero-z-dark" : "landing-z-fade hero-z-light",
        )}
      >
        {/*
          ⚠️ **첫 화면에서는 이 Z가 주인공이다**(2026-08-12). 스크롤에 따라 돌면서 세 조각이
             흩어졌다 다시 붙는다 — "회의가 조직의 기억이 된다"는 말이 눈앞에서 일어나게 한다.
          ⚠️ 크기를 키운다(760 → 980). 벽지처럼 깔려 있을 때는 이 정도면 됐지만, 주인공이
             되려면 화면을 채워야 한다.
        */}
        <ThreeZ size={980} tone={isDark ? "dark" : "light"} reactsToScroll />
      </div>
    </div>
  );
}
