import type { Metadata } from "next";

import { SummaryCard } from "@/components/common/summary-card";
import { FailedPipelineTableLoader } from "@/features/system/components/failed-pipeline-table-loader";
import { StageTimingCard } from "@/features/system/components/stage-timing-card";
import { getMonitoringOverview } from "@/features/system/server";

export const metadata: Metadata = {
  title: "시스템 모니터링",
};

export default async function SystemMonitorPage() {
  const { queue, stageTimings, failedItems } = await getMonitoringOverview();

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-7">
        <SummaryCard
          items={[
            { label: "대기", value: `${queue.waitingCount}`, unit: "건", meta: "처리 예정" },
            {
              label: "처리 중",
              value: `${queue.processingCount}`,
              unit: "건",
              meta: `평균 ${queue.processingAvgSeconds}초`,
            },
            { label: "실패", value: `${queue.failedCount}`, unit: "건", meta: "재처리 필요" },
          ]}
        />

        <StageTimingCard timings={stageTimings} />

        <FailedPipelineTableLoader items={failedItems} />
      </div>
    </main>
  );
}
