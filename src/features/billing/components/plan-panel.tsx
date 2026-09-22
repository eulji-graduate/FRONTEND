import { Sparkles } from "lucide-react";

import { formatFullDate, isReadableDate } from "@/lib/date";

import { formatWon } from "../pricing";
import { canUseWorkspace, type Subscription, SUBSCRIPTION_STATUS_LABEL } from "../subscription";
import type { BillingConfig } from "../types";

interface PlanPanelProps {
  subscription: Subscription;
  config: BillingConfig;
  /** 바꿀 수 있는 사람인지 — Owner이거나 Admin을 겸한 사람 */
}

/**
 * 플랜 — 지금 무엇을 얼마에 쓰는지.
 *
 * ⚠️ 카드 모양·글자 크기는 결제 화면(`order-summary`)을 따른다 — 같은 도메인인데 결이 다르면
 *    다른 서비스처럼 보인다.
 * ⚠️ **사용량은 여기 없다.** 전에는 이 패널이 사용량까지 품고 있었는데, 화면이 2컬럼이
 *    되면서 둘이 다른 칸으로 갈렸다 — 사용량은 읽을 게 많아 주 컬럼, 플랜 지표는 짧아
 *    곁 컬럼이다. 품고 있으면 나눌 수가 없다(`BillingView`).
 * ⚠️ 해지는 화면 **맨 아래**다. 위에 두면 쓰는 사람이 먼저 만나게 된다.
 */
export function PlanPanel({ subscription, config }: PlanPanelProps) {
  /*
    ⚠️ **"무료 플랜"이 아니라 "아직/이제 못 쓰는 상태"다**(결제 전 · 만료).
       무료로 부르면 그 상태로 계속 써도 되는 것처럼 읽힌다.
  */
  const isUnpaid = !canUseWorkspace(subscription.status);

  return (
    /*
      ⚠️ **늘어나지 않는다.** 전에는 남는 높이를 이 카드가 먹게 했는데(`flex-1`), 해지 카드가
         본 컬럼으로 내려가 왼쪽이 길어지자 지표 세 줄이 한 뼘씩 벌어져 카드가 텅 비어
         보였다 — 카드는 제 내용만큼만 선다.
    */
    <section className="border-border bg-card flex flex-col rounded-2xl border">
      {/*
          ⚠️ 표식은 **결제 화면(`PlanSummaryCard`)과 같은 것**이다. 랜딩에서 보고, 결제할 때 보고,
             관리 화면에서 다시 보는 게 같은 물건이라 표식도 같아야 한다.
          ⚠️ 이름 아래 한 줄을 같이 둔다 — 이름만 있으면 40px 사각형이 글자를 눌러 버린다.
             단 **금액을 적지 않는다.** 바로 아래 `월 기본료` 칸과 같은 말이 두 번이 된다.
        */}
      <div className="flex items-center gap-3 p-7 pb-6">
        <span className="bg-foreground text-background flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Sparkles className="size-[18px]" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">
            {subscription.planName} 플랜
          </h2>
          <p className="text-muted-foreground text-[13px] leading-5">인원 제한 없이 회사당 하나</p>
          {/*
              ⚠️ **기능을 나열하지 않는다.** 아홉 개를 가운뎃점으로 이으면 한 줄짜리 글자
                 덩어리가 되어 아무도 안 읽는다. 여기는 이미 쓰고 있는 사람이 보는 관리 화면이라
                 무엇이 들어 있는지보다 **얼마가 언제 나가는지**가 중요하다 —
                 기능 목록은 `/plans`와 결제 화면이 맡는다.
            */}
        </div>

        {/*
            ⚠️ **결제 버튼을 두지 않는다.** 전에는 결제가 필요한 상태(`UNPAID`·`EXPIRED`)에서
               결제 화면으로 보내는 링크가 있었는데, 그 상태에서는 애초에 셸에 못 들어온다 —
               `canUseWorkspace()`가 막고 `/subscription`으로 보낸다. 즉 **아무도 못 보는
               버튼**이었다. 여기 올 수 있는 사람은 이미 이용 중이고, 고칠 값도 없다
               (좌석·주기가 사라졌다 · 2026-08-04). 그만두는 길은 아래 [구독 해지]가 맡는다.
          */}

        {/*
            ⚠️ 상태는 **글자로** 적는다. 색만으로 알리면 색을 못 보는 사람에게 사라진다
               — 색으로 알리는 건 에러뿐이다(§디자인 토큰).
            ⚠️ 제목 옆이 아니라 **오른쪽 끝**이다. 먹색 알약이 이름에 바짝 붙어 있으면
               플랜 이름보다 상태가 먼저 읽힌다 — 이름이 주인공이다.
          */}
        <span className="bg-foreground text-background shrink-0 rounded-full px-2.5 py-1 text-[11px] leading-4 font-medium">
          {SUBSCRIPTION_STATUS_LABEL[subscription.status]}
        </span>
      </div>

      {/*
          ⚠️ **가로 칸이 아니라 세로 줄이다.** 전에는 세 값을 나란히 세웠는데, 화면이 2컬럼이
             되면서 이 카드가 360px 곁 칸으로 갔다 — 거기서 `2026년 9월 1일(화)`이 네 줄로
             접혀 카드가 무너졌다. 좁은 칸에서는 **라벨 왼쪽 · 값 오른쪽** 한 줄이 맞다.
          ⚠️ 값은 `tabular-nums`로 오른쪽에 붙인다. 세 줄의 숫자 끝이 맞아야 위아래로 비교된다.
        */}
      {/*
          ⚠️ 지표에서 **좌석·인당 요금을 뺐다**(2026-08-04). 과금이 좌석이 아니라
             기본료 + 사용량이라, 인원 숫자를 여기 두면 그게 금액을 움직이는 줄 읽힌다.
             남은 셋은 전부 **돈과 직접 이어지는 값**이다.
        */}
      {/*
        ⚠️ 아래 여백은 **왼쪽 사용량 카드와 같은 24px**다. 28이면 이 카드가 9px 더 커져,
           두 컬럼의 **둘째 줄 카드가 그만큼 어긋나** 시작선이 안 맞는다.
      */}
      <dl className="flex flex-col gap-2.5 px-7 pb-6">
        <Metric label="월 기본료" value={formatWon(config.baseFee)} />
        <Metric
          label="다음 결제일"
          /* ⚠️ 빈 값뿐 아니라 **못 읽는 값도** `—`다 — 안 그러면 ISO 원문이 지표 자리에 뜬다 */
          value={
            subscription.nextBillingDate && isReadableDate(subscription.nextBillingDate)
              ? formatFullDate(subscription.nextBillingDate)
              : "—"
          }
          hint={isUnpaid ? "결제 후 확정됩니다" : undefined}
        />
        <Metric
          label="다음 청구 예상"
          value={formatWon(subscription.estimatedAmount)}
          hint={
            subscription.carriedOverageAmount > 0
              ? `초과분 ${formatWon(subscription.carriedOverageAmount)} 포함`
              : undefined
          }
        />
      </dl>
    </section>
  );
}

