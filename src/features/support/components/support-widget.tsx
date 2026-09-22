"use client";

import { RotateCcw, Search, X } from "lucide-react";
import { useState } from "react";

import { ZLogo } from "@/components/icons/z-logo";

import {
  FAQ_CATEGORY_LABEL,
  FAQ_FALLBACK,
  FAQ_GREETING,
  FAQ_NARROW,
  type FaqCategory,
  type FaqEntry,
} from "../faq";
import { entriesOfCategory } from "../faq-entries";
import { findFaqCandidates } from "../match";
import { SupportThread, type Turn } from "./support-thread";

/**
 * 랜딩 우하단 도움말.
 *
 * ⚠️ **AI라고 부르지 않는다.** 미리 적어 둔 답을 키워드로 찾아 주는 것뿐이다
 *    (CLAUDE.md §AI 기능: AI 아닌 것을 AI라 부르지 않는다).
 * ⚠️ **한 번에 답하지 않고 좁혀 간다.** 갈래를 고르고 → 질문을 고르면 → 답이 나온다.
 *    자유롭게 친 말도 여럿이 걸리면 되묻는다 — 잘못 짚는 것보다 낫다.
 * ⚠️ 서버를 부르지 않는다 — 답이 전부 번들 안에 있다. 그래서 즉시 뜨고 오프라인에서도 된다.
 *    ⚠️ **화면에 흘러오는 건 연출이다**(`use-streamed-markdown.ts`). 답 자체는 이미 손에
 *       있고, 조각조각 보여주는 시간만 지연이다 — 이 지연 때문에 위 문장이 거짓이 되진 않는다.
 * ⚠️ 색은 **랜딩 밝기를 따라간다.** 앱 토큰(`--popover`·`--border`·`--foreground`)을 쓰면
 *    `.landing-night`이 어두운 값으로 덮고, 밝은 무대에서는 기본값이 그대로 산다.
 *    온보딩 도움말은 앱 안이라 여전히 `--guide-*`(항상 어두움)를 쓴다 — 무대가 다르다.
 */

/** 처음 화면 — 인사와 갈래 고르기 */
const OPENING: Turn = { kind: "categories", text: FAQ_GREETING };

