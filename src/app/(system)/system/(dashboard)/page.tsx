import type { Metadata } from "next";

import { SummaryCard } from "@/components/common/summary-card";
import { PipelineQueueCard } from "@/features/system/components/pipeline-queue-card";
import { RecentCompaniesTable } from "@/features/system/components/recent-companies-table";
import { SignupChartCard } from "@/features/system/components/signup-chart-card";
import { formatCompactKrw } from "@/features/system/format";
import { getDashboardOverview } from "@/features/system/server";

export const metadata: Metadata = {
  title: "대시보드",
};

export default async function SystemDashboardPage() {
  const { summary, monthlySignups, recentCompanies, pipelineQueue } = await getDashboardOverview();

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-7">
        <SummaryCard
          items={[
            {
              label: "가입 기업 수",
              value: `${summary.companyCount}`,
              meta: `이번 달 +${summary.companyCountDeltaThisMonth}`,
            },
            {
              label: "활성 사용자",
              value: `${summary.activeUserCount}`,
              meta: `전월 대비 +${summary.activeUserDeltaPercent}%`,
            },
            {
              label: "MRR",
              value: formatCompactKrw(summary.mrr),
              /*
                ⚠️ 한때 `Team N개사`였다. 요금제가 하나뿐이라 굳이 밝힐 플랜이 없고
                   (CLAUDE.md §요금제), 자리를 채우려고 없던 지표를 지어내지도 않는다 —
                   약어를 풀어 적는 데 쓴다.
              */
              meta: "월 반복 매출",
            },
            {
              label: "승인 대기",
              value: `${summary.pendingApprovalCount}`,
              unit: "건",
              meta: "기업 가입 신청",
            },
          ]}
        />

        {/*
          ⚠️ **곁 컬럼은 360px 고정**이다(DESIGN §1). 한때 `w-64`(256px)라 도넛이 눌려 있었고,
             카드 사이만 `gap-3`(12px)이라 위아래 `gap-7`(28px)과 리듬이 어긋났다.
        */}
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          <SignupChartCard data={monthlySignups} />
          <PipelineQueueCard queue={pipelineQueue} />
        </div>

        <RecentCompaniesTable companies={recentCompanies} />
      </div>
    </main>
  );
}
