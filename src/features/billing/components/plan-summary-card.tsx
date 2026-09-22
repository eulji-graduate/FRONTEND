"use client";

import type { LucideIcon } from "lucide-react";
import { Check, HardDrive, Infinity as InfinityIcon, Sparkles } from "lucide-react";

import { CURRENT_PLAN, PLAN_UNLIMITED } from "../plans";
import { formatGb, formatTokens, formatWon } from "../pricing";
import type { BillingConfig } from "../types";

/**
 * 플랜 한 장 — **파는 물건을 설명하는 카드.** 값은 전부 `BillingConfig`에서 읽는다.
 *
 * ⚠️ 결제 화면(`SubscribeCard`)과 요금제 소개(`/plans`)가 **같은 것을 쓴다.**
 *    전에는 `/plans`가 따로 그린 카드 + 기능 표를 얹고 있었는데, 같은 여덟 개를 두 번 늘어놓아
 *    두 목록이 갈라지고(표에 두 개가 빠져 있었다) 카드와 표의 폭도 어긋났다.
 *    파는 물건은 한 장으로 끝낸다 — 랜딩에서 본 카드와 결제 직전에 보는 카드가 같아야 한다.
 * ⚠️ 읽는 순서가 **포함량 → 무제한 → 기능**이다. 돈이 더 나가는지 아닌지를 가르는 값이
 *    먼저고, 기능 목록은 이미 결정한 사람에게 확인용이다.
 */
