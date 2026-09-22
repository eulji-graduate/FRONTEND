"use client";

import { ArrowRight, RefreshCw } from "lucide-react";

import { ZLogo } from "@/components/icons/z-logo";

import { calculatePrice, formatWon } from "../pricing";
import type { BillingConfig } from "../types";
import { Agreement, Row } from "./checkout-rows";

interface CheckoutPanelProps {
  config: BillingConfig;
  actionLabel: string;
  agreedTerms: boolean;
  agreedRecurring: boolean;
  onAgreeTerms: (value: boolean) => void;
  onAgreeRecurring: (value: boolean) => void;
  canSubmit: boolean;
  isPending: boolean;
  onSubmit: () => void;
}

/**
 * 결제 카드의 **오른쪽 칸** — 얼마를 내는지와 동의, 그리고 결제 버튼.
 *
 * ⚠️ `SubscribeCard`에서 떼어냈다. 한 파일이 260줄을 넘겨 "무엇이 들어 있나"(왼쪽)와
 *    "얼마를 내나"(오른쪽)가 한 덩어리로 붙어 있었다 — 성격이 다른 두 칸이다
 *    (CLAUDE.md §폴더·네이밍: 200줄↑ 분리).
 * ⚠️ 상태는 갖지 않는다. 동의 여부와 진행 상태는 부르는 쪽이 쥔다 — 결제 요청도 거기서 한다.
 */
