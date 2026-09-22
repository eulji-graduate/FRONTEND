"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ProjectTag } from "@/components/common/project-tag";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ACTION_DELAYED_LABEL,
  ACTION_STATUS,
  ACTION_STATUS_LABEL,
  isDelayed,
  MEMBER_STATUS_BADGE_CLASS,
  MEMBER_STATUS_LABEL,
} from "@/constants/domain";
import { useProfileAvatar } from "@/hooks/use-profile-avatar";
import { formatMonthDayWeekday } from "@/lib/date";
import { cn } from "@/lib/utils";

import { getMemberProgressPercent } from "../lib";
import type { TeamMemberStatusItem } from "../types";

interface TeamMemberAccordionCardProps {
  member: TeamMemberStatusItem;
}

/**
 * 팀원 한 명 = 카드 한 장, 접었다 펼친다(WORKFLOW.md §팀원 관리).
 * ⚠️ 펼침 상태는 **이 카드 안에서만** 의미 있는 화면 상태라 URL에 안 싣는다(로컬 state로 충분 —
 *    정렬·필터처럼 공유·새로고침 후에도 남아야 하는 값과는 다르다).
 */
export function TeamMemberAccordionCard({ member }: TeamMemberAccordionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const avatar = useProfileAvatar(member.id, 36);
  const percent = getMemberProgressPercent(member.actions);
  const doneCount = member.actions.filter((action) => action.status === ACTION_STATUS.DONE).length;

  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border">
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-label={`${member.name} 카드 ${isExpanded ? "접기" : "펼치기"}`}
        onClick={() => setIsExpanded((prev) => !prev)}
        className="hover:bg-muted/40 flex w-full cursor-pointer items-center gap-4 px-6 py-4 text-left transition-colors"
      >
        {avatar}

        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-[13px] leading-5 font-semibold">
            <span className="truncate">{member.name}</span>
            <span className="text-muted-foreground shrink-0 text-[12px] leading-4 font-normal">
              ({member.role || "없음"})
            </span>
          </span>
          <span className="text-muted-foreground truncate text-[12px] leading-4">
            {member.position} · {member.teamName}
          </span>
        </div>

        <span className="flex-1" aria-hidden />

        {/*
            ⚠️ **상수를 쓴다**(2026-08-11). 여기서 `border-warning text-warning`을 덧칠하고 있었는데,
               휴직은 **문제가 아니다** — 회색 표 안에서 배지 하나만 주황이라 경고처럼 읽혔다.
               색으로 알리는 건 에러(빨강)뿐이다(DESIGN §5).
            ⚠️ 생김새는 `MEMBER_STATUS_BADGE_CLASS`가 이미 상태별로 들고 있다. 화면이 따로
               칠하면 상태가 늘 때 여기만 빠진다(§도메인 상수).
          */}
        <Badge
          variant="outline"
          className={cn("shrink-0", MEMBER_STATUS_BADGE_CLASS[member.status])}
        >
          {MEMBER_STATUS_LABEL[member.status]}
        </Badge>

        {/*
          ⚠️ **건수와 진척을 한 덩이로 묶는다**(2026-08-11). 둘 사이가 벌어져 있어 막대가 혼자
             떠 보였고, 0%일 때는 **회색 줄만 길게** 남아 무엇을 재는 값인지 알 수 없었다 —
             `담당 액션 2개` 바로 뒤에 붙여야 그 둘의 진척이라는 게 읽힌다.
          ⚠️ 막대를 짧게 줄인다(`w-20`). 목록 줄에서 재는 건 정확한 길이가 아니라 **대략의 차이**라,
             길면 그 줄에서 제일 큰 것이 되어 이름보다 먼저 읽힌다.
        */}
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-muted-foreground text-[13px] leading-5 tabular-nums">
            담당 액션 {member.actions.length}개
          </span>
          <div className="flex items-center gap-2">
            <Progress value={percent} className="w-20" />
            <span className="text-foreground w-8 text-right text-[12px] leading-4 font-medium tabular-nums">
              {percent}%
            </span>
          </div>
        </div>

        <ChevronDown
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform",
            isExpanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {isExpanded && (
        <div className="border-border border-t">
          {/* 펼친 안쪽의 머리 — 무엇이 몇 건인지 한 줄로 알린다 */}
          <p className="text-muted-foreground bg-secondary/50 border-border border-b px-6 py-3 text-[12px] leading-4">
            개인 액션 · {doneCount}/{member.actions.length} 완료
          </p>

          {member.actions.length === 0 ? (
            <p className="text-muted-foreground px-6 pb-5 text-[13px] leading-5">
              맡고 있는 액션이 없습니다.
            </p>
          ) : (
            <ul className="pb-2">
              {member.actions.map((action) => {
                const delayed = isDelayed(action);
                return (
                  <li key={action.id}>
                    <Link
                      href={`/app/actions/${action.id}`}
                      className="hover:bg-foreground/[0.04] flex items-center gap-4 px-6 py-2.5 transition-colors"
                    >
                      {/*
                        ⚠️ **인수인계 상세와 같은 해부다**(2026-08-11). 칩·상위 액션·이름·상태·마감을
                           다섯 열로 벌려 놨더니 이름이 짧을 때 가운데가 통째로 비었다 —
                           칩은 제 열, 이름과 상위 액션은 두 층으로 묶는다.
                        ⚠️ 칩 열은 가운데 정렬이다. 태그 길이가 제각각이라 왼쪽에 맞추면
                           줄마다 칩의 중앙이 어긋난다.
                      */}
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
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
