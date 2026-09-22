import { Receipt } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { formatFullDate, isReadableDate } from "@/lib/date";

import { formatWon } from "../pricing";
import { PAYMENT_STATUS, PAYMENT_STATUS_LABEL, type PaymentRecord } from "../subscription";

interface PaymentHistoryPanelProps {
  payments: readonly PaymentRecord[];
}

/**
 * 결제 내역.
 *
 * ⚠️ 표는 `overflow-x-auto`로 감싼다 — 좁은 화면에서 칸이 찌그러지는 대신 옆으로 넘긴다
 *    (CLAUDE.md §레이아웃).
 * ⚠️ 상태는 색이 아니라 **글자**로 알린다. 색만 쓰면 색을 못 보는 사람에게 사라진다.
 * ⚠️ 금액은 `tabular-nums` — 자릿수가 흔들리면 위아래 비교가 안 된다.
 * ⚠️ **결제일을 ISO로 찍지 않는다.** `2026-08-01`은 개발자용 표기다(§카피 — `8월 5일(수)`).
 *    같은 화면 위쪽이 `2026년 9월 1일(화)`로 말하는데 표만 ISO면 한 화면이 두 말을 한다.
 *    지난 결제는 해를 넘기므로 **연도를 늘 붙인다**(`formatFullDate`).
 * ⚠️ **머리와 값의 정렬을 같게** 둔다. 머리는 오른쪽인데 값이 가운데면 열이 어긋나 보인다.
 *    여기서는 전부 가운데다 — 칸이 넓어 왼쪽 정렬로 두면 값끼리 멀어진다.
 */
export function PaymentHistoryPanel({ payments }: PaymentHistoryPanelProps) {
  return (
    <section className="border-border bg-card rounded-2xl border">
      <h2 className="px-7 py-6 text-[17px] leading-7 font-semibold tracking-[-0.3px]">결제 내역</h2>

      {payments.length === 0 ? (
        /* 빈 상태 — 언제 여기 채워지는지까지 적는다(§3상태) */
        <EmptyState
          bordered
          icon={Receipt}
          title="결제 내역이 없습니다."
          description="결제가 이뤄지면 그 즉시 이 목록에 쌓입니다."
        />
      ) : (
        <div className="border-border overflow-x-auto border-t">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              {/*
                ⚠️ 머리에 **띠**를 깐다(DESIGN §3) — 보더만으로는 머리와 본문이 같은 면으로
                   읽힌다. `--secondary`는 흰 카드와 2%밖에 차이가 없어 안 보이므로 먹색을
                   옅게 깐다(행 hover보다 진해야 위아래가 안 뒤집힌다).
              */}
              <tr className="bg-secondary/50 border-border text-muted-foreground border-b text-[12px] leading-4">
                <th scope="col" className="px-6 py-3 text-center font-medium">
                  결제일
                </th>
                {/*
                  ⚠️ 머리와 값이 **한 칸씩 밀려 있었다** — 좌석 과금을 걷어낼 때(2026-08-04)
                     `인원` 열만 남아, `초과분` 아래에 플랜명이 들어갔다.
                     인원은 이제 금액과 무관하므로 열 자체를 없앤다.
                */}
                <th scope="col" className="px-3 py-3 text-center font-medium">
                  플랜
                </th>
                <th scope="col" className="px-3 py-3 text-center font-medium">
                  초과분
                </th>
                <th scope="col" className="px-3 py-3 text-center font-medium">
                  금액
                </th>
                <th scope="col" className="px-6 py-3 text-center font-medium">
                  상태
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-border hover:bg-secondary/40 border-b transition-colors last:border-b-0"
                >
                  <th
                    scope="row"
                    className="px-6 py-3.5 text-center text-[13px] leading-5 font-normal tabular-nums"
                  >
                    {/*
                      ⚠️ 원본은 `dateTime`에 남긴다 — 표기를 바꿔도 값은 안 잃는다.
                      ⚠️ **못 읽어도 `—`로 비우지 않는다.** 이 칸은 `scope="row"`, 곧 그 줄의
                         정체다. 금액·상태는 그대로인데 날짜만 비면 `결제일 없는 결제`가 되고
                         스크린 리더는 이 줄을 `—`라 부른다. 돈이 나간 기록이라 언제였는지
                         확인할 길이 사라지는 쪽이 개발자용 표기가 뜨는 것보다 나쁘다.
                    */}
                    <time dateTime={payment.paidAt}>
                      {isReadableDate(payment.paidAt)
                        ? formatFullDate(payment.paidAt)
                        : payment.paidAt}
                    </time>
                  </th>
                  <td className="px-3 py-3.5 text-center text-[13px] leading-5">
                    {payment.planName}
                  </td>
                  <td className="px-3 py-3.5 text-center text-[13px] leading-5 tabular-nums">
                    {payment.overageAmount > 0 ? formatWon(payment.overageAmount) : "—"}
                  </td>
                  <td className="px-3 py-3.5 text-center text-[13px] leading-5 tabular-nums">
                    {formatWon(payment.amount)}
                  </td>
                  {/* ⚠️ 배지만 든 칸에도 본문 크기를 준다 — 안 주면 셀이 기본 16px을 물려받아 줄 높이가 달라진다 */}
                  <td className="px-6 py-3.5 text-center text-[13px] leading-5">
                    <span
                      className={
                        payment.status === PAYMENT_STATUS.FAILED
                          ? "bg-destructive/10 text-destructive rounded px-2 py-0.5 text-[11px] leading-4"
                          : "bg-secondary text-muted-foreground border-border rounded border px-2 py-0.5 text-[11px] leading-4"
                      }
                    >
                      {PAYMENT_STATUS_LABEL[payment.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
