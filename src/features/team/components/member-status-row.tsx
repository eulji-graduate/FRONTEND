"use client";

import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { MEMBER_STATUS_BADGE_CLASS, MEMBER_STATUS_LABEL } from "@/constants/domain";
import type { TeamDashboardMember } from "@/features/team/types";
import { useProfileAvatar } from "@/hooks/use-profile-avatar";

interface MemberStatusRowProps {
  member: TeamDashboardMember;
}

/**
 * "팀원 현황" 테이블의 한 행. `<TableBody>` 안에서만 쓴다(루트가 `<tr>`).
 * 아바타 색은 하드코딩하지 않고 팀 공용 `useProfileAvatar`로 만든다 — 키는 **id 하나**라
 * 이름이 바뀌어도, 다른 화면에서 봐도 같은 색이다.
 */
export function MemberStatusRow({ member }: MemberStatusRowProps) {
  const avatar = useProfileAvatar(member.id, 28);

  return (
    <TableRow className="h-14">
      <TableCell className="pl-6">
        <div className="flex items-center gap-2">
          {avatar}
          <span className="truncate">{member.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-center">{member.position}</TableCell>
      <TableCell className="text-muted-foreground text-center">{member.role}</TableCell>
      {/* ⚠️ `font-mono`를 걸지 않는다 — 값이 `3건`이라 한글이 섞이면 대체 글꼴로 떨어져 자간이 튄다(DESIGN §4) */}
      <TableCell className="text-muted-foreground text-center tabular-nums">
        {member.assignedActionCount}건
      </TableCell>
      <TableCell className="pr-6 text-center">
        {/*
            ⚠️ **상수를 쓴다**(2026-08-11). 여기서 `border-warning text-warning`을 덧칠하고 있었는데,
               휴직은 **문제가 아니다** — 회색 표 안에서 배지 하나만 주황이라 경고처럼 읽혔다.
               색으로 알리는 건 에러(빨강)뿐이다(DESIGN §5).
            ⚠️ 생김새는 `MEMBER_STATUS_BADGE_CLASS`가 이미 상태별로 들고 있다. 화면이 따로
               칠하면 상태가 늘 때 여기만 빠진다(§도메인 상수).
          */}
        <Badge variant="outline" className={MEMBER_STATUS_BADGE_CLASS[member.status]}>
          {MEMBER_STATUS_LABEL[member.status]}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
