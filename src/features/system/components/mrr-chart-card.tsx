import { BarChart3 } from "lucide-react";

import type { MonthlyMrr } from "../types";
import { MrrChartLoader } from "./mrr-chart-loader";
import { SystemCardHeading } from "./system-card-heading";

/** "월별 MRR 추이" 카드. 차트만 클라이언트고 카드 틀은 서버에서 그린다(`signup-chart-card.tsx`와 같은 구성). */
export function MrrChartCard({ data }: { data: MonthlyMrr[] }) {
  return (
    <section className="border-border bg-card rounded-2xl border">
      <SystemCardHeading icon={BarChart3}>월별 MRR 추이</SystemCardHeading>
      <div className="px-7 pt-5 pb-6">
        <MrrChartLoader data={data} />
      </div>
    </section>
  );
}