export function PlanSummaryCard({ config }: { config: BillingConfig }) {
  return (
    <section className="border-border bg-card min-w-0 flex-1 rounded-2xl border p-8">
      {/*
        ⚠️ 플랜 이름에 **표식을 붙인다.** 전에는 16px 글자 하나뿐이라 카드가 어디서
           시작하는지 안 보였다 — 파는 물건의 이름이 가장 먼저 눈에 들어와야 한다.
      */}
      <div className="flex items-center gap-3">
        <span className="bg-foreground text-background flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Sparkles className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-[19px] leading-7 font-semibold tracking-[-0.4px]">
            {CURRENT_PLAN.name} 플랜
          </h2>
          <p className="text-muted-foreground text-[13px] leading-5 tabular-nums">
            회사당 월 {formatWon(config.baseFee)}
            {config.isVatIncluded ? " (VAT 포함)" : " · VAT 별도"}
          </p>
        </div>
      </div>

      {/*
        ⚠️ 포함량이 **가장 먼저** 온다. 기능 목록보다 위다 —
           돈이 더 나가는지 아닌지를 가르는 값이라 여기가 이 화면의 핵심이다.
        ⚠️ 표처럼 칸을 나누지 않는다. 얇은 격자에 갇히면 숫자가 다른 글자와 같은 무게로
           읽힌다 — 카드 두 장으로 띄우고 숫자만 크게 둔다.
      */}
      {/*
        ⚠️ **포함량이 먼저다.** 돈이 더 나가는지 아닌지를 가르는 값이라 이 카드의 핵심이다 —
           제한 없는 것들(`∞`)은 그 아래에서 "그리고 이건 아예 안 셉니다"로 받는다.
      */}
      <dl className="border-border mt-6 grid gap-3 border-t pt-6 sm:grid-cols-2">
        <Included
          icon={Sparkles}
          label="AI 토큰"
          value={formatTokens(config.includedTokens)}
          unit="월"
          hint={`넘으면 1,000토큰당 ${formatWon(config.overagePerThousandTokens)}`}
        />
        <Included
          icon={HardDrive}
          label="저장 공간"
          value={formatGb(config.includedStorageGb)}
          hint={`넘으면 1GB당 ${formatWon(config.overagePerGbMonth)}`}
        />
      </dl>

      {/*
        ⚠️ 격자로 세우지 않는다. 글자 길이가 제각각이라 칸을 나누면 뒤가 남아 들쭉날쭉해 보였다 —
           **알약**은 내용만큼만 차지해서 길이가 달라도 한 덩어리로 읽힌다.
        ⚠️ **아래 기능 목록과 같은 축·같은 폭**으로 세운다. 전에는 `justify-between`이라 양 끝이
           카드 모서리에 붙어, 가운데로 모인 기능 목록과 폭이 어긋나 두 덩어리가 따로 놀았다.
        ⚠️ 간격은 **가장 좁은 화면**(`/subscription`, 안폭 626px)에 맞춰 잡는다. 이 카드는
           `/plans`(넓다) · 온보딩 4단계 · 구독 재개(좁다)에서 같이 쓰이는데, 넓은 쪽 기준으로
           벌리면 좁은 쪽에서 알약이 넘쳐 두 줄로 깨진다. 테두리를 두른 뒤 폭이 6px 늘어
           한 번 더 깨졌으니, 문구나 테두리를 건드리면 여기 값을 다시 재야 한다.
           (`%`로 줘 봤지만 `w-fit` 격자 안에서는 기준 폭이 정해지지 않아 어긋난다.)
        ⚠️ 알약 간격이 기능 목록보다 넓은 이유는 알약 셋을 합친 폭이 더 좁아서다 —
           둘의 좌우 끝이 맞아야 카드 안이 한 덩어리로 읽힌다.
      */}
      <ul className="mt-5 flex flex-wrap gap-2 sm:justify-center sm:gap-x-20">
        {PLAN_UNLIMITED.map((item) => (
          <li
            key={item}
            className="border-border bg-secondary/60 text-muted-foreground flex items-center gap-1.5 rounded-full border py-1.5 pr-3.5 pl-3 text-[12px] leading-4"
          >
            <InfinityIcon className="size-3.5 shrink-0" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="border-border mt-7 border-t pt-4">
        {/*
          ⚠️ 머리말도 **목록과 같이 가운데**로 온다. 목록만 가운데로 밀고 머리말을 왼쪽 끝에
             두었더니 둘 사이가 텅 비어, 이 문장이 목록의 머리인지 위 알약들의 꼬리인지
             알 수 없었다 — 붙어 있어야 하는 두 덩어리는 같은 축에 세운다.
          ⚠️ **구분선에 바짝 붙인다**(`pt-4`). 위아래 여백이 같으면 이 문장이 어느 쪽 것인지
             모호해진다 — 위(선)에 가깝고 아래(목록)와 멀어야 "여기서부터 새 덩어리"로 읽힌다.
             크기도 11px에서 12px로 올려 목록의 머리말답게 세운다.
        */}
        <p className="text-muted-foreground text-[12px] leading-[18px] sm:text-center">
          기능 {CURRENT_PLAN.features.length}가지가 모두 들어 있습니다
        </p>
        {/*
          ⚠️ **세 줄로 세운다.** 두 열일 땐 각 칸의 오른쪽 절반이 비어 목록이 왼쪽으로 쏠려 보였다.
          ⚠️ 다만 `grid-cols-3`(=`1fr`)은 **칸을 폭의 1/3씩 자른다.** 글자가 짧은 열은 뒤가
             통째로 비어서, 세 열을 세워도 글자 덩어리는 여전히 왼쪽에 몰려 보였다 —
             열은 `max-content`로 제 글자만큼만 잡고, 목록을 `w-fit`으로 좁힌 뒤
             **바깥 상자가 가운데로 민다.** 격자에 `justify-center`만 걸면 격자 자체가
             카드 폭 전체라 움직일 자리가 없다.
          ⚠️ 넓이는 `gap-x` 하나로 조절한다. 가운데 열은 제자리에 있고 **양쪽 열만** 바깥으로
             밀려나므로, 덩어리 중심이 카드 중심에서 흔들리지 않는다.
          ⚠️ 표식은 **전부 같은 체크**다. 기능마다 다른 아이콘을 붙여 봤지만,
             여덟 개가 제각각이면 표식끼리 시끄러워 글자가 뒤로 밀린다.
        */}
        <div className="flex pt-5 sm:justify-center">
          <ul className="grid w-fit gap-x-14 gap-y-4 sm:[grid-template-columns:repeat(3,max-content)]">
            {CURRENT_PLAN.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-[13px] leading-[22px]">
                <Check className="text-muted-foreground size-4 shrink-0" aria-hidden />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Included({
  icon: Icon,
  label,
  value,
  unit,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  /** 숫자 앞에 붙는 말("월") — 없으면 생략한다 */
  unit?: string;
  hint: string;
}) {
  return (
    /*
      ⚠️ 세 줄을 칸 **가운데**로 모은다 — 왼쪽에 붙여 두면 숫자 오른쪽이 비어 칸이 헐거워 보인다.
      ⚠️ **테두리를 같이 준다.** 라이트에서 `--secondary`(#fafaf9)는 흰 카드와 2%밖에 차이가
         없어서, 옅게 깔면 칸이 있는지조차 안 보인다 — 이 서비스의 라이트 층은 색이 아니라
         **보더(#e7e5e4)** 로 나뉜다(CLAUDE.md §디자인 토큰).
    */
    <div className="border-border bg-secondary/60 rounded-xl border p-6 text-center">
      <dt className="text-muted-foreground flex items-center justify-center gap-1.5 text-[13px] leading-5">
        <Icon className="size-4 shrink-0" aria-hidden />
        {/* 한글 글자가 아이콘보다 떠 보인다 — 1px 내려 맞춘다 */}
        <span>{label}</span>
      </dt>
      <dd className="flex items-baseline justify-center gap-1.5 pt-2.5">
        {unit && <span className="text-muted-foreground text-[13px] leading-8">{unit}</span>}
        <span className="text-[30px] leading-9 font-semibold tracking-[-0.8px] tabular-nums">
          {value}
        </span>
      </dd>
      <p className="text-muted-foreground/70 pt-2 text-[12px] leading-4 tabular-nums">{hint}</p>
    </div>
  );
}
