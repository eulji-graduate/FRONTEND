"use client";

import type { LucideIcon } from "lucide-react";
import { CreditCard, FolderOpen, Mail, Users } from "lucide-react";

import { CheckMark } from "@/components/common/check-mark";

/** 요약 한 줄 — 무엇을, 얼마나 정했는지. */
interface SummaryRow {
  icon: LucideIcon;
  label: string;
  /** 오른쪽에 붙는 결과. 숫자가 들어가므로 `tabular-nums`로 자리를 맞춘다. */
  value: string;
}

interface DoneSummaryProps {
  departmentCount: number;
  roleCount: number;
  positionCount: number;
  inviteCount: number;
  /**
   * 방금 결제한 내용 — `12명 · 월간 ₩130,680`.
   * ⚠️ 결제가 온보딩의 마지막 단계가 되면서(2026-08-04) **요약에 빠지면 안 되는 줄**이 됐다.
   *    돈이 나간 단계인데 "정한 것" 목록에 없으면 결제가 됐는지 확인할 길이 여기 없다.
   */
  paymentSummary: string;
}

/**
 * 온보딩에서 정한 것 네 줄.
 *
 * ⚠️ 초록 체크를 줄마다 붙이지 않는다 — 색으로 알리는 건 에러뿐이다(CLAUDE.md §디자인 토큰).
 *    다 됐다는 건 이 화면에 왔다는 사실과 위쪽 큰 표시가 이미 말한다.
 */
export function DoneSummary({
  departmentCount,
  roleCount,
  positionCount,
  inviteCount,
  paymentSummary,
}: DoneSummaryProps) {
  const rows: SummaryRow[] = [
    {
      icon: FolderOpen,
      label: "팀 체계",
      value: roleCount > 0 ? `팀 ${departmentCount} · 역할 ${roleCount}` : `팀 ${departmentCount}`,
    },
    { icon: Users, label: "직급 체계", value: `직급 ${positionCount}` },
    // ⚠️ 여기서 "발송"이라고 적지 않는다 — 실제 메일은 아직 안 나간다(CLAUDE.md §정직성).
    //    이 화면은 "정한 것"을 요약할 뿐이고, 발송 안내는 3단계 화면이 이미 한다.
    { icon: Mail, label: "사원 초대", value: inviteCount > 0 ? `${inviteCount}명` : "없음" },
    // ⚠️ 맨 아래다. 앞 세 줄은 "정한 것"이고 이건 **실제로 일어난 일**이라, 순서를 섞으면
    //    무엇이 확정된 사실인지 흐려진다.
    { icon: CreditCard, label: "결제", value: paymentSummary },
  ];

  return (
    <dl className="border-border bg-card w-full overflow-hidden rounded-lg border">
      {rows.map((row, index) => (
        <div
          key={row.label}
          className={
            index > 0
              ? "border-border flex items-center gap-2.5 border-t px-4 py-3"
              : "flex items-center gap-2.5 px-4 py-3"
          }
        >
          {/*
            ⚠️ 상자 기준으로는 이미 정중앙이다(둘 다 20px 줄 안에서 가운데).
               그래도 처져 보여 1px 올린다 — 눈으로 맞춘 값이라 계산 근거는 없다.
          */}
          <row.icon className="text-muted-foreground/60 size-4 shrink-0" aria-hidden />
          <dt className="text-[13px] leading-5">{row.label}</dt>

          <span className="flex-1" aria-hidden />

          <dd className="flex items-center gap-2">
            <span className="text-muted-foreground text-[13px] leading-5 tabular-nums">
              {row.value}
            </span>
            <CheckMark size={16} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
