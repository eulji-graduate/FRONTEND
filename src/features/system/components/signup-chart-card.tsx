import { TrendingUp } from "lucide-react";

import type { MonthlySignup } from "../types";
import { SignupChartLoader } from "./signup-chart-loader";
import { SystemCardHeading } from "./system-card-heading";

/** "월별 신규 가입 기업" 카드. 차트만 클라이언트고 카드 틀은 서버에서 그린다. */
export function SignupChartCard({ data }: { data: MonthlySignup[] }) {
  return (
    <section className="border-border bg-card flex-1 rounded-2xl border">
      <SystemCardHeading icon={TrendingUp}>월별 신규 가입 기업</SystemCardHeading>
      <div className="px-7 pt-5 pb-7">
        <SignupChartLoader data={data} />
      </div>
    </section>
  );
}
