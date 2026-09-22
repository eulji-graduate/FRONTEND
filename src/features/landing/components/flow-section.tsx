"use client";

import { type LucideIcon } from "lucide-react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

import { DarkSection } from "./dark-section";
import { AnalyzeMock, CaptureMock } from "./flow-mocks";
import { AssignMock, HandoverMock } from "./flow-mocks-deliver";
import { FLOW_STEPS, type FlowMock, stepIndexFromProgress } from "./flow-steps";
import { smoothScrollTo } from "./smooth-scroll";

/**
 * 회의 한 번이 어떻게 흘러가는지 — 네 단계를 **눌러가며** 본다.
 *
 * 번호·제목만 나열하니 심심했다. 단계를 고르면 그 단계의 화면 축소판이 열린다
 * (온보딩 가이드와 같은 문법 — 누르면 보여준다).
 * ⚠️ 인수인계 단계는 **파랑**이다 — 초록은 "녹음 중"(진행 상태)에만 쓴다. 둘을 같은 색으로 두면
 *    "지금 돌아가는 중"과 "다 끝났다"가 구분되지 않는다.
 * ⚠️ 축소판 내용은 명세에 있는 것만. 자막은 화자 없는 청크, AI 산출물은 액션 할당이다.
 */
/* 아이콘은 lucide만 — 이모지 금지(§디자인 토큰) */

/** 단계별 축소판 — 고른 단계 하나만 그린다 */
function FlowMockView({ mock }: { mock: FlowMock }) {
  if (mock === "capture") return <CaptureMock />;
  if (mock === "analyze") return <AnalyzeMock />;
  if (mock === "assign") return <AssignMock />;
  return <HandoverMock />;
}

