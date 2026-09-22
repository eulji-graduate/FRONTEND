import { Skeleton } from "@/components/ui/skeleton";

/**
 * 뼈대는 **실제 배치와 같은 자리**에 둔다 — 다르면 채워질 때 화면이 튄다.
 *
 * ⚠️ **탭 자리를 두지 않는다.** 탭을 없애고 한 페이지로 편 뒤(2026-08-04)에도 뼈대에만
 *    탭 셋이 남아 있었다 — 로딩이 끝나는 순간 그 줄이 사라지면서 아래가 통째로 위로 밀린다.
 * ⚠️ 카드는 **네 장**이다(플랜 · 사용량 · 결제 수단 · 결제 내역). 간격도 본문과 같은 `gap-7`이다.
 *    수를 줄여 두면 채워질 때 아래로 길어지면서 스크롤이 튄다.
 * ⚠️ 결제 수단은 **한 줄뿐**이다(카드는 회사당 한 장, 2026-08-05). 여러 장 목록이던 시절의
 *    높이를 그대로 두면 채워지는 순간 45px이 접히면서 아래가 위로 딸려 올라간다.
 */
export default function ManageBillingLoading() {
  return (
    <div className="flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="flex flex-col gap-7">
          <Skeleton className="h-[188px] w-full rounded-2xl" />
          {/*
            ⚠️ 사용량 카드는 **예상 사용량 줄을 뺀 뒤 44px 낮아졌다**(축마다 `pt-1.5`+`leading-4`
               = 22px, 두 축). 옛 높이(268px)를 두면 채워지는 순간 아래가 위로 딸려 올라간다.
          */}
          <Skeleton className="h-[224px] w-full rounded-2xl" />
          <Skeleton className="h-[152px] w-full rounded-2xl" />
          <Skeleton className="h-[228px] w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
