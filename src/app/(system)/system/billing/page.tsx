import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SummaryCard } from "@/components/common/summary-card";
import { MrrChartCard } from "@/features/system/components/mrr-chart-card";
import { SubscriptionTable } from "@/features/system/components/subscription-table";
import { formatCompactKrw } from "@/features/system/format";
import { getBillingOverview } from "@/features/system/server";

export const metadata: Metadata = {
  title: "구독·매출 관리",
};

export default async function SystemBillingPage() {
  const { summary, monthlyMrr, subscriptions } = await getBillingOverview();

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-7">
        <SummaryCard
          items={[
            {
              label: "이번 달 MRR",
              value: formatCompactKrw(summary.mrr),
              meta: `전월 대비 +${summary.mrrDeltaPercent}%`,
            },
            {
              label: "결제 완료",
              value: `${summary.paidCount}`,
              unit: "건",
              meta: formatCompactKrw(summary.paidAmount),
            },
            { label: "미납", value: `${summary.unpaidCount}`, unit: "건", meta: "안내 발송 필요" },
            {
              label: "해지",
              value: `${summary.canceledCountThisMonth}`,
              unit: "건",
              meta: "이번 달",
            },
          ]}
        />

        <MrrChartCard data={monthlyMrr} />

        {/*
          ⚠️ 이동 링크를 **카드 제목 줄에** 둔다. 전에는 카드 아래 허공에 오른쪽 정렬로
             떠 있었는데, 어느 카드에 딸린 것인지 모양으로 알 수 없고 카드 모서리 밖으로
             삐져나와 마감이 안 된 것처럼 보였다.
        */}
        <SubscriptionTable
          subscriptions={subscriptions}
          action={
            <Link
              href="/system/companies"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring group inline-flex shrink-0 items-center gap-1 rounded text-[12px] leading-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              전체 기업 목록 보기
              <ArrowRight
                className="size-3 transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          }
        />
      </div>
    </main>
  );
}
