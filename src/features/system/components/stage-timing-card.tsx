import { Timer } from "lucide-react";

import { PIPELINE_STAGE_LABEL, type PipelineStage } from "@/constants/domain";

import type { StageTiming } from "../types";
import { SystemCardHeading } from "./system-card-heading";

/**
 * 단계별 막대 색 — 파이프라인 4단계를 **색상이 아니라 명도**로 구분한다(§5·§10 — 색으로
 * 알리는 건 에러뿐이다). 값은 전부 무채색(`--foreground`) 위 opacity 단계다.
 */
const STAGE_BAR_CLASS: Record<PipelineStage, string> = {
  UPLOAD: "bg-foreground",
  TRANSCRIBE: "bg-foreground/75",
  SUMMARIZE: "bg-foreground/50",
  EXTRACT_ACTION: "bg-foreground/25",
};

/** "단계별 평균 소요 시간" 카드 — 가로 막대. 순수 표시라 서버에서 그린다. */
export function StageTimingCard({ timings }: { timings: StageTiming[] }) {
  if (timings.length === 0) {
    return (
      <section className="border-border bg-card rounded-2xl border">
        <SystemCardHeading icon={Timer}>단계별 평균 소요 시간</SystemCardHeading>
        <p className="text-muted-foreground px-7 pb-6 text-center text-[12px] leading-4">
          아직 집계된 처리 기록이 없어요
        </p>
      </section>
    );
  }

  // 가장 오래 걸린 단계를 100%로 잡아 나머지를 상대 길이로 그린다.
  const maxSeconds = Math.max(...timings.map((timing) => timing.avgSeconds));

  return (
    <section className="border-border bg-card rounded-2xl border">
      <SystemCardHeading icon={Timer}>단계별 평균 소요 시간</SystemCardHeading>

      <div className="flex flex-col gap-3 px-7 pt-5 pb-6">
        {timings.map((timing) => (
          <div key={timing.stage} className="flex items-center gap-3">
            <span className="text-muted-foreground w-20 shrink-0 text-[12px] leading-4">
              {PIPELINE_STAGE_LABEL[timing.stage]}
            </span>
            <div className="bg-muted h-4 flex-1 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full transition-[width] duration-[250ms] ${STAGE_BAR_CLASS[timing.stage]}`}
                style={{ width: `${(timing.avgSeconds / maxSeconds) * 100}%` }}
              />
            </div>
            <span className="text-muted-foreground w-12 shrink-0 text-right text-[12px] leading-4 tabular-nums">
              {timing.avgSeconds}s
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
