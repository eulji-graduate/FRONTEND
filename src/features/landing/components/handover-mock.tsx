import { Check, FileText } from "lucide-react";

/**
 * 기능 섹션의 인수인계 축소판 — 흩어진 기록이 문서 한 장으로 조립된다.
 *
 * ⚠️ 흐름 섹션의 `HandoverMock`(flow-mocks-deliver)과 **다른 화면이다.** 이름이 같으면
 *    IDE 탐색에서 헷갈리고 잘못된 import가 난다 — 여기는 `Feature` 접두를 붙인다.
 *
 * ⚠️ 사람 이름 대신 자리(직무)로 적는다 — 목이라도 특정 인물처럼 읽히면 안 된다.
 */
/** 흩어진 기록이 문서 한 장으로 조립된다 — 항목이 차례로 체크되고 마지막에 문서가 뜬다 */
const ASSEMBLED = ["회의 기록 24건", "미완료 액션 4건", "참여 결정 12건"] as const;

export function FeatureHandoverMock() {
  return (
    <>
      {/* 오른쪽 위를 비워두면 카드가 기울어 보인다 — 다른 축소판처럼 상태 한 줄을 세운다 */}
      <div className="flex items-center justify-between">
        <p className="text-landing-accent flex items-center gap-1.5 text-[11px] leading-4 font-semibold">
          <FileText className="size-3.5" aria-hidden />
          인수인계서 자동 구성
        </p>
        <span className="border-border text-muted-foreground/70 flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-4">
          <Check className="size-3" aria-hidden />
          <span className="tabular-nums">3 / 3</span>
        </span>
      </div>

      <div className="flex flex-col gap-1.5 pt-3.5">
        {ASSEMBLED.map((item, index) => (
          <p
            key={item}
            style={{ animationDelay: `${index * 0.45}s` }}
            className="animate-cycle-in text-muted-foreground flex items-center gap-2 text-[12px] leading-[18px]"
          >
            <Check className="text-foreground size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
            {item}
          </p>
        ))}
      </div>

      <div className="animate-cycle-in border-border bg-secondary mt-3 flex items-center gap-2 rounded-md border px-2.5 py-2 [animation-delay:1.35s]">
        <FileText className="text-foreground size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] leading-4 font-medium">전임 → 후임 인수인계서</span>
          <span className="text-muted-foreground/70 block text-[11px] leading-[14px]">
            후임자에게 전달할 준비가 끝났습니다
          </span>
        </span>
      </div>
    </>
  );
}
