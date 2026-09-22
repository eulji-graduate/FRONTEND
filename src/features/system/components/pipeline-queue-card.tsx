import { Activity, ChevronRight } from "lucide-react";
import Link from "next/link";

import type { PipelineQueueSummary } from "../types";
import { SystemCardHeading } from "./system-card-heading";

interface PipelineQueueCardProps {
  queue: PipelineQueueSummary;
}

/**
 * 대시보드 곁 컬럼의 "처리 큐" 카드.
 *
 * ⚠️ **"플랜 분포" 도넛이 있던 자리다.** 요금제가 하나뿐이라 "분포"라는 개념이 없어졌는데
 *    (CLAUDE.md §요금제), 빈 자리를 채우려고 없는 지표를 지어내지 않는다(§정직성) —
 *    **이미 있는 값**(시스템 모니터링의 처리 큐)을 옮겨 왔다.
 * ⚠️ 대시보드의 나머지는 전부 기업·매출 축이라 시스템이 지금 건강한지는 아무 데도 없었다.
 *    운영자가 처음 여는 화면이니 여기 있는 편이 맞다.
 * ⚠️ **숫자만 보여주고 조작은 안 한다.** 재처리는 시스템 모니터링에서 한다 — 같은 버튼을
 *    두 곳에 두면 어디서 눌렀는지에 따라 결과가 다른 것처럼 보인다.
 * ⚠️ **폭은 페이지 격자가 정한다**(곁 컬럼 360px, DESIGN §1). 한때 `lg:w-64`(256px)로 여기서
 *    또 정하고 있었는데, 격자와 둘이 싸워 카드가 제 칸보다 100px 좁게 그려졌다 —
 *    위아래 카드와 오른쪽 끝이 어긋나 중간 줄만 안쪽으로 들어가 보였다.
 */
export function PipelineQueueCard({ queue }: PipelineQueueCardProps) {
  /** ⚠️ 단위(`건`)는 값과 갈라 둔다 — 붙여 쓰면 `건`까지 20px로 커져 숫자와 같은 무게로 읽힌다. */
  const rows = [
    { label: "대기", value: queue.waitingCount, meta: "처리 예정" },
    {
      label: "처리 중",
      value: queue.processingCount,
      meta: `평균 ${queue.processingAvgSeconds}초`,
    },
    { label: "재처리 필요", value: queue.failedCount, meta: "처리 실패", isFailure: true },
  ];

  return (
    <section className="border-border bg-card flex w-full flex-col rounded-2xl border">
      <SystemCardHeading icon={Activity}>처리 큐</SystemCardHeading>

      {/*
        ⚠️ 남는 높이는 목록이 먹는다 — 옆 차트 카드가 늘 더 길어서, 내용을 위에 몰아 두면
           이 카드만 아래가 통째로 빈다(DESIGN §1: `items-start`를 쓰지 않는다).
        ⚠️ 가운데로 모으지 않고 **고르게 벌린다**(`justify-between`). 가운데로 모으면 첫 줄이
           옆 카드 내용보다 한참 내려가 두 카드가 서로 다른 높이에서 시작하는 것처럼 보인다.
      */}
      <ul className="flex flex-1 flex-col justify-between gap-4 px-7 pt-4 pb-4">
        {rows.map((row) => (
          /*
            ⚠️ `items-baseline`이 아니라 `items-center`다. 왼쪽이 **두 줄**(라벨+보조)이라
               숫자를 첫 줄 베이스라인에 맞추면 숫자만 위로 떠서 줄이 안 맞아 보인다.
          */
          <li key={row.label} className="flex items-center justify-between gap-3">
            <span className="flex flex-col">
              <span className="text-foreground text-[13px] leading-5">{row.label}</span>
              <span className="text-muted-foreground text-[12px] leading-4">{row.meta}</span>
            </span>
            {/*
              ⚠️ 색으로 알리는 건 **에러(빨강)뿐**이다(CLAUDE.md §디자인 토큰).
                 실패가 0건이면 알릴 게 없으므로 빨강도 안 쓴다 — 늘 빨간 줄은 곧 안 읽힌다.
            */}
            <span
              className={`flex items-baseline gap-0.5 ${
                row.isFailure && queue.failedCount > 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              <span className="text-[20px] leading-7 font-semibold tracking-[-0.4px] tabular-nums">
                {row.value}
              </span>
              <span className="text-[13px] leading-5">건</span>
            </span>
          </li>
        ))}
      </ul>

      {/*
        카드 바닥의 이동 줄.
        ⚠️ 밑줄만 그어 둔 글자였는데, 하얀 카드 바닥에 회색 글씨 한 줄이라 마감이 안 된 것처럼
           보였다. **칸 전체를 누를 자리로** 만들고(보더도 카드 폭까지 늘린다) 오른쪽에
           방향 표시를 둬서, 읽는 줄이 아니라 가는 줄이라는 게 모양으로 드러나게 한다.
        ⚠️ 한글을 내리지 않는다 — 내렸더니 글자가 화살표보다 0.73px 아래로 갔다(13px에서 실측).
           `items-center`가 이미 맞춰 준다(`system-card-heading.tsx`와 같은 이유).
      */}
      <Link
        href="/system/monitor"
        className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03] focus-visible:ring-ring border-border group mt-auto flex items-center justify-between gap-2 rounded-b-2xl border-t px-7 py-4 text-[12px] leading-4 transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none"
      >
        <span>시스템 모니터링에서 보기</span>
        <ChevronRight
          className="size-3.5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </section>
  );
}
