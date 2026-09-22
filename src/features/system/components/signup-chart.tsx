"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { MonthlySignup } from "../types";

interface SignupChartProps {
  data: MonthlySignup[];
}

/**
 * 월별 신규 가입 기업 막대그래프. 단일 계열이라 범례는 두지 않는다.
 *
 * ⚠️ **막대에만 액센트(`--chart-1`)를 쓴다.** 제품 화면(로그인 뒤 워크스페이스)은 "색으로
 *    알리는 건 에러뿐"이지만(DESIGN §5), `/system`은 **운영자만 보는 다른 면**이고 이미 자기
 *    색 언어를 갖고 있다(사이드바·발행 버튼). 여기서 액센트는 장식이 아니라 **이 화면의 주인공
 *    계열**이라는 표시다 — 한 화면에 액센트는 이것과 도넛의 유료 조각 둘뿐이고, 나머지는 전부
 *    무채색이다. 전문적으로 보이는 건 색을 많이 써서가 아니라 **한 색만 뜻있게 써서**다.
 * ⚠️ 다크 카드(#242120) 위 대비 **5.00:1** — 그래픽 기준 3:1을 넘는다.
 * ⚠️ hover 커서를 **아주 옅게** 둔다. `--muted`로 채우면 막대 뒤에 큰 회색 덩어리가 생겨
 *    정작 봐야 할 막대보다 눈에 먼저 들어온다.
 * ⚠️ **막대 굵기는 40px다.** 26px은 한 칸(≈120px)에 비해 가늘어 사이가 휑했고, 56px까지
 *    올리니 이번엔 기둥처럼 뭉툭해졌다 — 칸의 3분의 1쯤이 눈에 편하다.
 */
export function SignupChart({ data }: SignupChartProps) {
  return (
    <ResponsiveContainer width="100%" height={224}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        {/* 눈금선은 배경이다 — 막대보다 도드라지면 안 된다 */}
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          /* ⚠️ 폭은 recharts 기본값을 그대로 둔다 — `margin.left: -16`이 이미 그 폭을 전제로
                당겨 놓은 값이라, 여기서 좁히면 두 자리 눈금(`12`)이 잘린다. */
          allowDecimals={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <Tooltip
          cursor={{ fill: "var(--foreground)", fillOpacity: 0.04 }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--popover-foreground)",
            fontSize: 11,
          }}
          /* ⚠️ 항목 이름·값도 글자색을 고정한다 — 안 주면 recharts가 **계열 색**을 그대로 써서
                툴팁 글자만 다른 색으로 뜬다(주황일 때 실제로 그랬다). */
          itemStyle={{ color: "var(--popover-foreground)" }}
          labelStyle={{ color: "var(--muted-foreground)", marginBottom: 2 }}
          formatter={(value) => [`${value}개사`, "신규 가입"]}
        />
        <Bar dataKey="count" fill="var(--chart-1)" radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
