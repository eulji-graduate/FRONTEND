"use client";

import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { MEMBER_STATUS_BADGE_CLASS, MEMBER_STATUS_LABEL } from "@/constants/domain";
import type { OwnerDashboardLeaderRow } from "@/features/owner/types";
import { useProfileAvatar } from "@/hooks/use-profile-avatar";

interface LeaderStatusRowProps {
  leader: OwnerDashboardLeaderRow;
}

/**
 * "팀장 현황" 테이블의 한 행. `<TableBody>` 안에서만 쓴다(루트가 `<tr>`).
 * ⚠️ 아바타 색은 하드코딩하지 않고 팀 공용 `useProfileAvatar`로 만든다 — 키는 **id 하나**다 —
 *    BE에 프로필 이미지 필드가 없어 FE가 일관 색을 생성한다(같은 사람은 늘 같은 색).
 */
/**
 * 이름 상자의 **최소** 폭 — 한글 이름 넉 자가 들어가는 몫이다(3자 34px · 4자 45px).
 *
 * ⚠️ **머리글도 같은 값을 쓴다**(owner 대시보드 `page.tsx`). 한쪽만 고치면 두 중심이 어긋난다.
 * ⚠️ **최소치이지 고정값이 아니다**(2026-08-10 리뷰). `width`로 못 박아 뒀더니 다섯 자 이름
 *    (`남궁민수영`)이나 영문 이름(`Alexander`)이 열에 자리가 남는데도 잘렸다 — 목 데이터가
 *    전부 석 자라 화면에서는 안 드러났다. 중심을 맞추는 데는 최소 폭이면 충분하다.
 */
export const LEADER_NAME_WIDTH = 48;

export function LeaderStatusRow({ leader }: LeaderStatusRowProps) {
  const avatar = useProfileAvatar(leader.id, 28);

  return (
    <TableRow className="h-14">
      <TableCell className="pl-6">
        {/*
          ⚠️ **아바타에 붙여 두되 이름 상자 안에서 가운데를 잡는다.** 남는 폭을 다 주면
             (`flex-1`) 이름이 아바타에서 멀찍이 떨어져 따로 노는 것처럼 보였다 —
             상자를 **이름 폭만큼만** 잡으면 붙어 있으면서도 중심이 정해진다.
          ⚠️ 그 중심 위에 머리글이 선다. 머리글과 같은 상수(`LEADER_NAME_WIDTH`)를 써야
             이름이 몇 글자든 두 중심이 한 세로선에 겹친다.
        */}
        <div className="flex items-center gap-2">
          {avatar}
          {/*
            ⚠️ **다시 `width`로 못 박지 않는다**(2026-08-10, 리뷰 제안 반려). 고정 폭이면 긴 이름의
               중심이 머리글과 늘 맞지만, 그 대가로 **사람 이름이 잘린다**(다섯 자·영문). 맞바꿀
               것이 아니다 — 정렬은 보기 좋자고 하는 일이고 이름은 지워지면 안 되는 값이다.
               흔한 석~넉 자에서는 최소 폭이 곧 실제 폭이라 중심이 그대로 맞는다.
            ⚠️ 그래도 잘릴 수 있으니 전체 이름을 남긴다 — 옆 이메일 칸과 같은 처리다.
          */}
          <span
            className="truncate text-center"
            style={{ minWidth: LEADER_NAME_WIDTH }}
            title={leader.name}
          >
            {leader.name}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground truncate text-center" title={leader.email}>
        {leader.email}
      </TableCell>
      <TableCell className="text-muted-foreground text-center">{leader.department}</TableCell>
      <TableCell className="text-center">
        {/*
            ⚠️ **상수를 쓴다**(2026-08-11). 여기서 `border-warning text-warning`을 덧칠하고 있었는데,
               휴직은 **문제가 아니다** — 회색 표 안에서 배지 하나만 주황이라 경고처럼 읽혔다.
               색으로 알리는 건 에러(빨강)뿐이다(DESIGN §5).
            ⚠️ 생김새는 `MEMBER_STATUS_BADGE_CLASS`가 이미 상태별로 들고 있다. 화면이 따로
               칠하면 상태가 늘 때 여기만 빠진다(§도메인 상수).
          */}
        <Badge variant="outline" className={MEMBER_STATUS_BADGE_CLASS[leader.status]}>
          {MEMBER_STATUS_LABEL[leader.status]}
        </Badge>
      </TableCell>
      {/*
        ⚠️ `font-mono`를 걸지 않는다. 값이 `8월 1일~15일` 같은 **한글 섞인 문자열**이라
           고정폭 글꼴이 한글을 대체 글꼴로 떨어뜨려 자간이 튀었다 — 숫자 자리만 잡으면
           되므로 `tabular-nums`가 맞다(DESIGN §4).
      */}
      <TableCell className="text-muted-foreground pr-6 text-center tabular-nums">
        {leader.leavePeriod ?? "-"}
      </TableCell>
    </TableRow>
  );
}
