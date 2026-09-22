import { Sparkles } from "lucide-react";

import { FeatureHandoverMock } from "./handover-mock";

/**
 * 기능 설명 옆에 붙는 화면 축소판.
 *
 * ⚠️ 흐름 섹션(자막·액션 목록·완성도)과 **같은 그림을 반복하지 않는다** — 셋 다 앵글이 다르다.
 *    CAPTURE=파형이 뛰는 녹음 UI · AI ACTION=확신도 배지 · HANDOVER=문서가 조립되는 체크리스트.
 * ⚠️ 스크린샷 이미지를 쓰지 않는다 — 화면이 바뀌면 같이 낡고, 다크모드도 따라오지 못한다.
 * ⚠️ 여기 담긴 문장은 **명세에 있는 것만** 쓴다. 자막에 화자 이름을 붙이지 않는다.
 */
type FeatureKind = "CAPTURE" | "AI ACTION" | "HANDOVER";

/** 축소판마다 다른 광원 색 — 기능의 성격을 색으로 이어준다(랜딩 색 예외) */
const GLOW: Record<FeatureKind, string> = {
  CAPTURE: "#3b82f6",
  "AI ACTION": "#8b5cf6",
  HANDOVER: "#3b82f6",
};

export function FeatureMock({ kind }: { kind: FeatureKind }) {
  return (
    /* 글이 왼쪽이면 오른쪽으로, 오른쪽이면 왼쪽으로 — 본문 쪽을 향해 기울인다 */
    /* 목업 문장은 가짜다 — 스크린 리더가 읽지 않게 화면 전체를 숨긴다 */
    <div className="tilt-scene relative" aria-hidden>
      {/* 카드 뒤 번진 광원 — 흰 바탕에서 카드가 떠 보이게 한다 */}
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 size-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[80px]"
        style={{ backgroundColor: GLOW[kind] }}
      />
      <div
        className={`border-border bg-popover relative min-h-[190px] rounded-xl border p-5 shadow-md ${
          kind === "AI ACTION" ? "tilt-left" : "tilt-right"
        }`}
      >
        {kind === "CAPTURE" && <CaptureMock />}
        {kind === "AI ACTION" && <ActionMock />}
        {kind === "HANDOVER" && <FeatureHandoverMock />}
      </div>
    </div>
  );
}

/** 파형이 뛰는 녹음 화면 — "지금 받아 적는 중"을 소리로 보여준다 */
const WAVE_HEIGHTS = [
  10, 18, 26, 14, 30, 22, 12, 28, 16, 24, 10, 20, 32, 14, 26, 18, 12, 22,
] as const;

/** ⚠️ 자막에 화자 이름을 붙이지 않는다 — STT는 화자를 가르지 않는다(명세) */
const LIVE_CHUNKS = [
  "지난주 액션부터 확인할게요",
  "API 문서 최신화가 계속 밀리고 있습니다",
  "이번 스프린트 블로커부터 정리하죠",
] as const;

function CaptureMock() {
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-landing-accent flex items-center gap-1.5 text-[11px] leading-4">
          <span className="size-[6px] animate-pulse rounded-full bg-[#3b82f6]" aria-hidden />
          녹음 중
        </span>
        <span className="text-muted-foreground/70 text-[11px] leading-4 tabular-nums">
          00:12:47
        </span>
      </div>

      <div className="flex h-12 items-center justify-center gap-[3px] pt-3" aria-hidden>
        {WAVE_HEIGHTS.map((height, index) => (
          <span
            key={index}
            style={{ height, animationDelay: `${(index % 6) * 0.15}s` }}
            className="animate-eq w-[3px] rounded-full bg-[#3b82f6]/70"
          />
        ))}
      </div>

      {/*
        파형 밑으로 자막이 **계속** 쌓인다. 한 줄만 두면 혼자 말하고 마는 화면이었다 —
        새 줄이 아래로 붙고 오래된 줄은 흐려지며 밀려나야 "받아 적는 중"으로 읽힌다.
      */}
      <div className="mt-3 flex flex-col gap-1.5">
        {LIVE_CHUNKS.map((chunk, index) => (
          <p
            key={chunk}
            style={{ animationDelay: `${index * 1.2}s` }}
            className={
              index === LIVE_CHUNKS.length - 1
                ? "border-border bg-secondary animate-cycle-in rounded-md border px-2.5 py-1.5 text-[12px] leading-[18px] break-keep"
                : "text-muted-foreground/55 animate-cycle-in truncate px-2.5 text-[11px] leading-[18px]"
            }
          >
            {chunk}
          </p>
        ))}
      </div>

      {/* 다음 줄을 받는 중 — 점 셋이 번갈아 뛴다 */}
      <div className="flex items-center gap-1 px-2.5 pt-2" aria-hidden>
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            style={{ animationDelay: `${dot * 0.16}s` }}
            className="bg-landing-accent/70 animate-eq size-[3px] rounded-full"
          />
        ))}
      </div>
    </>
  );
}

/** AI 확신도 — 높은 건 바로 배정, 낮은 것만 개설자 확인으로 남는다(명세 그대로) */
const JUDGED_ACTIONS = [
  { what: "API 문서 최신화", who: "개발 담당", confidence: "높음", isSure: true },
  { what: "디자인 기준 문서 작성", who: "디자인 담당", confidence: "높음", isSure: true },
  { what: "KPI 문서 업데이트", who: "미정", confidence: "확인 필요", isSure: false },
] as const;

function ActionMock() {
  return (
    <>
      <p className="text-landing-accent flex items-center gap-1.5 text-[11px] leading-4 font-semibold">
        <Sparkles className="size-3.5" aria-hidden />
        AI가 가려낸 액션
      </p>

      <div className="flex flex-col gap-2 pt-3.5">
        {JUDGED_ACTIONS.map((action, index) => (
          <div
            key={action.what}
            style={{ animationDelay: `${index * 0.45}s` }}
            className="animate-cycle-in border-border flex items-center gap-2.5 rounded-md border px-2.5 py-2"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] leading-[18px]">{action.what}</span>
              <span className="text-muted-foreground/70 block text-[11px] leading-[14px]">
                {action.who}
              </span>
            </span>
            {/*
              배지가 위에서 크게 내려와 **탁 박힌다**(stamp) — 뒤로 파문이 한 번 번진다.
              "AI가 골라줬다"가 아니라 "여기에 꽂혔다"로 읽혀야 한다.
            */}
            <span className="relative shrink-0">
              <span
                aria-hidden
                style={{ animationDelay: `${index * 0.45}s` }}
                className={
                  action.isSure
                    ? "animate-stamp-ripple absolute inset-0 rounded-full bg-[#8b5cf6]/40"
                    : "bg-warning/40 animate-stamp-ripple absolute inset-0 rounded-full"
                }
              />
              <span
                style={{ animationDelay: `${index * 0.45}s` }}
                className={
                  action.isSure
                    ? "animate-stamp text-landing-violet relative block rounded-full bg-[#8b5cf6]/12 px-2 py-0.5 text-[11px] leading-4 font-medium"
                    : "bg-warning/12 text-landing-warning animate-stamp relative block rounded-full px-2 py-0.5 text-[11px] leading-4 font-medium"
                }
              >
                {action.confidence}
              </span>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
