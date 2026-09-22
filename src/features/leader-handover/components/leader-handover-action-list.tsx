import { ListChecks } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ProjectTag } from "@/components/common/project-tag";
import { ACTION_DELAYED_LABEL, ACTION_STATUS_LABEL, isDelayed } from "@/constants/domain";
import { formatMonthDayWeekday } from "@/lib/date";
import { cn } from "@/lib/utils";

import type { LeaderHandoverAction } from "../types";

/**
 * 담긴 액션 전체 — 읽기만 한다(WORKFLOW.md §7). 담당자 변경은 [귀속]이 한 번에 한다.
 *
 * ⚠️ **표 머리를 둔다**(2026-08-11). 머리 없이 값만 늘어놓으니 `앱 개발 착수`가 상위 팀 액션인지
 *    액션 이름인지 알 수 없었다 — 열이 다섯인데 이름표가 하나도 없었다.
 * ⚠️ 머리와 값은 **열마다 같은 축**을 쓴다. 폭만 맞추고 정렬을 안 정하면 글자 길이에 따라
 *    축이 흔들려 오와 열이 어긋난다(§DESIGN 3).
 */
export function LeaderHandoverActionList({ actions }: { actions: LeaderHandoverAction[] }) {
  return (
    <section className="border-border bg-card overflow-hidden rounded-2xl border">
      <div className="flex items-center justify-between gap-3 px-7 pt-6 pb-3">
        <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">담긴 액션</h2>
        <p className="text-muted-foreground text-[12px] leading-4 tabular-nums">
          전체 {actions.length}건
        </p>
      </div>

      {actions.length === 0 ? (
        <EmptyState bordered icon={ListChecks} title="담긴 액션이 없습니다." />
      ) : (
        /* ⚠️ 머리와 줄을 한 통에 넣고 가로로 굴린다 — 좁은 화면에서 제목 열이 쭈그러들지 않게 */
        <div className="overflow-x-auto">
          {/* 표 머리 — 띠 하나로 값이 시작하는 자리를 알린다(§DESIGN 2: 카드 안의 선은 여기뿐) */}
          <div className="border-border text-muted-foreground bg-secondary/50 flex min-w-[720px] items-center gap-4 border-y px-7 py-3 text-[12px] leading-4">
            <span className="w-[76px] shrink-0 text-center">프로젝트</span>
            <span className="min-w-0 flex-1">액션</span>
            <span className="w-[72px] shrink-0 text-center">상태</span>
            <span className="w-24 shrink-0 text-center">마감</span>
          </div>

          <ul>
            {actions.map((action) => {
              const delayed = isDelayed(action);
              return (
                <li
                  key={action.id}
                  className="border-border flex min-w-[720px] items-center gap-4 px-7 py-3.5 not-first:border-t"
                >
                  {/*
                    ⚠️ **이름과 출처를 두 층으로 쌓는다**(2026-08-11). 칩·상위 액션·이름·상태·마감을
                       다섯 열로 벌려 놨더니 이름이 짧을 때 **가운데가 통째로 비었다** — 앞의 셋은
                       전부 "무슨 액션인가"를 말하므로 한 덩이로 묶는다(회의 상세 산출물 표와 같은 해부).
                    ⚠️ **칩은 따로 선다.** 이름 앞에 붙여 두니 위층은 칩 뒤에서, 아래층은 왼쪽 끝에서
                       시작해 **두 줄의 시작선이 어긋나** 왼쪽 구석에 뭉쳐 보였다 — 칩을 제 열로
                       빼면 두 줄이 한 세로선에서 시작한다(§DESIGN 3: 열마다 축이 따로 선다).
                    ⚠️ 칩 열은 **가운데 정렬**이다. 머리 글자(`프로젝트` 4자)와 칩(`GOODS`·`COLLAB`)은
                       폭이 제각각이라, 왼쪽에 맞추면 둘의 **중앙이 어긋나** 보인다.
                  */}
                  <span className="flex w-[76px] shrink-0 items-center justify-center">
                    <ProjectTag tag={action.projectTag} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-[13px] leading-5">{action.title}</span>
                    <span className="text-muted-foreground truncate text-[12px] leading-4">
                      {action.parentTeamActionName}
                    </span>
                  </span>

                  {/* ⚠️ 지연만 빨강이다 — 색으로 알리는 건 문제뿐(§DESIGN 5) */}
                  <span className="w-[72px] shrink-0">
                    <span
                      className={cn(
                        "mx-auto flex h-6 w-[52px] items-center justify-center rounded-md border text-[11px] leading-4",
                        delayed
                          ? "border-destructive/40 text-destructive font-medium"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {delayed ? ACTION_DELAYED_LABEL : ACTION_STATUS_LABEL[action.status]}
                    </span>
                  </span>

                  <time
                    dateTime={action.dueDate}
                    className="text-muted-foreground w-24 shrink-0 text-center text-[12px] leading-4 whitespace-nowrap tabular-nums"
                  >
                    {formatMonthDayWeekday(action.dueDate)}
                  </time>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
