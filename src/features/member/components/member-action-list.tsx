import { ListChecks, Unplug } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ACTION_DELAYED_LABEL, ACTION_STATUS_LABEL, isDelayed } from "@/constants/domain";
import { formatMonthDayWeekday } from "@/lib/date";
import { cn } from "@/lib/utils";

import type { ManagedMemberActions } from "../manage-types";

/**
 * 담당 액션 — **읽기만 한다.**
 *
 * ⚠️ 여기서 상태를 바꾸지 않는다. 상태 변경은 보드의 일이고(§보드: 상태 변경 전용 화면),
 *    이 화면은 "이 사람이 뭘 들고 있나"를 보는 자리다.
 * ⚠️ 상태 배지에 **배경을 칠하지 않는다** — 색으로 알리는 건 지연(빨강)뿐이다(§디자인 토큰).
 *    상태마다 배경을 칠하면 화면이 신호등이 된다.
 * ⚠️ **`null`은 "없다"가 아니라 "못 읽었다"**(2026-08-13, §manage-types). 두 경우에 같은 빈
 *    상태를 그리면, 조회가 실패한 화면이 `맡고 있는 액션이 없습니다`라고 말하고 그 말을 믿은
 *    사람이 오프보딩을 승인한다 — 인수인계 없이 액션이 붕 뜬다(§정직성).
 */
export function MemberActionList({ actions }: { actions: ManagedMemberActions | null }) {
  /*
    ⚠️ **머리의 건수는 서버가 센 전체다**(`totalCount`). 이 카드는 첫 20건만 그리므로
       `items.length`를 적으면 21건 든 사람이 20건으로 읽힌다. 못 읽었으면 숫자를 아예
       안 적는다 — `0건`이라고 적는 순간 그게 곧 거짓말이다.
  */
  const items = actions?.items ?? [];
  const hiddenCount = actions ? Math.max(0, actions.totalCount - items.length) : 0;

  return (
    <section className="border-border bg-card overflow-hidden rounded-2xl border">
      <div className="flex items-baseline justify-between gap-3 px-7 pt-6 pb-3">
        <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">담당 액션</h2>
        {actions && (
          <p className="text-muted-foreground shrink-0 text-[12px] leading-4 tabular-nums">
            전체 {actions.totalCount}건
          </p>
        )}
      </div>

      {!actions ? (
        /*
          ⚠️ **못 읽은 것과 없는 것을 다른 문장으로 말한다**(§목록 3상태). 아이콘도 가른다 —
             문장만 다르고 그림이 같으면 훑을 때 둘이 같은 상태로 보인다.
          ⚠️ 이 카드 하나만 못 채운 것이지 화면이 죽은 게 아니다 — 직급 변경·승인은 그대로
             된다. 그래서 `error.tsx`로 페이지를 통째로 넘기지 않는다.
        */
        <EmptyState
          bordered
          icon={Unplug}
          title="담당 액션을 불러오지 못했습니다."
          description="새로고침해도 같으면 잠시 뒤에 다시 확인해 주세요."
        />
      ) : items.length === 0 ? (
        <EmptyState bordered icon={ListChecks} title="맡고 있는 액션이 없습니다." />
      ) : (
        <>
          {/*
            표 머리 — 다른 목록과 같은 띠다(§DESIGN 2: 카드 안의 선은 표가 시작하는 자리 하나뿐).
            ⚠️ 머리와 값이 열마다 같은 축을 쓴다 — 이름은 왼쪽, 상태·마감은 가운데.
          */}
          <div className="border-border text-muted-foreground bg-secondary/50 flex items-center gap-4 border-y px-7 py-3 text-[12px] leading-4">
            <span className="min-w-0 flex-1">액션</span>
            <span className="w-[72px] shrink-0 text-center">상태</span>
            <span className="w-24 shrink-0 text-center">마감</span>
          </div>

          <ul>
            {items.map((action) => (
              <li
                key={action.id}
                className="border-border flex items-center gap-4 px-7 py-3.5 not-first:border-t"
              >
                {/*
                ⚠️ **이름이 먼저다.** 상태를 맨 왼쪽에 두니 훑을 때 `진행중·할 일`이 먼저 읽히고
                   정작 무슨 액션인지가 뒤로 밀렸다 — 왼쪽은 무엇인지, 오른쪽은 어떤 상태인지로
                   축을 가른다(§DESIGN 3, 회의 상세 산출물 표와 같은 해부).
              */}
                <span className="min-w-0 flex-1 truncate text-[13px] leading-5">
                  {action.title}
                </span>
                {/*
                ⚠️ **지연은 계산해서 붙인다.** 저장 상태는 셋뿐이고(할 일·진행중·완료) 지연은
                   마감일에서 나오는 파생값이다(§도메인 상수). 승인 직전에 "이 사람이 뭘
                   들고 있나"를 보는 자리라, 마감이 지난 걸 진행 중처럼 보이면 안 된다.
                ⚠️ 색으로 알리는 건 **지연(빨강)뿐**이다 — 나머지 상태는 테두리만 쓴다.
              */}
                <span className="w-[72px] shrink-0">
                  <span
                    className={cn(
                      "mx-auto flex h-6 w-[52px] items-center justify-center rounded-md border text-[11px] leading-4",
                      isDelayed(action)
                        ? "border-destructive/40 text-destructive font-medium"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {isDelayed(action) ? ACTION_DELAYED_LABEL : ACTION_STATUS_LABEL[action.status]}
                  </span>
                </span>
                <time
                  dateTime={action.dueDate}
                  className="text-muted-foreground w-24 shrink-0 text-center text-[12px] leading-4 whitespace-nowrap tabular-nums"
                >
                  {formatMonthDayWeekday(action.dueDate)}
                </time>
              </li>
            ))}
          </ul>

          {/*
            ⚠️ **잘렸으면 잘렸다고 적는다**(§정직성). 이 카드는 첫 20건만 그리는데
               (`MEMBER_ACTION_PAGE_SIZE`) 아무 말도 없으면 그게 전부인 줄 안다 —
               `전체 34건`이라고 적힌 머리와 스무 줄짜리 표 사이가 설명 없이 어긋난다.
            ⚠️ [더 보기]를 두지 않는다. 이 카드는 훑는 자리이고, 그 사람의 액션을 다 봐야 하면
               갈 곳은 액션 화면이다 — 여기에 무한 스크롤을 붙이면 승인 카드가 아래로 밀린다.
          */}
          {hiddenCount > 0 && (
            <p className="border-border text-muted-foreground border-t px-7 py-3 text-[12px] leading-4">
              마감이 가까운 {items.length}건만 보여줍니다. {hiddenCount}건이 더 있습니다.
            </p>
          )}
        </>
      )}
    </section>
  );
}
