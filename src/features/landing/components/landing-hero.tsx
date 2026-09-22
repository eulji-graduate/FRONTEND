import { ArrowRight, Check, Sparkles } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { HERO_NOTE } from "../content";
import { AppPreview } from "./app-preview";
import { TiltCard } from "./tilt-card";

/** 첫 화면 — 한 문장으로 무엇을 하는 서비스인지 말한다. */
export function LandingHero() {
  return (
    /*
        ⚠️ 섹션에 **자체 광원을 두지 않는다.** `overflow-hidden`이 번진 빛을 섹션 경계에서
           잘라 화면을 가로지르는 선이 생긴다 — 색으로 섹션이 나뉜 것처럼 보인다.
           광원은 무대(`LandingBackdrop`) 한 곳에서만 나온다.
      */
    <section className="relative py-20 lg:py-28">
      <div className="relative mx-auto grid w-full max-w-[1144px] items-center gap-14 px-7 lg:grid-cols-2">
        {/* 들어온 순간 왼쪽 덩어리가 한 번에 떠오른다 — 한 번만 돌고 끝나는 등장이라 안전하다 */}
        <div className="animate-in fade-in-0 slide-in-from-bottom-3 flex flex-col items-start gap-5 duration-700">
          {/*
            눈썹 배지 — 제목보다 먼저 "무엇 하는 물건인지"를 한 줄로.
            ⚠️ 한 덩어리 회색 알약은 눈에 안 걸린다. 앞에 **AI 태그**를 물려
               둘로 나누고, 태그만 색을 준다(랜딩 색 예외). 문구도 동작을 말하게 고쳤다.
            ⚠️ 여기서 말하는 AI는 요약·액션 분배다 — STT는 브라우저 기능이라 AI로 부르지 않는다.
          */}
          <span className="border-border bg-card text-muted-foreground flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 text-[12px] leading-4 shadow-sm">
            <span className="bg-landing-violet/12 text-landing-violet flex items-center gap-1 rounded-full px-2 py-1 font-semibold">
              <Sparkles className="size-3" aria-hidden />
              {/* 한글 글자가 상자 안에서 위쪽에 앉아 아이콘보다 떠 보인다 — 1px 내려 맞춘다 */}
              <span>AI 회의 정리</span>
            </span>
            {/* 알약 안 글자를 1px 내렸으니 옆 문구도 같이 내려야 두 글줄이 한 선에 선다 */}
            <span className="text-foreground/80">
              말하면 기록되고, 끝나면 <strong className="font-semibold">할 일</strong>이 됩니다
            </span>
          </span>

          {/*
            둘째 줄만 파랑→보라 그러데이션 — 시안을 따른다.
            "색으로 알리는 건 에러뿐" 규칙은 로그인 뒤 상태 표시 이야기다.
            랜딩은 정체성을 색으로 말하는 화면이라 예외로 둔다(팀 확인: 색 더 써도 됨).
          */}
          <h1 className="text-[44px] leading-[52px] font-semibold tracking-[-1.3px] break-keep lg:text-[60px] lg:leading-[66px] lg:tracking-[-1.9px]">
            회의를 하면,
            <br />
            <span className="bg-gradient-to-r from-[#3b82f6] via-[#7c3aed] to-[#8b5cf6] bg-clip-text text-transparent">
              조직의 기억이 된다
            </span>
          </h1>

          {/*
            핵심 단어만 진하게 — 문장 전체가 회색이면 눈이 지나친다.
            ⚠️ 두 문장을 **줄로 갈라** 놓는다. 한 덩어리로 흐르면 어디까지가 한 생각인지 안 보인다.
               `block`이라 좁은 화면에서도 문장 경계에서만 끊긴다(`<br>`은 아무 데서나 끊긴다).
          */}
          <p className="text-muted-foreground max-w-[460px] text-[17px] leading-[29px] break-keep">
            <span className="block">
              기록은 <strong className="text-foreground font-semibold">Z가 하고</strong>, 팀은
              회의에만 집중하세요.
            </span>
            <span className="block pt-1">
              결정은 곧바로{" "}
              <strong className="text-foreground font-semibold">담당자의 할 일</strong>이 됩니다.
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Link
              href="/register"
              className={cn(
                buttonVariants(),
                "group bg-foreground text-background hover:bg-foreground/90 h-11 gap-1.5 rounded-lg px-5 text-[13px] shadow-lg transition-shadow hover:shadow-xl",
              )}
            >
              시작하기
              {/* 호버하면 화살표가 앞서 나간다 */}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/plans"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-border bg-card hover:bg-secondary h-11 rounded-lg px-5 text-[13px] shadow-sm transition-shadow hover:shadow-md",
              )}
            >
              요금제 보기
            </Link>
          </div>

          <p className="text-muted-foreground/70 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12px] leading-[18px]">
            {HERO_NOTE.split(" · ").map((note) => (
              <span key={note} className="flex items-center gap-1">
                <Check className="text-landing-green size-3" strokeWidth={3} aria-hidden />
                {note}
              </span>
            ))}
          </p>
        </div>

        {/* 커서를 따라 프레임이 기운다 — 스크롤하면 글보다 느리게 밀려 깊이가 생긴다 */}
        <div className="parallax-up">
          <TiltCard>
            <AppPreview />
          </TiltCard>
        </div>
      </div>
    </section>
  );
}
