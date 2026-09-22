"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCompactKrw } from "../format";
import type { MonthlyMrr } from "../types";

interface MrrChartProps {
  data: MonthlyMrr[];
}

/** 월별 MRR 추이 막대그래프. 단일 계열이라 범례는 두지 않는다(`signup-chart.tsx`와 같은 구성). */
export function MrrChart({ data }: MrrChartProps) {
  return (
    <ResponsiveContainer width="100%" height={224}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          tickFormatter={(value: number) => formatCompactKrw(value)}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--popover-foreground)",
            fontSize: 11,
          }}
          formatter={(value) => [formatCompactKrw(Number(value)), "MRR"]}
        />
        <Bar dataKey="amount" fill="var(--chart-1)" radius={[3, 3, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}
