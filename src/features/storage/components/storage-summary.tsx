import { CircleAlert } from "lucide-react";

import { PROJECT_STATUS, PROJECT_STATUS_LABEL } from "@/constants/project";
import { formatGb, formatWon } from "@/features/billing/pricing";

import type { StorageTotals } from "../storage";

/**
 * 전체 용량 한 장.
 *
 * ⚠️ **링으로 그린다.** 막대 하나로는 63%가 여유인지 빠듯한지 잘 안 잡힌다 —
 *    원은 한 바퀴가 곧 전부라 남은 조각이 크기로 바로 보인다.
 * ⚠️ 두 조각(음성 / 자막·요약)을 갈라 그린다. 한 덩어리로 그리면 어느 쪽이 자리를
 *    차지하는지 안 보이는데, 지울 수 있는 건 음성뿐이라 그 비율이 곧 "지워서 얼마나 벌 수
 *    있나"다. 숫자로만 적어 두면 두 값을 머릿속에서 비교해야 한다.
 * ⚠️ 두 조각은 **색이 아니라 명도**로 나눈다. 색으로 알리는 건 에러뿐이다(§디자인 토큰) —
 *    넘겼을 때만 막대가 빨강이 된다.
 * ⚠️ **막지 않는다.** 넘겨도 "이만큼 넘었고 금액이면 ₩X"까지만 말하고 결제로 몰지 않는다
 *    (§요금제: 초과분은 다음 결제일에 기본료와 합산 청구).
 */
/** 지울 수 있는 건 끝난 프로젝트뿐이라 이 화면 문구에 `완료` 라벨이 두 번 들어간다 */
const DONE_LABEL = PROJECT_STATUS_LABEL[PROJECT_STATUS.DONE];

interface StorageSummaryProps {
  totals: StorageTotals;
  /** 끝난 프로젝트를 다 지우면 비는 용량(GB) */
  freeableGb: number;
  /** 지금 지울 수 있는 프로젝트 수 */
  deletableCount: number;
}

