import type { Metadata } from "next";

import { PlanSummaryCard } from "@/features/billing/components/plan-summary-card";
import { formatWon } from "@/features/billing/pricing";
import { getBillingConfig } from "@/features/billing/server";
import { DocPage } from "@/features/landing/components/doc-page";

export const metadata: Metadata = {
  title: "요금제 — Z",
  description: "회사당 하나의 요금제. 인원 제한 없이 기능은 전부 열려 있습니다.",
};

/**
 * 시작하는 순서 — **온보딩 흐름 그대로**다.
 *
 * ⚠️ 3·4단계 이름은 온보딩 스텝퍼가 쓰는 것과 같은 말이어야 한다 — 여기서 본 순서가
 *    실제로 걷는 순서다. 단계 이름을 다르게 적으면 신청하고 나서 딴 화면을 만난다.
 */
const START_STEPS = [
  { title: "기업 등록 신청", detail: "사업자 정보와 담당자 연락처를 남깁니다." },
  { title: "승인", detail: "확인이 끝나면 대표 계정이 메일로 갑니다." },
  { title: "초기 설정", detail: "팀 체계 · 직급 체계 · 사원 초대를 마칩니다." },
  { title: "결제", detail: "결제를 마치면 워크스페이스가 열립니다." },
] as const;

/**
 * 랜딩에서 들어오는 요금제 소개.
 *
 * ⚠️ **가입 전에 가격을 구경하는 페이지**다. 고르는 화면이 아니다 — 파는 게 하나뿐이라
 *    고를 단계 자체가 없어졌다(2026-08-04, `/pricing` 폐지). 결제는 온보딩 4단계에서 한다.
 * ⚠️ 카드는 **결제 화면과 같은 것**(`PlanSummaryCard`)을 쓴다. 전에는 여기만 따로 그린
 *    가로 카드 + 그 아래 기능 표를 얹고 있었는데, 문제가 셋이었다.
 *    ① **같은 아홉 개를 두 번** 늘어놓았고 ② 두 목록이 이미 갈라져 표에 두 개가 빠져 있었고
 *    ③ 카드는 폭 전체인데 표는 560px이라 위아래가 어긋나 보였다.
 *    파는 물건은 한 장으로 끝낸다 — 여기서 본 카드가 결제 직전에 그대로 다시 나온다.
 * ⚠️ 껍데기·제목은 다른 설명 문서(`/terms`·`/roles`·`/location`)와 **같은 `DocPage`** 를 쓴다.
 */
export default async function PlansPage() {
  const config = await getBillingConfig();

  return (
    <DocPage
      title="요금제"
      description="회사당 하나의 요금제. 인원 제한 없이 기능은 전부 열려 있습니다."
      isWide
      hasClosing={false}
    >
      {/* 시작 버튼은 두지 않는다 — 상단바의 [시작하기]가 그 역할이다 */}
      <PlanSummaryCard config={config} />

      {/*
        ⚠️ 카드 하나만 두면 페이지가 반쯤 비어 푸터가 바로 올라붙는다. 다만 채우려고
           없는 말을 지어내지 않는다 — **이미 정해져 있는데 카드가 말하지 않는 것**만 적는다:
           어떻게 시작하는가(온보딩 흐름)와 돈이 어떻게 나가는가(결제 정책).
        ⚠️ 제목 위계는 `/roles`의 "기능별 정리"와 **같은 문법**이다. 문서끼리 같은 손으로 읽힌다.
      */}
      <h2 className="pt-14 text-[20px] leading-7 font-semibold tracking-[-0.4px]">시작하는 순서</h2>
      <p className="text-muted-foreground pt-1.5 pb-6 text-[13px] leading-[21px] break-keep">
        기업 등록을 신청하면 승인 뒤에 초기 설정과 결제를 거쳐 워크스페이스가 열립니다.
      </p>
      <ol className="grid gap-3 sm:grid-cols-4">
        {START_STEPS.map((step, index) => (
          <li
            key={step.title}
            className="border-border bg-card rounded-xl border p-5 transition-colors"
          >
            {/* 번호는 알약 하나로 — 큰 숫자를 박으면 네 칸이 숫자판처럼 보인다 */}
            <span className="bg-foreground text-background flex size-6 items-center justify-center rounded-full text-[12px] leading-none font-semibold tabular-nums">
              {index + 1}
            </span>
            <p className="pt-3.5 text-[13px] leading-[21px] font-semibold">{step.title}</p>
            <p className="text-muted-foreground pt-1 text-[12px] leading-[19px] break-keep">
              {step.detail}
            </p>
          </li>
        ))}
      </ol>

      <h2 className="pt-14 text-[20px] leading-7 font-semibold tracking-[-0.4px]">알아두실 것</h2>
      <p className="text-muted-foreground pt-1.5 pb-6 text-[13px] leading-[21px] break-keep">
        돈이 언제 얼마나 나가는지는 먼저 알고 시작하시는 게 좋습니다.
      </p>
      <dl className="border-border divide-border bg-card divide-y overflow-hidden rounded-2xl border">
        {[
          { term: "결제 주기", desc: "월간 하나입니다. 매월 자동으로 갱신됩니다." },
          {
            term: "부가세",
            desc: config.isVatIncluded
              ? "표시 금액에 포함되어 있습니다."
              : "표시 금액과 별도로 10%가 더해집니다.",
          },
          {
            term: "초과 요금",
            desc: `포함량을 넘긴 만큼만 더해집니다. AI 토큰은 1,000토큰당 ${formatWon(
              config.overagePerThousandTokens,
            )}, 저장 공간은 1GB당 ${formatWon(config.overagePerGbMonth)}이며 다음 결제일에 기본료와 함께 청구됩니다.`,
          },
          {
            term: "해지",
            desc: "언제든 하실 수 있습니다. 해지해도 이미 결제한 주기가 끝날 때까지는 그대로 쓰실 수 있습니다.",
          },
        ].map((item) => (
          <div key={item.term} className="flex flex-col gap-1 p-5 sm:flex-row sm:gap-6">
            <dt className="shrink-0 text-[13px] leading-[21px] font-semibold sm:w-[100px]">
              {item.term}
            </dt>
            <dd className="text-muted-foreground text-[13px] leading-[21px] break-keep">
              {item.desc}
            </dd>
          </div>
        ))}
      </dl>
    </DocPage>
  );
}
