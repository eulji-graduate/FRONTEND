"use client";

import { ProjectTag } from "@/components/common/project-tag";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTION_DELAYED_LABEL, ACTION_STATUS_LABEL, isDelayed } from "@/constants/domain";
import { formatMonthDayWeekday } from "@/lib/date";
import { cn } from "@/lib/utils";

import type { TeamHandoverAction, TeamMemberOption } from "../types";

interface TeamHandoverAssignRowProps {
  action: TeamHandoverAction;
  teammates: TeamMemberOption[];
  assignedTo: number | null;
  onAssign: (assigneeId: number) => void;
}

/**
 * 배정할 액션 한 줄 — `<Select>`로 담당자를 고른다.
 *
 * ⚠️ **드래그 앤 드롭이 아니다**(2026-08-09 디자인 리뷰로 제거) — 배정한 항목이 이
 *    목록에도, 별도 팀원 보드에도 동시에 남아 보여 어디에 배정됐는지 헷갈렸다. `<Select>`
 *    값 하나가 배정 상태를 그대로 보여주는 편이 더 명확하다.
 * ⚠️ **줄마다 상자를 두르지 않는다**(2026-08-11). 카드 안에 테두리 카드를 또 얹으면 층이
 *    둘이 된다(§DESIGN 2) — 줄을 가르는 일은 선 하나로 충분하다.
 * ⚠️ 열 구성은 다른 액션 목록과 **같은 해부**다(인수인계 상세·팀원 관리): 칩은 제 열에
 *    가운데로, 이름과 상위 액션은 두 층으로, 상태·마감은 고정폭 가운데다.
 */
export function TeamHandoverAssignRow({
  action,
  teammates,
  assignedTo,
  onAssign,
}: TeamHandoverAssignRowProps) {
  const delayed = isDelayed(action);
  const assignedName = teammates.find((teammate) => teammate.id === assignedTo)?.name;

  return (
    <li className="border-border flex items-center gap-4 px-7 py-3 not-first:border-t">
      <span className="flex w-[76px] shrink-0 items-center justify-center">
        <ProjectTag tag={action.projectTag} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
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

      <Select
        value={assignedTo !== null ? String(assignedTo) : ""}
        onValueChange={(value) => value && onAssign(Number(value))}
      >
        <SelectTrigger aria-label={`${action.title} 담당자 배정`} className="w-40 shrink-0">
          <SelectValue placeholder="담당자 배정">{() => assignedName ?? "담당자 배정"}</SelectValue>
        </SelectTrigger>
        <SelectContent side="bottom" alignItemWithTrigger={false}>
          {teammates.map((teammate) => (
            <SelectItem key={teammate.id} value={String(teammate.id)}>
              {teammate.name}
              {teammate.roleLabel ? ` · ${teammate.roleLabel}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </li>
  );
}
