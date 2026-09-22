"use client";

import { CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { PaymentMethod } from "../subscription";

interface PaymentMethodsPanelProps {
  /** 등록된 카드 — 아직 없으면 `null` */
  method: PaymentMethod | null;
  canManage: boolean;
  /** 카드를 갈아 끼운다 — 없으면 처음 등록이고, 있으면 덮어쓴다 */
  onChange: () => void;
}

/**
 * 결제 수단 — **회사당 한 장뿐이다**(2026-08-05 확정).
 *
 * ⚠️ **더하는 화면이 아니다.** 구독이 회사당 하나이고 청구도 한 번이라 두 번째 카드가
 *    나갈 자리가 없다. 여러 장을 두면 `기본` 지정·삭제 금지 규칙이 따라붙는데,
 *    정작 결제는 한 장으로만 나가서 화면만 복잡해진다.
 * ⚠️ **지우는 길도 두지 않는다.** 지우면 다음 청구가 실패하는데 대신 올릴 카드가 없다 —
 *    그만두려면 카드를 지우는 게 아니라 **구독을 해지**한다(아래 해지 카드).
 * ⚠️ **카드 입력칸을 직접 만들지 않는다.** 우리 폼으로 원번호를 받으면 PCI-DSS 대상이 된다 —
 *    등록·변경은 결제사 창이 통째로 그리고, 우리는 인증 결과만 받는다.
 * ⚠️ 그래서 버튼은 지금 **목**이다. 실제로는 결제사 창이 뜨고, 성공 응답을 서버가 빌링키로
 *    바꿔 저장한 뒤에야 이 줄이 갱신된다(§정직성).
 */
export function PaymentMethodsPanel({ method, canManage, onChange }: PaymentMethodsPanelProps) {
  return (
    <section className="border-border bg-card rounded-2xl border">
      {/* ⚠️ 머리 아래 여백은 20이다(§DESIGN 3) — 24로 두면 선까지의 거리가 다른 카드와 달라진다 */}
      <h2 className="px-7 pt-6 pb-5 text-[17px] leading-7 font-semibold tracking-[-0.3px]">
        결제 수단
      </h2>

      {/* ⚠️ 좌우 여백은 머리와 같은 28이다 — 24였던 탓에 카드·아이콘이 제목보다 4px 밖에 섰다 */}
      <div className="border-border flex items-center gap-3 border-t px-7 py-5">
        <span className="border-border bg-secondary flex h-8 w-11 shrink-0 items-center justify-center rounded-md border">
          <CreditCard className="text-muted-foreground size-4" aria-hidden />
        </span>

        {method ? (
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] leading-5 tabular-nums">
              {method.brand} •••• {method.last4}
            </span>
            <span className="text-muted-foreground block text-[12px] leading-4 tabular-nums">
              만료 {method.expiry}
            </span>
          </span>
        ) : (
          /*
            ⚠️ 이 자리는 **거의 안 보인다.** 온보딩 4단계에서 결제를 마쳐야 워크스페이스가
               열리므로, 여기까지 온 회사에는 카드가 있다.
               그래도 비워 두지 않는 건 BE가 값을 안 줄 때 `•••• undefined`가 찍히는 것보다
               "없다"고 말하는 편이 낫기 때문이다(§정직성).
          */
          <span className="text-muted-foreground min-w-0 flex-1 text-[13px] leading-5">
            등록된 결제 수단이 없습니다
          </span>
        )}

        {canManage && (
          <Button
            type="button"
            variant="outline"
            onClick={onChange}
            className="h-8 shrink-0 px-3 text-[12px] leading-none"
          >
            {/* 한글 글자가 상자 안에서 위쪽에 앉아 보인다 — 1px 내려 맞춘다 */}
            <span>{method ? "변경" : "등록"}</span>
          </Button>
        )}
      </div>
    </section>
  );
}
