import { cn } from "@/lib/utils";

import { INVITE_COLUMN } from "./invite-columns";

/**
 * 초대 목록의 열 머리.
 *
 * ⚠️ 행(`InviteRow`)과 **같은 padding·gap·칸 너비·shrink 규칙**을 쓴다. 이메일 칸을 `flex-1`
 *    하나로 두면 폭이 좁아질 때 머리만 먼저 줄어 **열이 통째로 밀린다** — 줄어들더라도 같이 줄어야 한다.
 * ⚠️ 폭은 `invite-columns.ts` 한 곳에서 온다. 여기 숫자를 직접 적지 않는다.
 */
export function InviteColumnHead() {
  return (
    <div className="text-muted-foreground border-border bg-secondary/50 flex h-8 shrink-0 items-center gap-3 border-b px-4 text-[12px] leading-4">
      <span className={cn(INVITE_COLUMN.INDEX, "shrink-0")} aria-hidden />
      <span className={cn(INVITE_COLUMN.NAME, "shrink-0 text-center")}>이름</span>
      <span className={cn(INVITE_COLUMN.EMAIL, "ml-1 shrink-0 pl-2.5")}>이메일</span>
      <span className={cn(INVITE_COLUMN.MESSAGE, "min-w-0")} aria-hidden />
      <span className={cn(INVITE_COLUMN.SELECT, "shrink-0 text-center")}>팀</span>
      <span className={cn(INVITE_COLUMN.SELECT, "shrink-0 text-center")}>역할</span>
      <span className={cn(INVITE_COLUMN.SELECT, "shrink-0 text-center")}>직급</span>
      <span className={cn(INVITE_COLUMN.ADMIN, "shrink-0 text-center")}>Admin</span>
      <span className={cn(INVITE_COLUMN.REMOVE, "shrink-0")} aria-hidden />
    </div>
  );
}