/**
 * 지표 한 줄 — 라벨 왼쪽, 값 오른쪽.
 *
 * ⚠️ 테두리 격자가 아니라 **연한 칸**이다 — 결제 화면의 포함량 칸(`Included`)과 같은 결이라,
 *    두 화면을 오갈 때 같은 종류의 값으로 읽힌다.
 * ⚠️ **줄바꿈을 막는다**(`whitespace-nowrap`). `2026년 9월 1일(화)`처럼 긴 값이 접히면
 *    한 줄에 하나라는 규칙이 깨지고 카드 높이가 값마다 들쭉날쭉해진다.
 * ⚠️ **아이콘은 두지 않는다.** 셋 다 금액·날짜라 무슨 그림을 붙여도 뜻이 겹치고,
 *    작은 칸에서 라벨보다 그림이 먼저 눈에 들어와 정작 숫자가 뒤로 밀린다.
 */
function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-secondary/40 flex items-center justify-between gap-4 rounded-xl px-4 py-3">
      <dt className="text-muted-foreground shrink-0 text-[12px] leading-5">{label}</dt>
      <dd className="min-w-0 text-right">
        <span className="block text-[13px] leading-5 font-semibold whitespace-nowrap tabular-nums">
          {value}
        </span>
        {hint && (
          <span className="text-muted-foreground/70 block pt-0.5 text-[11px] leading-4">
            {hint}
          </span>
        )}
      </dd>
    </div>
  );
}