export function StorageSummary({ totals, freeableGb, deletableCount }: StorageSummaryProps) {
  const percent = Math.round(totals.ratio * 100);
  const isOver = totals.overageGb > 0;

  /*
    ⚠️ 넘겼을 때는 **분모를 사용량으로 바꾼다.** 포함량으로 고정하면 막대가 100%에서 잘려
       12GB를 넘겼는지 1GB를 넘겼는지 그림으로는 구분이 안 된다 — 넘긴 만큼까지 그리고
       한도 자리에 선을 그어야 "어디까지가 포함량인지"와 "얼마나 넘었는지"가 같이 보인다.
       링으로는 못 하던 일이다(한 바퀴를 넘어 그릴 수 없다).
    ⚠️ 0으로 나누면 `NaN%`가 되어 막대가 아예 안 그려진다.
  */
  const denom = Math.max(totals.usedGb, totals.includedGb);
  const toPercent = (gb: number) => (denom > 0 ? (gb / denom) * 100 : 0);
  const voicePercent = toPercent(totals.voiceGb);
  const sttPercent = toPercent(totals.sttGb);
  /** 포함량이 끝나는 자리 — 넘겼을 때만 선으로 긋는다 */
  const limitPercent = toPercent(totals.includedGb);

  return (
    <section className="border-border bg-card rounded-2xl border p-7">
      <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">전체 용량</h2>

      {/*
        ⚠️ **가로 막대 하나로 그린다.** 링을 써 봤는데 이 화면에는 안 맞았다 —
           원은 한 바퀴가 곧 전부라 "얼마나 찼나"는 잘 보이지만, **두 조각의 크기를
           나란히 견주기**가 어렵다. 이 화면에서 판단할 것은 "음성이 자막·요약보다
           얼마나 큰가"(= 지워서 얼마나 버나)라, 같은 축에 이어 놓는 막대가 맞다.
        ⚠️ 조각은 **색이 아니라 명도**로 나눈다 — 색으로 알리는 건 에러뿐이고, 넘겼을
           때만 빨강이 된다(§디자인 토큰).
        ⚠️ 막대는 `aria-hidden`이 아니다. `role="progressbar"`로 값을 읽히게 한다.
      */}
      <div className="pt-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="flex items-baseline gap-1.5 whitespace-nowrap tabular-nums">
            <span className="text-[32px] leading-10 font-semibold tracking-[-0.9px]">
              {formatGb(totals.usedGb)}
            </span>
            <span className="text-muted-foreground text-[13px] leading-5">
              / {formatGb(totals.includedGb)}
            </span>
          </p>
          <p
            className={
              isOver
                ? "text-destructive shrink-0 text-[13px] leading-5 font-medium tabular-nums"
                : "text-muted-foreground shrink-0 text-[13px] leading-5 tabular-nums"
            }
          >
            {isOver
              ? `${formatGb(totals.overageGb)} 초과 · ${percent}%`
              : `${formatGb(totals.includedGb - totals.usedGb)} 남음 · ${percent}%`}
          </p>
        </div>

        {/*
          ⚠️ 두 조각을 **이어 붙인다**(`flex`). 겹쳐 그리면 뒤 조각의 시작점을 계산해야 하고,
             지운 뒤 값이 바뀔 때 어긋난다.
          ⚠️ 넘치면 `overflow-hidden`이 잘라 준다 — 초과분까지 그리면 막대가 칸을 뚫는다.
        */}
        <div
          className="bg-foreground/10 relative mt-3.5 flex h-2.5 overflow-hidden rounded-full"
          role="progressbar"
          aria-label="저장소 소진율"
          aria-valuenow={Math.min(100, percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${formatGb(totals.includedGb)} 중 ${formatGb(totals.usedGb)}, ${percent}%. 음성 ${formatGb(totals.voiceGb)}, 자막·요약 ${formatGb(totals.sttGb)}`}
        >
          <span
            className={isOver ? "bg-destructive block h-full" : "bg-foreground block h-full"}
            style={{ width: `${Math.min(100, voicePercent)}%` }}
          />
          <span
            className={isOver ? "bg-destructive/45 block h-full" : "bg-foreground/35 block h-full"}
            style={{ width: `${Math.min(100 - Math.min(100, voicePercent), sttPercent)}%` }}
          />

          {/*
            ⚠️ **한도 선** — 넘겼을 때만 긋는다. 안 넘겼으면 막대 끝이 곧 한도라 선을 또
               그으면 같은 말이 두 번이다.
            ⚠️ 선 색은 카드 바탕(`--card`)이다. 빨간 막대를 **가르는** 자국이라 어두운 선을
               쓰면 조각이 하나 더 있는 것처럼 읽힌다.
          */}
          {isOver && (
            <span
              aria-hidden
              className="bg-card absolute inset-y-0 w-[2px]"
              style={{ left: `${limitPercent}%` }}
            />
          )}
        </div>

        {/*
          ⚠️ 한도 선이 무엇인지 **글자로 적는다.** 선만 그으면 왜 거기 있는지 알 수 없다.
             선 자리에 맞춰 놓아야 눈이 옮겨 가지 않는다.
        */}
        {isOver && (
          <p className="relative h-4">
            <span
              className="text-muted-foreground absolute -translate-x-1/2 text-[11px] leading-4 whitespace-nowrap tabular-nums"
              style={{ left: `${limitPercent}%` }}
            >
              포함 {formatGb(totals.includedGb)}
            </span>
          </p>
        )}

        {/*
          ⚠️ 범례를 **막대 바로 아래**에 둔다. 어느 조각이 어느 값인지는 막대와 붙어 있어야
             눈이 옮겨 가지 않는다.
          ⚠️ 이름 옆에 **성격**을 적는다. 크기만 알려 주면 어느 쪽을 지워야 하는지는 모른다 —
             이 화면의 답이 거기 있다.
          ⚠️ **둘 다 삭제 가능**이다(2026-08-05 팀 결정). 보관 기한이 없는데 자막·요약만
             못 지우면 저장량이 단조 증가해 포함량이 반드시 부족해진다 — 그 구조를 막았다.
             대신 잃는 것(회의 기록·액션 출처 추적)은 표와 확인 창이 분명히 말한다.
        */}
        <dl className="flex flex-wrap items-center gap-x-7 gap-y-2 pt-4">
          <Legend
            label="음성"
            value={formatGb(totals.voiceGb)}
            dotClassName={isOver ? "bg-destructive" : "bg-foreground"}
            hint="삭제 가능"
          />
          <Legend
            label="자막·요약"
            value={formatGb(totals.sttGb)}
            dotClassName={isOver ? "bg-destructive/45" : "bg-foreground/35"}
            hint="삭제 가능"
          />
          {/*
            ⚠️ 삭제 가능 용량은 **같은 줄 오른쪽 끝**에 둔다(`ml-auto`). 이 화면에 온 이유의
               답이라 눈에 들어와야 하는데, 따로 칸을 만들면 카드 안에 카드가 생긴다.
          */}
          <div className="border-border ml-auto flex items-baseline gap-2 border-l pl-7">
            <dt className="text-muted-foreground text-[13px] leading-5">삭제 가능</dt>
            <dd className="text-[13px] leading-5 font-semibold tabular-nums">
              {formatGb(freeableGb)}
            </dd>
            <dd className="text-muted-foreground text-[12px] leading-4">
              {/*
                ⚠️ `완료`를 손으로 적지 않는다 — `PROJECT_STATUS_LABEL`이 정본이다(§도메인 상수).
                   라벨이 `완료`에서 다른 말로 바뀌면 이 문장만 옛말을 하게 된다.
              */}
              {deletableCount > 0
                ? `${DONE_LABEL} 프로젝트 ${deletableCount}개`
                : `${DONE_LABEL} 프로젝트 없음`}
            </dd>
          </div>
        </dl>
      </div>

      {isOver && (
        /*
          ⚠️ 넘긴 뒤에만 뜬다. 80% 경고는 구독·결제 화면이 맡는다 — 같은 말을 두 화면에서
             하면 한쪽 문턱만 바뀌었을 때 서로 다른 숫자를 말하게 된다.
        */
        <p className="border-destructive/30 bg-destructive/5 mt-5 flex items-start gap-2 rounded-lg border px-3.5 py-3 text-[12px] leading-[18px] break-keep">
          <span className="flex h-[18px] shrink-0 items-center">
            <CircleAlert className="text-destructive size-3.5" aria-hidden />
          </span>
          <span>
            <span className="font-semibold">{formatGb(totals.overageGb)} 초과</span> — 현재까지{" "}
            {formatWon(totals.overageAmount)}. 다음 결제일에 기본료와 합산 청구됩니다. 음성을
            삭제하면 다음 주기부터 반영됩니다.
          </span>
        </p>
      )}
    </section>
  );
}

/** 범례 한 줄 — 점 · 이름 · 값 · 성격 */
function Legend({
  label,
  value,
  dotClassName,
  hint,
}: {
  label: string;
  value: string;
  dotClassName: string;
  hint: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className={`${dotClassName} size-2 shrink-0 translate-y-[-2px] rounded-full`}
        aria-hidden
      />
      <dt className="text-[13px] leading-5">{label}</dt>
      <dd className="text-[13px] leading-5 font-medium tabular-nums">{value}</dd>
      {/* ⚠️ `/70`을 쓰지 않는다 — 11px 글자가 라이트에서 4.5:1에 못 미친다. 이 문구는
         "어느 쪽을 지울 수 있나"를 말하는 자리라 흐리면 안 된다(§a11y) */}
      <span className="text-muted-foreground text-[11px] leading-5">{hint}</span>
    </div>
  );
}
