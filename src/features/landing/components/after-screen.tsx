import { Check } from "lucide-react";

/**
 * 바뀐 뒤의 화면 — 프로젝트 하나를 열면 결정·액션·기록이 한자리에 모여 있다.
 *
 * ⚠️ 스크린샷 이미지를 쓰지 않는다 — 화면이 바뀌면 같이 낡는다(기능 축소판과 같은 이유).
 * ⚠️ 여기 담긴 건 전부 목이고, 사람 이름 대신 자리(직무)로 적는다.
 */
const AFTER_DECISIONS = [
  { tag: "결정", color: "var(--landing-accent)", text: "API 문서 최신화 우선" },
  { tag: "결정", color: "var(--landing-accent)", text: "디자인 기준 이번 주 확정" },
] as const;

const AFTER_ACTIONS = [
  { who: "개발 담당", what: "API 문서 최신화", due: "8/7", isDone: false },
  { who: "디자인 담당", what: "디자인 기준 작성", due: "8/5", isDone: true },
  { who: "기획 담당", what: "KPI 문서 업데이트", due: "8/2", isDone: false },
] as const;

export function AfterScreen() {
  return (
    /* 목업 문장은 가짜다 — 스크린 리더가 읽지 않게 화면 전체를 숨긴다 */
    <div className="tilt-scene relative" aria-hidden>
      {/* 카드 뒤 번진 광원 — 어두운 무대에서 화면이 떠 보이게 한다 */}
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 size-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3b82f6] opacity-20 blur-[90px]"
      />

      <div className="border-border bg-popover tilt-showcase relative overflow-hidden rounded-2xl border shadow-lg">
        {/* 창 머리 — 이게 "앱 화면"이라는 신호다 */}
        <div className="border-border bg-secondary/60 flex items-center gap-2 border-b px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="size-[7px] rounded-full bg-[#f87171]" />
            <span className="size-[7px] rounded-full bg-[#fbbf24]" />
            <span className="size-[7px] rounded-full bg-[#4ade80]" />
          </span>
          <p className="text-muted-foreground/70 flex-1 truncate text-center text-[11px] leading-4">
            스프린트 개편 · 프로젝트
          </p>
        </div>

        <div className="p-4">
          <p className="text-muted-foreground/70 text-[11px] leading-4 font-semibold tracking-[0.6px] uppercase">
            결정
          </p>
          <div className="flex flex-col gap-1.5 pt-2">
            {AFTER_DECISIONS.map((row) => (
              <p
                key={row.text}
                className="border-border flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[12px] leading-[18px]"
              >
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-[11px] leading-4 font-semibold text-white"
                  style={{ backgroundColor: row.color }}
                >
                  {row.tag}
                </span>
                <span className="min-w-0 flex-1 truncate">{row.text}</span>
              </p>
            ))}
          </div>

          <p className="text-muted-foreground/70 pt-4 text-[11px] leading-4 font-semibold tracking-[0.6px] uppercase">
            액션
          </p>
          <div className="flex flex-col gap-1.5 pt-2">
            {AFTER_ACTIONS.map((action) => (
              <div
                key={action.what}
                className="border-border flex items-center gap-2.5 rounded-md border px-2.5 py-2"
              >
                <span
                  aria-hidden
                  className={
                    action.isDone
                      ? "bg-landing-green flex size-4 shrink-0 items-center justify-center rounded-full"
                      : "border-border flex size-4 shrink-0 rounded-full border"
                  }
                >
                  {action.isDone && (
                    <Check className="text-background size-2.5" strokeWidth={3.5} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={
                      action.isDone
                        ? "text-muted-foreground/70 block truncate text-[12px] leading-[18px] line-through"
                        : "block truncate text-[12px] leading-[18px]"
                    }
                  >
                    {action.what}
                  </span>
                  <span className="text-muted-foreground block text-[11px] leading-[14px]">
                    {action.who}
                  </span>
                </span>
                <span className="text-muted-foreground shrink-0 text-[11px] leading-4 tabular-nums">
                  {action.due}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
