import { CircleAlert, HardDrive, Info, type LucideIcon, Sparkles } from "lucide-react";

import { formatFullDate, isReadableDate } from "@/lib/date";

import { formatGb, formatTokens, formatWon } from "../pricing";
import type { Subscription } from "../subscription";
import type { BillingConfig } from "../types";
import { buildUsage, shouldWarnUsage, USAGE_WARN_RATIO, type UsageAxis } from "../usage";

interface UsagePanelProps {
  subscription: Subscription;
  config: BillingConfig;
}

/**
 * 이번 주기 사용량 — **돈이 왜 나가는지 보여주는 자리**다.
 *
 * ⚠️ 축은 **AI 사용량과 저장 공간 둘뿐**이다. 회의 건수는 청구와 무관해서 아래 참고 줄로 내렸다 —
 *    과금과 상관없는 숫자를 같은 크기로 놓으면 무엇 때문에 돈이 나가는지 흐려진다.
 * ⚠️ **넘겨도 막지 않는다**(팀 결정). 대신 얼마가 더 나가는지 금액으로 적는다(§정직성).
 * ⚠️ **월말 예측을 적지 않는다**(2026-08-05 제거). 프론트가 며칠치를 늘려 잡은 추정이라
 *    주기 초반일수록 크게 흔들렸고, BE 스펙에 없는 값을 화면이 지어낸 셈이었다.
 *    BE가 예측을 내려 주면 그 값을 받아 쓴다(§연동 검증).
 */
export function UsagePanel({ subscription, config }: UsagePanelProps) {
  const usage = buildUsage({ config, usage: subscription.usage });

  return (
    <section className="border-border bg-card rounded-2xl border p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">이번 주기 사용량</h2>
        {/*
          ⚠️ **못 읽는 쪽만 `—`로 둔다.** 범위 표기라 한쪽이 비어도 `9월 1일 ~ —`로 읽히고,
             어느 끝을 모르는지가 그대로 드러난다 — 줄을 통째로 숨기면 주기가 없는 것처럼 보인다.
             날짜 함수는 못 읽으면 원문을 돌려주므로, 그대로 두면 ISO가 그 자리에 뜬다.
        */}
        <p className="text-muted-foreground/70 text-[12px] leading-4 tabular-nums">
          {periodLabel(subscription.currentPeriodStart)} ~{" "}
          {periodLabel(subscription.currentPeriodEnd)}
        </p>
      </div>

      <ul className="flex flex-col gap-5 pt-5">
        {/*
          ⚠️ **아이콘으로 두 축을 가른다.** 둘 다 `이름 · 숫자 · 막대`라 생김새가 같아서, 훑을 때
             어느 줄이 무엇인지 다시 읽어야 했다. 이모지는 안 쓴다(§디자인 토큰 — ❌이모지).
          ⚠️ 어느 축인지는 **부르는 쪽이 안다**(`usage.tokens`·`usage.storage`). 라벨 문자열을
             보고 고르지 않는다 — 이름이 바뀌면 조용히 아이콘이 사라진다(§라벨 하드코딩 금지).
        */}
        <li>
          <Axis axis={usage.tokens} format={formatTokens} icon={Sparkles} />
        </li>
        <li>
          <Axis axis={usage.storage} format={formatGb} icon={HardDrive} />
          {/*
            ⚠️ 저장 공간은 **음성과 자막을 나눠** 적는다. 둘 다 과금 대상인데,
               지울 때 음성은 권장이고 자막·요약은 비권장이라(제품 자산) 무엇이 얼마인지
               모르면 지울 수 없다.
          */}
          <p className="text-muted-foreground/70 pt-1.5 text-[11px] leading-4 tabular-nums">
            음성 {formatGb(subscription.usage.voiceStorageGb)} · 자막·요약{" "}
            {formatGb(subscription.usage.sttStorageGb)}
          </p>
        </li>
      </ul>

      <UsageBanner tokens={usage.tokens} storage={usage.storage} />
    </section>
  );
}