export function FlowSection() {
  const [selected, setSelected] = useState(0);

  /*
    ⚠️ **스크롤이 단계를 넘긴다**(2026-08-12). 눌러야만 바뀌면, 네 단계가 이어진 하나의 흐름이라는
       게 안 읽힌다 — 내려가는 동안 화면이 고정된 채 단계만 바뀌면 그 이어짐이 몸으로 느껴진다.
    ⚠️ **누르는 것도 그대로 산다.** 카드를 누르면 그 단계의 스크롤 자리로 옮겨 간다 —
       상태만 바꾸면 다음 스크롤 한 칸에 곧바로 되돌아간다(스크롤이 정본이라서).
    ⚠️ **모션을 줄여 달라는 사람에게는 안 건다.** 고정 스크롤은 멀미를 유발하는 대표 연출이라,
       그때는 예전처럼 눌러서 보는 화면이 된다(`isPinned`가 꺼진다).
  */
  const track = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const isPinned = !prefersReduced;

  /*
    ⚠️ **붙은 뒤에 잰다.** 서버가 그린 HTML이 React에 붙기 전(하이드레이션 전)에 ref를 재려 들면
       `Target ref is defined but not hydrated`로 터진다(motion 공식 문서의 그 오류 —
       실제로 화면이 멈췄다, 2026-08-12). 붙은 뒤에야 `target`을 건넨다.
  */
  /*
    ⚠️ 효과 안에서 상태를 세우지 않는다(`react-hooks/set-state-in-effect`) — 렌더가 한 번 더 돈다.
       `useSyncExternalStore`는 서버에서 `false`, 브라우저에서 `true`를 주므로 같은 일을
       한 번에 한다.
  */
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    container.current = document.getElementById("app-scroll");
  }, []);

  /*
    ⚠️ **스크롤 주체를 알려준다.** 이 사이트는 `body`가 아니라 `#app-scroll`이 스크롤한다
       (화면 배율 기능 때문이다 — `globals.css`). 안 알려주면 진행도가 늘 0이라 단계가 안 넘어간다.
  */
  /*
    ⚠️ **참조를 고정한다.** 매 렌더 새 객체(`{ current: el }`)를 넘기면 구독이 매번 새로 붙었다
       떨어져 진행도가 영영 안 온다 — 실제로 단계가 안 넘어갔다(2026-08-12).
  */
  const container = useRef<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll({
    container,
    target: isMounted ? track : undefined,
    /* 구간이 화면 위에 닿을 때 0, 바닥을 지날 때 1 */
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (!isPinned) return;
    const index = stepIndexFromProgress(progress, FLOW_STEPS.length);
    setSelected((prev) => (prev === index ? prev : index));
  });

  /*
    ⚠️ **손이 움직이면 화면도 움직여야 한다.** 고정 구간에서 아무것도 안 움직이면 사람은
       "여기 스크롤이 안 되나?" 하고 손을 뗀다 — 단계는 네 번만 바뀌지만, 진행 막대와 패널은
       **스크롤에 붙어 계속** 움직여서 지금 굴러가는 중임을 몸으로 알린다(2026-08-12 피드백).
  */
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const panelDrift = useTransform(scrollYProgress, [0, 1], [14, -14]);

  /**
   * 누른 단계의 스크롤 자리로 옮긴다 — 스크롤과 상태가 다투지 않게.
   *
   * ⚠️ **좌표를 전부 `#app-scroll` 기준으로 잰다**(2026-08-14). 예전엔 `offsetTop`(가장 가까운
   *    `position` 조상 = `<main>` 기준)과 `window.innerHeight`(창 높이)를 섞어 썼는데,
   *    스크롤을 맡는 건 `#app-scroll`이고 `body`에는 **화면 배율 `transform: scale()`** 이
   *    걸려 있다(§globals.css). 75%·80%·90% 배율에서 두 좌표계가 어긋나 엉뚱한 자리로 갔다.
   * ⚠️ `getBoundingClientRect`는 **배율이 적용된 뒤** 값이라, `scrollTop`이 쓰는 배율 전
   *    좌표로 되돌려야 한다 — 그래서 배율로 나눈다.
   */
  function goToStep(index: number) {
    setSelected(index);
    if (!isPinned || !track.current) return;

    const container = document.getElementById("app-scroll");
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    /* 화면에 찍힌 높이 ÷ 레이아웃 높이 = 지금 걸린 배율. 0으로 나누지 않게 막아 둔다 */
    const scale = container.clientHeight > 0 ? containerRect.height / container.clientHeight : 1;
    if (!Number.isFinite(scale) || scale <= 0) return;

    const trackRect = track.current.getBoundingClientRect();
    const trackTop = container.scrollTop + (trackRect.top - containerRect.top) / scale;
    const span = trackRect.height / scale - container.clientHeight;

    /* 칸의 **가운데**로 간다 — 경계에 서면 다음 스크롤 한 칸에 옆 단계로 넘어간다 */
    const ratio = (index + 0.5) / FLOW_STEPS.length;
    /* ⚠️ `window.scrollTo`는 Lenis가 다음 프레임에 덮어써 안 먹는다 — 그쪽에 부탁한다 */
    smoothScrollTo(trackTop + Math.max(0, span) * ratio);
  }

  return (
    /*
      ⚠️ 여기에 배경 Z를 따로 깔지 않는다. 랜딩 전체 배경(`LandingBackdrop`)의 **도는 3D Z**가
         이미 이 자리에 비친다 — 평면 Z를 덧대면 기울기가 다른 Z 둘이 포개져 정체불명의
         흰 조각으로 보인다.
      ⚠️ 색은 배경 한 장에서만 나온다는 규칙이기도 하다(§섹션마다 배경을 따로 칠하지 않는다).
    */
    <div
      ref={track}
      /*
        ⚠️ **키가 화면 넷을 합친 만큼**이다(`400vh`). 그 안에서 화면은 붙박여 있고, 스크롤은
           단계를 넘기는 데 쓰인다 — 한 단계당 화면 하나만큼 내려가면 다음으로 간다.
        ⚠️ 고정을 안 걸 때는(모션 최소화) 예전처럼 **내용 높이 그대로** 둔다. 안 그러면
           아무 일도 없는 빈 화면 셋을 지나야 한다.
        ⚠️ **배율로 나눈 `vh`** 다(2026-08-14). `body`가 `100% / var(--app-scale)` 크기로 잡히고
           `transform: scale()`로 줄어들어서, 그 안에서 `100vh`는 실제 화면보다 **배율만큼 크다**
           — 75% 배율이면 한 단계가 화면 1.33개 길이가 된다. `%`로 바꿔 봤더니 그건 부모 높이
           기준이라 더 어긋났다(실측 20146px). `h-screen-z`가 `dvh`를 금지한 것과 같은 이유다.
      */
      className={cn(isPinned && "relative h-[calc(400vh/var(--app-scale))]")}
    >
      {/*
        ⚠️ **세로 방향 flex다**(`flex-col`). 가로 방향으로 두면 안쪽 `<section>`이 flex 아이템이
           되어 **내용 폭만큼만 넓어진다** — 가운데 정렬(`mx-auto`)이 죽고 화면 왼쪽에 몰린다
           (2026-08-12에 실제로 그렇게 깨졌다).
      */}
      <div className={cn(isPinned && "sticky top-0 flex min-h-screen flex-col justify-center")}>
        <DarkSection
          /*
        ⚠️ **고정 화면에서는 위아래 여백을 줄인다.** 원래 여백(py-20/28)은 페이지를 흘려보낼 때의
           값이라, 화면 하나에 제목·카드 넉 장·축소판을 다 담아야 하는 여기서는 아래가 잘린다
           (2026-08-12에 실제로 잘렸다).
      */
          className={cn(isPinned && "py-12 lg:py-12")}
        >
          {/* 밝은 섹션과 같은 헤더 문법 — eyebrow + 중앙 제목 */}
          <div className="flex flex-col items-center gap-2.5 text-center">
            <p className="text-landing-accent text-[11px] leading-4 font-semibold tracking-[1.1px] uppercase">
              Flow
            </p>
            <h2 className="text-[32px] leading-[40px] font-semibold tracking-[-0.7px] break-keep lg:text-[36px] lg:leading-[44px]">
              회의부터 인수인계까지, 하나로 이어집니다
            </h2>
          </div>

          <ol className="grid gap-3 pt-12 sm:grid-cols-2 lg:grid-cols-4">
            {/* 내려오면 카드가 차례로 떠오른다 — 스크롤 타임라인(reveal-on-scroll) */}
            {FLOW_STEPS.map((item, index) => (
              <li key={item.step} className="reveal-on-scroll">
                <button
                  type="button"
                  aria-pressed={index === selected}
                  onClick={() => goToStep(index)}
                  className={cn(
                    /* ⚠️ 밝은 무대에서는 흰 카드가 흰 바탕 위에 뜬다 — 선만으로는 층이 안 생기므로
                     **그림자로 들어 올린다.** 어두운 무대는 지금 그대로 둔다(§landing-light 변형) */
                    "focus-visible:ring-ring h-full w-full rounded-xl border p-6 text-left transition-all duration-300 focus-visible:ring-2 focus-visible:outline-hidden",
                    "landing-light:shadow-[0_1px_2px_rgba(37,99,235,0.05),0_12px_30px_-14px_rgba(37,99,235,0.18)] landing-light:hover:shadow-[0_2px_5px_rgba(37,99,235,0.07),0_20px_42px_-16px_rgba(37,99,235,0.26)]",
                    /*
                  ⚠️ 고른 카드의 보라 글로우는 **검정 위에서만 통한다.** 흰 바탕에서는
                     번진 자국처럼 보인다 — 밝은 쪽은 글로우를 끄고 **더 깊은 그림자와
                     액센트 테두리**로 고른 것을 알린다.
                */
                    index === selected
                      ? "glow-ring-rgb bg-landing-dark-surface landing-light:bg-gradient-to-b landing-light:from-white landing-light:to-[#fbfbfa] landing-light:border-landing-accent/35 landing-light:shadow-[0_2px_6px_rgba(28,25,23,0.06),0_20px_44px_-18px_rgba(37,99,235,0.35)] -translate-y-1 border-transparent shadow-[0_0_40px_-8px_rgba(124,58,237,0.45)]"
                      : "border-landing-dark-border bg-landing-dark-surface landing-light:bg-gradient-to-b landing-light:from-white landing-light:to-[#fbfbfa] hover:-translate-y-0.5",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p
                      className={cn(
                        "text-[11px] leading-4 font-semibold tabular-nums",
                        index === selected ? "text-landing-accent" : "text-landing-dark-muted",
                      )}
                    >
                      {item.step}
                    </p>
                    <StepIcon icon={item.icon} isSelected={index === selected} />
                  </div>
                  <p className="pt-2 text-[16px] leading-6 font-semibold">{item.title}</p>
                  <p className="text-landing-dark-muted pt-1.5 text-[13px] leading-5 break-keep">
                    {item.body}
                  </p>
                </button>
              </li>
            ))}
          </ol>

          {/*
        진행 막대 — 이 구간을 얼마나 지났는지 한 줄로 말한다.
        ⚠️ 고정된 화면에서 **유일하게 손을 따라 움직이는 것**이라, 이게 없으면 화면이 멈춘 줄 안다.
        ⚠️ 고정을 안 걸 때는 그릴 이유가 없다 — 스크롤이 곧 페이지 이동이라 이미 티가 난다.
      */}
          {isPinned && (
            <div className="bg-landing-dark-border relative mt-6 h-px w-full overflow-hidden">
              <motion.span
                aria-hidden
                style={{ scaleX: progressScale }}
                className="bg-landing-accent absolute inset-0 block origin-left"
              />
            </div>
          )}

          {/*
        고른 단계의 화면 축소판 — 단계가 바뀌면 아래에서 다시 떠오른다.
        ⚠️ 폭은 **위 카드 줄과 같다.** 카드 넉 장이 화면을 가로지르는데 아래 패널만 좁으면
           아래가 빈 것처럼 보인다 — 대신 축소판이 헐거워지지 않게 안을 두 칸으로 채웠다
           (`flow-mock-aside.tsx`).
        ⚠️ 높이를 **가장 큰 단계에 맞춰 고정**한다(`h-[352px]`, `min-h`가 아니다).
           누를 때마다 패널이 커졌다 작아졌다 하면 그 출렁임이 내용보다 먼저 보인다.
           내용이 짧은 단계는 각 축소판이 `mt-auto`로 아래를 채운다.
      */}
          <motion.div
            style={isPinned ? { y: panelDrift } : undefined}
            className={cn(
              "border-landing-dark-border bg-landing-dark-surface landing-light:bg-gradient-to-b landing-light:from-white landing-light:to-[#fbfbfa] mt-6 h-[352px] overflow-hidden rounded-xl border backdrop-blur",
              "landing-light:shadow-[0_1px_2px_rgba(37,99,235,0.05),0_12px_30px_-14px_rgba(37,99,235,0.18)]",
            )}
          >
            {/*
              ⚠️ **넷을 한 줄에 두고 옆으로 민다**(2026-08-12). 한 장씩 갈아 끼우면 "바뀌었다"는
                 결과만 남고 **움직임이 안 보인다** — 옆으로 밀리면 네 단계가 이어진 한 줄이라는
                 것이 눈에 잡히고, 스크롤이 그 줄을 굴리는 중임이 몸으로 읽힌다.
              ⚠️ 넷 다 그려 두므로 전환에 빈 화면이 없다. 목업 문장은 가짜라 통째로 숨긴다
                 (§정직성·a11y) — 넷을 다 두어도 스크린 리더가 네 배로 읽지 않는다.
              ⚠️ 폭은 `400%`, 각 칸은 `w-1/4`다 — 단계 수가 바뀌면 두 값을 같이 본다.
            */}
            {/*
              ⚠️ **미는 일은 CSS가 한다.** motion에게 `x: "-50%"`를 시켰더니 퍼센트를 제 폭이
                 아닌 다른 기준으로 풀어 76px만 움직이고 멈췄다(2026-08-12에 직접 확인) —
                 CSS `translateX(%)`는 **제 폭 기준**이라 칸이 정확히 한 칸씩 넘어간다.
              ⚠️ 시간은 500ms다. 토큰(100/150/250)보다 길지만, 이건 상태가 바뀌는 게 아니라
                 **화면 한 칸이 통째로 지나가는 이동**이라 그 거리에 맞는 시간이 필요하다.
            */}
            <div
              aria-hidden
              className="flex h-full w-[400%] transition-transform duration-500 ease-out motion-reduce:transition-none"
              style={{ transform: `translateX(-${selected * 25}%)` }}
            >
              {FLOW_STEPS.map((item, index) => (
                /*
                  ⚠️ **열린 칸만 조립한다.** 넷을 한꺼번에 조립하면 옆 칸에서 이미 다 끝나 있어
                     정작 도착했을 때는 볼 게 없다.
                  ⚠️ `key`에 열림 여부를 섞는다 — CSS 애니메이션은 클래스만 갈아 끼워서는 다시
                     안 돈다. 열릴 때마다 새로 마운트돼야 조각이 처음부터 날아온다.
                */
                <div
                  key={`${item.step}${index === selected ? "-on" : ""}`}
                  className={cn("flex h-full w-1/4 flex-col p-5", index === selected && "assemble")}
                >
                  <FlowMockView mock={item.mock} />
                </div>
              ))}
            </div>
          </motion.div>
        </DarkSection>
      </div>
    </div>
  );
}

function StepIcon({ icon: Icon, isSelected }: { icon: LucideIcon; isSelected: boolean }) {
  return (
    <span
      className={cn(
        "flex size-7 items-center justify-center rounded-lg border transition-colors",
        isSelected
          ? "border-landing-accent/60 bg-landing-accent/15 text-landing-accent"
          : "border-landing-dark-border text-landing-dark-muted",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
    </span>
  );
}

/** 축소판 머리 — 네 단계가 같은 문법을 쓴다(왼쪽 상태 · 오른쪽 수치) */