export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<readonly Turn[]>([OPENING]);

  /** 사람이 한 말 + 그에 대한 응답을 한 번에 붙인다 */
  const reply = (said: string, next: Turn) =>
    setTurns((prev) => [...prev, { kind: "said", text: said }, next]);

  const handleCategory = (category: FaqCategory) =>
    reply(FAQ_CATEGORY_LABEL[category], {
      kind: "choices",
      text: FAQ_NARROW,
      entries: entriesOfCategory(category),
    });

  const handlePick = (entry: FaqEntry) => reply(entry.question, { kind: "answer", entry });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const asked = input.trim();
    if (!asked) return;
    setInput("");

    /*
      ⚠️ 하나만 걸리면 바로 답하고, 여럿이면 **되묻는다.** 점수가 제일 높은 걸 그냥 내놓으면
         "요금" 하나로 세 가지가 걸릴 때 엉뚱한 답이 나간다.
    */
    const [first, ...rest] = findFaqCandidates(asked);
    if (!first) {
      reply(asked, { kind: "categories", text: FAQ_FALLBACK });
      return;
    }
    if (rest.length === 0) {
      reply(asked, { kind: "answer", entry: first });
      return;
    }
    reply(asked, { kind: "choices", text: FAQ_NARROW, entries: [first, ...rest] });
  };

  return (
    <>
      {/*
        ⚠️ `fixed`라 스크롤과 무관하게 늘 같은 자리에 있다. 우하단은 고객센터 위젯이 있는
           자리로 이미 알려져 있어 설명이 필요 없다.
      */}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "도움말 닫기" : "도움말 열기"}
        /*
          ⚠️ 버튼도 **패널과 같은 톤**이다. 밝기를 뒤집어 놓으면(밝은 화면에 검은 원)
             열기 전과 후의 색이 달라져 다른 물건처럼 보인다.
          ⚠️ 같은 톤이라 밝은 무대에서는 흰 원이 흰 바탕에 묻힌다 — 선과 그림자로 띄운다.
          ⚠️ 글자색은 **버튼이 한 번만** 정한다. 아이콘마다 따로 주면 열기(?)와 닫기(X)의
             색이 어긋나 같은 버튼이 아닌 것처럼 보인다.
          ⚠️ **밝을 때만 먹색을 꽉 채운다.** 흰 원 위 흐린 회색은 눈에 안 걸린다.
             어두울 때는 검정 무대에 흰 원이 이미 또렷해서 한 단 눌러 둔 채로 둔다.
        */
        className="bg-popover text-popover-foreground/70 landing-light:text-popover-foreground border-foreground/20 focus-visible:ring-ring fixed right-5 bottom-5 z-50 flex size-12 items-center justify-center rounded-full border shadow-lg transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:outline-hidden"
      >
        {/*
          ⚠️ **닫혀 있을 땐 Z 표식**이다. 이 창은 우리가 정해 둔 답을 돌려주는 곳이라
             표식도 우리 것이어야 한다 — 일반 아이콘은 브라우저 확장이나 외부 위젯처럼 읽힌다.
          ⚠️ 로고는 `currentColor`라 **버튼이 정한 글자색을 그대로 따라간다.** 밝은 화면에선
             먹색, 어두운 화면에선 흰색이 되어 따로 손댈 곳이 없다(§디자인 토큰).
        */}
        {isOpen ? (
          <X className="size-5" aria-hidden />
        ) : (
          <ZLogo className="size-[18px]" aria-hidden />
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="도움말"
          /*
            ⚠️ 높이를 **처음부터 고정**한다(`max-h`가 아니라 `h`). 내용에 따라 자라면 답이 붙을
               때마다 창이 커졌다 작아졌다 해서 화면이 출렁인다 — 틀은 가만히 있고 안에서만
               굴러가는 편이 읽기에도 낫다.
            ⚠️ 다만 **화면 최대치로 잡지 않는다.** 열자마자 아래가 텅 비어 보인다.
               첫 화면(인사 + 갈래 다섯)이 거의 꽉 차는 높이로 맞추고, 그보다 긴 답은 굴린다.
          */
          /*
            ⚠️ Esc로 닫힌다. 열어 놓고 나갈 길이 키보드에 없으면 갇힌다(§a11y).
               전역 리스너를 걸지 않는다 — 열면 입력칸으로 포커스가 들어오므로 여기서 다 받는다.
          */
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
          className="bg-popover border-border animate-in fade-in slide-in-from-bottom-2 fixed right-5 bottom-20 z-50 flex h-[min(78dvh,580px)] max-h-[calc(100dvh-6rem)] w-[min(calc(100vw-2.5rem),380px)] flex-col overflow-hidden rounded-2xl border shadow-2xl duration-200"
        >
          <div className="border-border flex items-center gap-2.5 border-b px-4 py-3.5">
            {/*
              ⚠️ **돋보기**다. 이 위젯이 실제로 하는 일은 정해진 답을 **찾아 주는 것**이라
                 표식도 그렇게 읽혀야 한다.
              ⚠️ **여기에 Z를 두지 않는다.** 아래 인사 블록에 이미 Z가 있어서, 열자마자
                 같은 표식이 두 개 겹쳐 보였다 — 브랜드는 **런처 버튼**이 맡고
                 창 머리는 이 창이 무엇을 하는 곳인지를 맡는다.
              ⚠️ 말풍선·헤드셋은 쓰지 않는다 — 사람이나 AI가 답해 주는 것처럼 읽히는데
                 여기엔 사람도 AI도 없다(§정직성). 반짝이는 AI 표식이라 더 안 된다.
              ⚠️ 어두울 땐 회색, 밝을 땐 먹색을 한 단 눌러서. 밝은 바탕의 회색은 흐리멍덩하고,
                 진한 먹색은 머리글보다 먼저 튄다.
            */}
            <span className="bg-secondary text-muted-foreground landing-light:text-foreground/70 border-border flex size-8 shrink-0 items-center justify-center rounded-full border">
              <Search className="size-[18px]" aria-hidden />
            </span>

            <span>
              <span className="text-popover-foreground block text-[13px] leading-5 font-medium">
                도움말
              </span>
              {/* ⚠️ 무엇인지 정확히 말한다 — "AI 상담원"이 아니다 */}
              <span className="text-muted-foreground block text-[11px] leading-4">
                자주 묻는 질문에서 찾아드립니다
              </span>
            </span>

            {/* ⚠️ 처음 화면(갈래 고르기)으로 돌아갈 길 — 없으면 대화에 갇힌다 */}
            {turns.length > 1 && (
              <button
                type="button"
                onClick={() => setTurns([OPENING])}
                className="text-muted-foreground hover:text-popover-foreground focus-visible:ring-ring/40 ml-auto flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] leading-4 transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
              >
                <RotateCcw className="size-3" aria-hidden />
                <span>처음으로</span>
              </button>
            )}
          </div>

          <SupportThread turns={turns} onPickCategory={handleCategory} onPickEntry={handlePick} />

          <form onSubmit={handleSubmit} className="border-border border-t p-3">
            <label htmlFor="support-input" className="sr-only">
              궁금한 것을 입력하세요
            </label>
            <input
              id="support-input"
              /* 열면 바로 칠 수 있게 — 키보드로 여기까지 탭으로 걸어오게 두지 않는다 */
              autoFocus
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="직접 입력해도 됩니다"
              autoComplete="off"
              className="text-popover-foreground placeholder:text-muted-foreground/70 focus-visible:ring-ring/40 border-border bg-secondary h-10 w-full rounded-lg border px-3 text-[13px] focus-visible:ring-2 focus-visible:outline-hidden"
            />
          </form>
        </div>
      )}
    </>
  );
}
