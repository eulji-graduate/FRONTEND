import { CircleAlert, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";

import { AI_CONFIDENCE, AI_CONFIDENCE_LABEL, type AiConfidence } from "@/constants/meeting";

interface ActionReviewGroupProps {
  confidence: AiConfidence;
  count: number;
  children: ReactNode;
}

/**
 * 확신도 그룹 카드 — "확신도 높음"/"확인 필요"는 **색이 아니라 아이콘으로 가른다**
 * (DESIGN.md §5: 상태점 외 색 사용 금지, 같은 모양이 여럿이면 아이콘으로 구분).
 */
export function ActionReviewGroup({ confidence, count, children }: ActionReviewGroupProps) {
  const Icon = confidence === AI_CONFIDENCE.HIGH ? CircleCheck : CircleAlert;

  return (
    <section className="border-border bg-card rounded-2xl border">
      {/*
        ⚠️ **아이콘과 제목이 한 줄이다**(2026-08-11). `h2` 안에 svg를 그냥 넣어 뒀더니
           (preflight가 `svg { display: block }`이라) 아이콘이 제목 **위에 한 층**으로 서서
           머리가 두 줄이 됐다 — 아이콘은 제목의 표식이지 제목 위의 딱지가 아니다.
      */}
      {/*
        ⚠️ **아래 여백은 20이다**(2026-08-11). 12로 두니 제목이 첫 줄에 눌려 붙어 어디까지가
           머리인지 흐렸다 — 표 머리 띠가 오는 카드는 띠의 여백이 더해져 24가 되지만 여기는
           맨 줄이 바로 온다. §DESIGN 4가 열어 둔 예외(툴바가 든 머리)와 같은 값이다.
      */}
      <div className="flex items-center justify-between gap-3 px-7 pt-6 pb-5">
        <h2 className="flex items-center gap-2 text-[17px] leading-7 font-semibold tracking-[-0.3px]">
          <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
          {AI_CONFIDENCE_LABEL[confidence]}
        </h2>
        <p className="text-muted-foreground text-[12px] leading-4 tabular-nums">{count}건</p>
      </div>
      {/* ⚠️ count가 0이어도 children은 그린다 — "확인 필요" 그룹은 다 반려해도
          [+ 액션 직접 추가] 버튼이 children으로 들어와 있어 사라지면 안 된다. */}
      {/*
        ⚠️ 카드 안의 선은 **줄이 시작하는 자리** 하나다(§DESIGN 2) — 머리와 몸을 여기서 나눈다.
      */}
      <div className="border-border border-t">
        {count === 0 && (
          <p className="text-muted-foreground px-7 py-6 text-center text-[13px] leading-5">
            여기 해당하는 항목이 없습니다.
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