export function CheckoutPanel({
  config,
  actionLabel,
  agreedTerms,
  agreedRecurring,
  onAgreeTerms,
  onAgreeRecurring,
  canSubmit,
  isPending,
  onSubmit,
}: CheckoutPanelProps) {
  const price = calculatePrice(config);

  return (
    // 얼마를 내나 — 결제 카드의 오른쪽 칸
    <div className="flex w-full shrink-0 lg:w-[400px]">
      <aside className="border-border bg-card flex flex-1 flex-col justify-between rounded-2xl border p-8 shadow-sm">
        {/*
            ⚠️ 결제 카드에 **Z 표식**을 둔다. 금액과 버튼만 있으면 어느 서비스의 결제창이어도
               말이 되는 화면이 된다 — 무엇을 사는지가 카드 안에서 드러나야 한다.
            ⚠️ 표식 옆에 아무 말도 적지 않는다. `Z 구독`은 제목·왼쪽 카드와 겹쳤고,
               `월 1회 청구`는 아래 `매월 자동 갱신됩니다`와 같은 말이었다.
          */}
        {/*
            ⚠️ 구분선이 왼쪽 카드와 **같은 높이**에 서야 한다. 왼쪽은 머리(48px) + 아래 여백(24px)
               = 72px 지점에 선이 있으므로, 여기도 72px 상자에 아래 여백 24px를 준다.
               `h-12`로 두면 상자 안에 여백이 포함돼(border-box) 선이 24px 위로 올라간다.
               그래야 두 카드의 구분선이 같은 높이에 선다 — 나란히 둔 카드에서 선이 어긋나면
               가장 먼저 눈에 걸린다.
            ⚠️ 표식은 24px이다. 16px일 땐 상단바 로고보다 작아서, 카드가 Z의 것이라는 게
               한눈에 안 읽혔다.
          */}
        <div className="border-border flex h-[72px] items-center border-b pb-6">
          <ZLogo className="size-6" />
        </div>

        <div>
          {/*
              ⚠️ `오늘`·`첫 달` 같은 말을 붙이지 않는다. 이 카드는 온보딩과 구독 관리
                 두 곳에서 쓰여서, 한쪽에서만 맞는 말이 다른 쪽에서는 거짓이 된다.
            */}
          <p className="text-muted-foreground text-[12px] leading-4">결제 금액</p>
          {/*
            ⚠️ `₩`를 숫자와 **같은 크기로 두지 않는다.** 38px 굵은 글씨에서 원화 기호는
               가로 두 줄이 굵게 뭉쳐 숫자보다 먼저 눈에 들어온다 — 한 치수 줄이고 흐리게 둔다.
          */}
          <p className="flex items-baseline gap-0.5 pt-4">
            <span className="text-muted-foreground text-[24px] leading-none font-semibold">₩</span>
            <span className="text-[38px] leading-none font-bold tracking-[-1.2px] tabular-nums">
              {price.total.toLocaleString("ko-KR")}
            </span>
          </p>
        </div>

        {/*
            내역 — 금액과 한 얘기지만 따로 세워야 남는 자리를 나눠 가질 틈이 생긴다.
            ⚠️ 총액과 내역은 **한 얘기**라 가깝게 둔다. 멀어질수록 둘의 관계가 끊긴다.
          */}
        <div>
          <dl className="flex flex-col gap-2.5">
            <Row label="기본료" value={formatWon(price.baseFee)} />
            {price.vat > 0 && <Row label="VAT (10%)" value={formatWon(price.vat)} isMuted />}
          </dl>

          {/*
              ⚠️ 가운데로 둔다. 위 두 줄은 왼쪽 이름 · 오른쪽 금액으로 양 끝에 붙는데, 그 아래
                 한 줄만 왼쪽에 붙으면 어느 열에도 속하지 않은 채 매달린 것처럼 보인다.
            */}
          <p className="text-muted-foreground/70 flex items-center justify-center gap-1.5 pt-7 text-[11px] leading-4">
            <RefreshCw className="size-3.5 shrink-0" aria-hidden />
            {/* 한글 글자가 상자 안에서 위쪽에 앉아 아이콘보다 떠 보인다 — 1px 내려 맞춘다 */}
            <span>매월 자동 갱신됩니다. 해지는 언제든 가능합니다</span>
          </p>
          {/*
              ⚠️ 총액 **바로 아래**에 두지 않는다. 거기 있으면 오늘 낼 금액이 달라질 수 있다는
                 말로 읽힌다 — 실제로는 **다음 결제일** 얘기라, 갱신 안내와 한 자리에 둔다(§정직성).
                 ⚠️ `다음 달`이라고 쓰지 않는다. 결제일이 매월 1일이라는 보장이 없어서,
                    사용량 화면(`usage-panel`)이 쓰는 `다음 결제일`과 말을 맞춘다.
            */}
          <p className="text-muted-foreground/70 pt-1.5 text-center text-[11px] leading-4 break-keep">
            포함량을 넘긴 만큼은 다음 결제일에 더해집니다
          </p>
        </div>

        {/*
            ⚠️ 상자에 담지 않는다. 색 면이 하나 더 생길 때마다 화면이 조각난다 — 선으로 가른다.
          */}
        <div className="border-border border-t pt-6">
          <div className="flex flex-col gap-3.5">
            <Agreement checked={agreedTerms} onChange={onAgreeTerms}>
              이용약관과 개인정보처리방침에 동의합니다
            </Agreement>
            <Agreement checked={agreedRecurring} onChange={onAgreeRecurring}>
              매월 자동 청구에 동의합니다
            </Agreement>
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            className="bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-ring disabled:bg-secondary disabled:text-muted-foreground/60 mt-5 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-xl text-[15px] leading-none font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none"
          >
            {isPending ? (
              "결제 중입니다"
            ) : (
              <>
                <span className="tabular-nums">{formatWon(price.total)}</span>
                {actionLabel}
                <ArrowRight className="size-4" aria-hidden />
              </>
            )}
          </button>
        </div>

        {/*
            ⚠️ 버튼 아래에 제품 소개 문구를 두지 않는다. `결제하면 워크스페이스가 열립니다`는
               화면 부제가 이미 말했고, 그 뒤에 붙던 한 줄 소개는 **돈을 내는 자리에서 할 말이
               아니다** — 결정을 돕지 않는 문장은 버튼 옆에서 결정을 흐린다.
          */}
      </aside>
    </div>
  );
}
