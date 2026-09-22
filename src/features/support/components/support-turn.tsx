"use client";

import { ArrowUpRight, Mail, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";

import { MarkdownContent } from "@/components/common/markdown-content";
import { cn } from "@/lib/utils";

import {
  FAQ_CATEGORY,
  FAQ_CATEGORY_ICON,
  FAQ_CATEGORY_LABEL,
  type FaqCategory,
  type FaqEntry,
  SUPPORT_EMAIL,
} from "../faq";
import { useStreamedMarkdown } from "../use-streamed-markdown";

/**
 * 오간 말 한 마디.
 *
 * ⚠️ 네 가지뿐이다 — 사람이 한 말 · 갈래 고르기 · 질문 고르기 · 답.
 *    "되묻기"를 따로 두는 게 이 화면의 핵심이다. 바로 답하면 잘못 짚는다.
 */
export type Turn =
  | { kind: "said"; text: string }
  | { kind: "categories"; text: string }
  | { kind: "choices"; text: string; entries: readonly FaqEntry[] }
  | { kind: "answer"; entry: FaqEntry };

const CHIP =
  "text-popover-foreground border-border focus-visible:ring-ring/40 flex w-full items-center gap-2 rounded-lg border bg-secondary px-3 py-1.5 text-left text-[12px] leading-[18px] transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:outline-hidden";

interface SupportTurnProps {
  turn: Turn;
  /** 첫 마디인지 — 문의처는 **되물었을 때만** 붙인다 */
  isOpening: boolean;
  onPickCategory: (category: FaqCategory) => void;
  onPickEntry: (entry: FaqEntry) => void;
}

/** 말풍선 하나 */
export function SupportTurn({ turn, isOpening, onPickCategory, onPickEntry }: SupportTurnProps) {
  /*
    ⚠️ 훅은 분기 밖에서 부른다(Rules of Hooks) — 답이 아닌 말은 빈 문자열을 넘겨
       스트리밍할 게 없게 만든다.
  */
  const { text: streamedAnswer, isStreaming } = useStreamedMarkdown(
    turn.kind === "answer" ? turn.entry.answer : "",
  );

  // 사람이 한 말 — 오른쪽에 붙여 누가 한 말인지 모양으로 구분한다
  if (turn.kind === "said") {
    return (
      <p className="bg-foreground text-background ml-auto max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-[12px] leading-[18px] break-keep">
        {turn.text}
      </p>
    );
  }

  return (
    /*
      ⚠️ 말풍선마다 Z 표식을 붙이지 않는다. 한 줄 걸러 같은 그림이 반복되면 시끄럽고,
         누가 말하는지는 **좌우 위치와 모양**으로 이미 구분된다 — 표식은 머리에 하나면 된다.
    */
    <div className="border-border bg-secondary max-w-[92%] rounded-2xl rounded-bl-sm border px-3.5 py-3">
      {/*
        ⚠️ **답만 마크다운을 렌더한다**(공지 본문과 같은 `MarkdownContent`, §AI 기능:
           XSS 방어는 `rehype-sanitize`가 맡는다). 우리가 미리 써 둔 답이라 안전하지만,
           같은 컴포넌트를 쓰는 게 방어를 두 벌로 안 만든다.
        ⚠️ **서버에서 오는 척 조각조각 흘린다**(`useStreamedMarkdown`) — 답은 이미
           번들 안에 있지만, 한 번에 툭 뜨지 않고 흘러오는 느낌을 낸다.
        ⚠️ 흐르는 동안 글 끝에 캐럿이 선다 — **본문에 글자를 이어 붙이지 않고**
           `.streaming-caret`이 `::after`로 그린다(옛 `▌`는 폰트가 크기를 정해 슬래브처럼
           컸고 스크린리더가 글자로 읽었다, §globals.css).
        ⚠️ 되묻는 말(갈래·질문 목록 위 안내 문구)은 짧은 고정 문구라 그대로 평문 +
           `whitespace-pre-line`을 쓴다 — 빈 줄이 그대로 문단이 된다.
      */}
      {turn.kind === "answer" ? (
        <MarkdownContent
          content={streamedAnswer}
          className={cn(
            "text-popover-foreground max-w-none text-[12px] leading-[20px] break-keep",
            isStreaming && "streaming-caret",
          )}
        />
      ) : (
        <p className="text-popover-foreground text-[12px] leading-[20px] break-keep whitespace-pre-line">
          {turn.text}
        </p>
      )}

      {turn.kind === "categories" && (
        <ul className="flex flex-col gap-1 pt-2.5">
          {Object.values(FAQ_CATEGORY).map((category) => {
            const Icon = FAQ_CATEGORY_ICON[category];
            return (
              <li key={category}>
                <button type="button" onClick={() => onPickCategory(category)} className={CHIP}>
                  <Icon className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                  {/* 한글이 아이콘보다 떠 보인다 — 1px 내려 맞춘다 */}
                  <span>{FAQ_CATEGORY_LABEL[category]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {turn.kind === "choices" && (
        <ul className="flex flex-col gap-1 pt-2.5">
          {turn.entries.map((entry) => (
            <li key={entry.id}>
              <button type="button" onClick={() => onPickEntry(entry)} className={CHIP}>
                <MessageCircleQuestion
                  className="text-muted-foreground size-3.5 shrink-0"
                  aria-hidden
                />
                <span>{entry.question}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ⚠️ 흐르는 중엔 안 보인다 — 답이 다 오기 전에 버튼이 먼저 뜨면 어수선하다 */}
      {turn.kind === "answer" && !isStreaming && turn.entry.links && (
        <div className="flex flex-wrap gap-1.5 pt-3">
          {turn.entry.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-popover-foreground border-border focus-visible:ring-ring/40 hover:bg-accent inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] leading-4 transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
            >
              {link.label}
              <ArrowUpRight className="size-3" aria-hidden />
            </Link>
          ))}
        </div>
      )}

      {/* 못 찾았을 때만 문의처를 붙인다 — 답을 준 자리에 또 물어보라고 하면 어수선하다 */}
      {turn.kind === "categories" && !isOpening && (
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="text-muted-foreground border-border focus-visible:ring-ring/40 hover:text-popover-foreground hover:bg-accent mt-2.5 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] leading-4 transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
        >
          <Mail className="size-3" aria-hidden />
          <span>{SUPPORT_EMAIL}</span>
        </a>
      )}
    </div>
  );
}