/**
 * 카드 아래 배너 — **알림을 띄우지 않고 여기서만 알린다**(팀 확정 2026-08-04).
 *
 * ⚠️ 회의 개설 때 경고를 띄우거나 알림을 보내지 않는다. 회의는 전 역할이 여는데
 *    정작 손쓸 수 있는 사람은 대표·Admin뿐이라, 대부분에게는 못 고치는 경고가 된다.
 *    그래서 **금액을 볼 수 있는 이 화면에만** 둔다.
 * ⚠️ **막지 않는다.** "이만큼 넘었고 금액이면 ₩X"까지만 말하고 결제로 몰지 않는다.
 * ⚠️ 넘긴 뒤에만 색을 쓴다. 80% 경고는 **문구로** 말한다 — 색은 못 보는 사람에게 사라진다.
 */
function UsageBanner({ tokens, storage }: { tokens: UsageAxis; storage: UsageAxis }) {
  const axes = [tokens, storage];
  const overAxes = axes.filter((axis) => axis.overage > 0);

  /*
    ⚠️ **이미 넘긴 경우가 먼저다.** 확정된 금액이 있는데 "넘을 것 같다"고 말하면
       아직 안 넘은 줄 안다.
  */
  if (overAxes.length > 0) {
    const total = overAxes.reduce((sum, axis) => sum + axis.overageAmount, 0);
    return (
      /* ⚠️ 표식을 앞에 둔다 — 글자만 있으면 본문에 섞여 그냥 설명으로 읽힌다 */
      <p className="border-destructive/30 bg-destructive/5 mt-5 flex items-start gap-2 rounded-lg border px-3.5 py-3 text-[12px] leading-[18px] break-keep">
        <span className="flex h-[18px] shrink-0 items-center">
          <CircleAlert className="text-destructive size-3.5" aria-hidden />
        </span>
        <span>
          <span className="font-semibold">
            {overAxes.map((axis) => axis.label).join(" · ")} 포함량 초과
          </span>{" "}
          지금까지 {formatWon(total)}이며, 다음 결제일에 기본료와 함께 청구됩니다.
        </span>
      </p>
    );
  }

  /*
    아직 안 넘긴 경우 — **소진율을 알리고, 규칙을 말한다.**
    ⚠️ `지금 속도면 넘습니다`처럼 **예측을 단정하지 않는다.** 그건 프론트가 며칠치로 늘려 잡은
       추정이라 틀릴 수 있는데, 단정해 말하면 겁을 주는 게 된다(§정직성).
       대신 **넘기면 어떻게 되는지**를 알려 주면, 판단은 쓰는 사람이 한다.
  */
  const nearAxes = axes.filter((axis) => shouldWarnUsage(axis));

  if (nearAxes.length === 0) return null;

  return (
    /*
      ⚠️ 표식은 두되 **색은 안 쓴다.** 아직 넘긴 게 아니라 알려 주는 말이라, 빨갛게 하면
         이미 돈이 더 나가는 줄 읽힌다 — 색으로 알리는 건 에러뿐이다(§디자인 토큰).
    */
    <p className="border-border bg-secondary mt-5 flex items-start gap-2 rounded-lg border px-3.5 py-3 text-[12px] leading-[18px] break-keep">
      {/*
        ⚠️ 아이콘을 **첫 줄 높이(18px) 상자에 넣어 가운데** 맞춘다. `mt-px`로 눈대중하면
           14px 아이콘이 12px 글자보다 한 칸 떠 보인다 — 둘은 중심이 다르다.
        ⚠️ `items-center`(부모)로 하면 안 된다. 문구가 두 줄이 되는 순간 아이콘이
           가운데로 내려가 첫 줄과 안 맞는다.
      */}
      <span className="flex h-[18px] shrink-0 items-center">
        <Info className="text-muted-foreground size-3.5" aria-hidden />
      </span>
      <span>
        {/*
          ⚠️ 문턱은 **상수에서 읽는다.** `80%`라고 적어 두면 문턱을 조정할 때 띄우는 조건만
             바뀌고 문구는 옛 숫자를 말한다 — 화면이 거짓말을 하게 된다.
        */}
        {nearAxes.map((axis) => axis.label).join(" · ")} 사용량이 {USAGE_WARN_RATIO * 100}%를
        넘었습니다. 포함량을 넘기면 초과분이 다음 결제일에 기본료와 함께 추가로 청구됩니다.
      </span>
    </p>
  );
}

