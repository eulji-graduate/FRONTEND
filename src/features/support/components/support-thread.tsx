"use client";

import { useEffect, useRef } from "react";

import { ZLogo } from "@/components/icons/z-logo";

import type { FaqCategory, FaqEntry } from "../faq";
import { SupportTurn, type Turn } from "./support-turn";

export type { Turn };

interface SupportThreadProps {
  turns: readonly Turn[];
  onPickCategory: (category: FaqCategory) => void;
  onPickEntry: (entry: FaqEntry) => void;
}

/**
 * 주고받은 내용.
 *
 * ⚠️ `role="log"` — 답이 새로 붙는 걸 스크린 리더가 따라 읽는다.
 * ⚠️ 스크롤 막대는 **사이트 전체에서 감춘다**(`globals.css`) — 여기서 따로 붙이지 않는다.
 *    막대만 지우는 것이라 휠·트랙패드·키보드는 그대로다.
 * ⚠️ **`data-lenis-prevent`가 필요하다.** 랜딩 전체는 `SmoothScroll`(Lenis)이 휠을 가로채
 *    `#app-scroll`을 굴린다 — 이 속성이 없으면 이 창 안에서 굴려도 Lenis가 이벤트를
 *    가로채 뒤에 있는 랜딩 페이지가 스크롤되고, 이 안은 안 움직인다(§smooth-scroll).
 */
export function SupportThread({ turns, onPickCategory, onPickEntry }: SupportThreadProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  /*
    말이 늘거나 자랄 때마다 **맨 아래로 붙인다.**
    ⚠️ `turns.length`가 아니라 **콘텐츠 높이를 감시**한다(`ResizeObserver`). 답이
       스트리밍처럼 조각조각 흘러 들어오면(`useStreamedMarkdown`) 말 수는 안 늘어도
       한 말풍선의 키가 계속 자란다 — 그때마다도 바닥에 붙어 있어야 방금 온 조각이
       가려지지 않는다.
    ⚠️ `behavior: "smooth"`를 쓰지 않는다. 등장 애니메이션과 겹치면 부드러운 스크롤이
       중간에 취소돼 아예 안 움직인다.
    ⚠️ 말이 아래에서부터 쌓이므로(`mt-auto`) 맨 아래가 곧 방금 온 답이다 —
       위에 가려지는 건 이미 읽은 말이라 괜찮다.
  */
  useEffect(() => {
    const box = boxRef.current;
    const content = contentRef.current;
    if (!box || !content) return;

    const scrollToBottom = () => {
      box.scrollTop = box.scrollHeight;
    };

    scrollToBottom();
    const observer = new ResizeObserver(scrollToBottom);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      role="log"
      /* ⚠️ `role="log"`인 div는 기본적으로 포커스를 못 받는다. 스크롤바까지 숨겨 놨으므로
         `tabIndex`가 없으면 키보드만 쓰는 사람은 위로 올라간 답을 아예 못 읽는다(§a11y) */
      tabIndex={0}
      ref={boxRef}
      data-lenis-prevent
      className="flex flex-1 flex-col overflow-y-auto p-4"
    >
      {turns.length === 1 && <Greeting />}

      {/*
        ⚠️ 말은 **아래에 붙인다**(`mt-auto`). 위에서부터 쌓으면 창을 열자마자 아래가 텅 비어
           보인다 — 메신저가 그렇게 하는 이유다.
        ⚠️ `justify-end`가 아니라 `mt-auto`다. 내용이 넘칠 때 `justify-end`는 **위쪽을
           스크롤 시작점 밖으로** 밀어내 첫 줄에 닿을 수 없게 만든다.
      */}
      <div ref={contentRef} className="mt-auto flex shrink-0 flex-col gap-2.5">
        {turns.map((turn, index) => (
          <SupportTurn
            key={index}
            turn={turn}
            isOpening={index === 0}
            onPickCategory={onPickCategory}
            onPickEntry={onPickEntry}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 아직 아무것도 안 물었을 때 — 위가 텅 비어 보이지 않게 남는 자리에 둔다.
 *
 * ⚠️ `m-auto`라 자리가 남을 때만 가운데로 밀린다. 대화가 쌓이면 사라지므로
 *    자리를 차지하지 않는다.
 */
function Greeting() {
  return (
    <div className="m-auto flex shrink-0 flex-col items-center gap-2 px-6 py-4 text-center">
      {/* ⚠️ 밝기를 따라간다 — 밝을 땐 흰 원에 먹색 Z, 어두울 땐 검은 원에 흰 Z */}
      <span className="bg-landing-stage text-landing-dark-foreground border-border flex size-11 items-center justify-center rounded-2xl border shadow-sm">
        <ZLogo className="size-4" aria-hidden />
      </span>
      <p className="text-popover-foreground text-[13px] leading-5 font-medium">
        무엇이든 물어보세요
      </p>
      {/* ⚠️ 한 줄로 끝낸다 — 두 줄이 되면 아래 목록이 잘린다 */}
      <p className="text-muted-foreground text-[12px] leading-[18px]">
        자주 묻는 것들을 모아 두었습니다
      </p>
    </div>
  );
}
