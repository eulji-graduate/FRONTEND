import { ListChecks } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ProjectTag } from "@/components/common/project-tag";
import { Checkbox } from "@/components/ui/checkbox";
import { ACTION_DELAYED_LABEL, ACTION_STATUS_LABEL, isDelayed } from "@/constants/domain";
import { formatMonthDayWeekday } from "@/lib/date";
import { cn } from "@/lib/utils";

import type { HandoverActionItem } from "../types";

interface HandoverActionListCardProps {
  actions: HandoverActionItem[];
  selectedIds: Set<number>;
  /** 휴직 기간과 마감일이 겹치는 항목 — 숨기지 않고 배지로만 표시(§lib 절충안). */
  highlightedIds?: Set<number>;
  /** 오프보딩 — 전체 선택 고정, 체크박스는 보여주되 못 바꾼다. */
  locked?: boolean;
  onToggle?: (id: number) => void;
}

/**
 * "내 담당 액션" 체크리스트 카드 — 휴직·오프보딩 두 탭이 같이 쓴다.
 * ⚠️ 완료 액션은 여기 오기 전에 이미 걸러졌다(`server.ts`) — 이 컴포넌트는 필터링을
 *    다시 하지 않는다.
 */
export function HandoverActionListCard({
  actions,
  selectedIds,
  highlightedIds,
  locked,
  onToggle,
}: HandoverActionListCardProps) {
  return (
    <section className="border-border bg-card overflow-hidden rounded-2xl border">
      <div className="flex items-baseline justify-between gap-3 px-7 pt-6 pb-3">
        <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">내 담당 액션</h2>
        <p className="text-muted-foreground text-[12px] leading-4 tabular-nums">
          {selectedIds.size}/{actions.length}건 선택
        </p>
      </div>

      {actions.length === 0 ? (
        <EmptyState
          bordered
          icon={ListChecks}
          title="완료하지 않은 담당 액션이 없습니다."
          description="넘길 액션이 없어도 인수인계서는 신청할 수 있습니다."
        />
      ) : (
        /* ⚠️ 머리와 줄을 한 통에 넣고 가로로 굴린다 — 좁은 화면에서 액션 이름 열이 쭈그러들지 않게 */
        <div className="overflow-x-auto">
          {/*
            표 머리 — 다른 목록과 같은 띠다(§DESIGN 2: 카드 안의 선은 표가 시작하는 자리 하나뿐).
            ⚠️ 체크박스 자리는 라벨을 안 붙인다. 열 이름이 아니라 조작 자리다.
          */}
          <div className="border-border text-muted-foreground bg-secondary/50 flex min-w-[760px] items-center gap-4 border-y px-7 py-3 text-[12px] leading-4">
            <span className="w-4 shrink-0" aria-hidden />
            <span className="w-[76px] shrink-0 text-center">프로젝트</span>
            <span className="min-w-0 flex-1">액션</span>
            <span className="w-[72px] shrink-0 text-center">상태</span>
            <span className="w-24 shrink-0 text-center">마감</span>
          </div>

          <ul>
            {actions.map((action) => {
              const checked = selectedIds.has(action.id);
              const delayed = isDelayed(action);

              return (
                <li
                  key={action.id}
                  className="border-border flex min-w-[760px] items-center gap-4 px-7 py-3.5 not-first:border-t"
                >
                  <Checkbox
                    checked={checked}
                    disabled={locked}
                    onCheckedChange={() => onToggle?.(action.id)}
                    aria-label={`${action.title} 인수인계 대상 선택`}
                  />
                  {/*
                  ⚠️ **이름과 상위 액션을 두 층으로 쌓는다**(2026-08-11). 칩·상위 액션·이름·상태·마감을
                     다섯 열로 벌려 놨더니 이름이 짧을 때 가운데가 통째로 비었다 — 인수인계 상세·
                     팀원 관리와 같은 해부다.
                  ⚠️ 칩 열은 가운데 정렬이다. 태그 길이가 제각각이라 왼쪽에 맞추면 줄마다
                     칩의 중앙이 어긋난다.
                */}
                  <span className="flex w-[76px] shrink-0 items-center justify-center">
                    <ProjectTag tag={action.projectTag} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[13px] leading-5">{action.title}</span>
                      {highlightedIds?.has(action.id) && (
                        <span className="border-border text-muted-foreground shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] leading-4">
                          기간 중 마감
                        </span>
                      )}
                    </span>
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