/** 한 축 — 쓴 양 / 총량, 소진율 막대. 넘겼을 때만 초과량·금액을 덧붙인다 */
function Axis({
  axis,
  format,
  icon: Icon,
}: {
  axis: UsageAxis;
  format: (value: number) => string;
  /** 이 축을 가리키는 표식 — `lucide` 아이콘 컴포넌트를 그대로 받는다 */
  icon: LucideIcon;
}) {
  const percent = Math.round(axis.ratio * 100);
  const isOver = axis.overage > 0;

  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        {/*
          ⚠️ 아이콘은 **장식**이라 `aria-hidden`이다 — 이름은 옆 글자가 말한다(§a11y).
          ⚠️ 한글은 아이콘보다 1px 내려야 눈높이가 맞는다. 한글 글자는 위가 비어 있어
             그대로 두면 글자만 떠 보인다.
        */}
        <span className="flex items-center gap-1.5 text-[13px] leading-5">
          <Icon className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
          <span>{axis.label}</span>
        </span>
        <span className="text-[13px] leading-5 font-medium tabular-nums">
          {format(axis.used)}
          <span className="text-muted-foreground pl-1 font-normal">
            / {format(axis.included)} · {percent}%
          </span>
        </span>
      </div>

      {/*
        ⚠️ 막대는 100%에서 멈추되 **숫자는 넘긴 값을 그대로** 보여준다.
           막대까지 넘겨 그리면 칸을 뚫고 나간다.
        ⚠️ `aria-*`로 값을 읽힌다 — 막대는 눈으로만 읽는 표현이라 그대로 두면 안 보인다.
      */}
      <div
        role="progressbar"
        aria-label={`${axis.label} 소진율`}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${format(axis.included)} 중 ${format(axis.used)}, ${percent}%`}
        className="bg-foreground/10 mt-2 h-1.5 overflow-hidden rounded-full"
      >
        {/*
          ⚠️ 넘겼을 때만 색을 바꾼다. 색으로 알리는 건 에러뿐이고(§디자인 토큰),
             80% 경고는 **문구**로 말한다 — 색은 못 보는 사람에게 사라진다.
        */}
        <div
          className={
            isOver ? "bg-destructive h-full rounded-full" : "bg-foreground h-full rounded-full"
          }
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>

      {/*
        ⚠️ **예상 사용량을 적지 않는다.** 한때 `주기 종료 시 N 예상`을 띄웠는데,
           그건 프론트가 며칠치를 늘려 잡은 추정이라 주기 초반일수록 크게 흔들렸다 —
           회의가 주중에 몰리는데 "매일 똑같이 쓴다"고 가정한 식이었다.
           BE 스펙에 없는 값을 화면이 지어낸 셈이라 뺐다(§연동 검증 · §정직성).
        ⚠️ **넘긴 뒤에만 말한다.** 그 값은 서버가 아는 사실이다.
      */}
      {isOver && (
        <p className="text-muted-foreground/70 pt-1.5 text-[11px] leading-4 tabular-nums">
          {`${format(axis.overage)} 초과 · ${formatWon(axis.overageAmount)}`}
        </p>
      )}
    </>
  );
}

/** 주기 양 끝 표기 — 읽을 수 없으면 ISO 원문 대신 `—`다 */
function periodLabel(iso: string): string {
  return isReadableDate(iso) ? formatFullDate(iso) : "—";
}
