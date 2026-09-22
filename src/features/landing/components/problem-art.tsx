import { PenLine, Send, User } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 문제 섹션 카드 위에 얹는 그림 세 장.
 *
 * ⚠️ 사람 이름을 쓰지 않는다 — 목이라도 특정 인물처럼 읽힌다. 자리(역할)로만 말한다.
 * ⚠️ 스크린샷을 쓰지 않는다. 같은 토큰으로 그려야 밝기 전환을 따라온다.
 */
const NOTE_LINES = ["결정 · API 문서 최신화 우선", "액션 · 이번 주 금요일까지"] as const;

export function EmptyNotesArt() {
  return (
    <div className="w-full" aria-hidden>
      <div className="text-muted-foreground flex items-center justify-between text-[11px] leading-4">
        <span className="flex items-center gap-1.5">
          <PenLine className="size-3" />
          회의록 작성 중
        </span>
        <span className="tabular-nums">12:04</span>
      </div>

      <div className="flex flex-col gap-1.5 pt-2.5">
        {NOTE_LINES.map((line, index) => (
          <p
            key={line}
            style={{ animationDelay: `${index * 1.5}s` }}
            className="border-border bg-secondary/50 animate-cycle-in truncate rounded-md border px-2.5 py-1.5 text-[11px] leading-[18px]"
          >
            {line}
          </p>
        ))}

        {/* 끝내 못 채운 줄 — 커서만 남는다 */}
        <p className="border-border/70 animate-cycle-in flex items-center gap-1 rounded-md border border-dashed px-2.5 py-1.5 [animation-delay:3s]">
          <span className="bg-foreground/70 animate-caret inline-block h-3 w-[2px] rounded-full" />
          <span className="text-muted-foreground text-[11px] leading-[18px]">다음 회의 시작 —</span>
        </p>
      </div>
    </div>
  );
}

/**
 * ②: 대화방에 묻힌 결정 — 좌우로 붙은 말풍선이 계속 올라오고,
 * 정작 중요한 첫 메시지(결정)만 흐려진 채 위로 밀려난다.
 */
const CHAT_LINES = [
  { text: "결정 · API 우선순위 올려요", side: "left", tone: "decision" },
  { text: "넵 바로 반영할게요", side: "right", tone: "plain" },
  { text: "회식 언제 하죠?", side: "left", tone: "plain" },
  { text: "다음 주 목요일 어때요", side: "right", tone: "plain" },
] as const;

export function BuriedChatArt() {
  return (
    <div className="flex w-full flex-col gap-1.5" aria-hidden>
      {CHAT_LINES.map((line, index) => (
        <span
          key={line.text}
          style={{ animationDelay: `${index * 1.1}s` }}
          className={cn(
            "animate-cycle-in max-w-[82%] truncate px-3 py-1.5 text-[11px] leading-4",
            line.side === "left"
              ? "mr-auto rounded-2xl rounded-bl-sm"
              : "ml-auto rounded-2xl rounded-br-sm",
            // 결정만 파랑이되 흐리다 — 잡담 사이에 묻혀가는 중이다
            // ⚠️ 요소 전체를 흐리게 하면(opacity) 글자까지 같이 사라진다 — 밝은 쪽에서 특히.
            //    말풍선은 **또렷하게 두고**, 묻혀간다는 뜻은 잡담이 그 위를 덮는 배치로 말한다
            line.tone === "decision"
              ? "bg-landing-accent font-medium text-white"
              : "bg-secondary text-muted-foreground",
          )}
        >
          {line.text}
        </span>
      ))}
    </div>
  );
}

/**
 * ③: 담당자가 나가면 — 떠나는 사람에서 신규 담당자로 종이비행기가 날아가지만
 * 중간에서 사라진다. 맥락이 전달되지 못한 채 끊긴다.
 */
export function LostContextArt() {
  return (
    <div className="w-full" aria-hidden>
      <div className="text-muted-foreground/80 flex items-center justify-between">
        {/* ⚠️ 사람 이름을 쓰지 않는다 — 목이라도 특정 인물처럼 읽힌다. 자리(역할)로만 말한다 */}
        <span className="flex w-16 flex-col items-center gap-1.5">
          <span className="border-border bg-secondary text-muted-foreground flex size-12 items-center justify-center rounded-full border">
            <User className="size-5" />
          </span>
          <span className="text-muted-foreground text-[11px] leading-4">전임 담당자</span>
        </span>

        {/* 흐르는 점선 위로 비행기가 지나간다 — 선은 이어져 보여도 전달은 끝나지 않는다 */}
        <span className="relative mx-2 h-12 flex-1">
          <span className="animate-dash-march absolute top-1/2 right-0 left-0 h-[2px] opacity-80 [background:repeating-linear-gradient(90deg,currentColor_0_6px,transparent_6px_12px)]" />
          {/* ⚠️ 이동은 `left`(부모 폭 기준)로 한다 — `translateX(%)`는 **아이콘 자신의 폭** 기준이라
              70%를 줘도 11px밖에 못 간다. 예전에 비행기가 코앞에서 멈춘 게 그것 때문이었다 */}
          <Send className="animate-plane text-landing-accent absolute top-1/2 size-4" />
        </span>

        <span className="flex w-16 flex-col items-center gap-1.5">
          <span className="border-border bg-background flex size-12 animate-pulse items-center justify-center rounded-full border border-dashed text-[16px]">
            ?
          </span>
          <span className="text-[11px] leading-4">후임 담당자</span>
        </span>
      </div>
    </div>
  );
}
