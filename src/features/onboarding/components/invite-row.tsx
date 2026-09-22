"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

import { isValidEmail } from "../invite-rules";
import type { Invite } from "../types";
import { InviteAdminToggle } from "./invite-admin-toggle";
import { INVITE_COLUMN } from "./invite-columns";
import { InviteRowFields } from "./invite-row-fields";
import { InviteRowSelects, type InviteSelectSources } from "./invite-row-selects";

export interface InviteRowHandlers extends InviteSelectSources {
  onChangeName: (id: string, name: string) => void;
  onChangeEmail: (id: string, email: string) => void;
  onToggleAdmin: (id: string) => void;
  onRemove: (id: string) => void;
}

interface InviteRowProps extends InviteRowHandlers {
  invite: Invite;
  /** 목록에서 몇 번째인지(0부터). 화면에는 1부터 보여준다. */
  index: number;
  /** 위에 같은 주소가 또 있는지 */
  isDuplicated: boolean;
  /** 같은 부서에 리더가 이미 있는지 */
  isDuplicatedLeader: boolean;
  /**
   * 이름·주소 칸에 안내 글자를 띄울지.
   *
   * ⚠️ **첫 줄에만** 켠다. 줄마다 켜 두면 행을 몇 개 추가한 순간 목록이 회색 글자로 뒤덮여
   *    정작 적어 넣은 줄이 안 보인다. 맨 윗줄이 보기 노릇을 하면 그걸로 충분하다.
   */
  hasPlaceholder: boolean;
}

/**
 * 그 줄에 띄울 오류 문구.
 *
 * ⚠️ **부서·직급을 안 골랐다고 줄에 빨간 글씨를 띄우지 않는다.** 그건 "틀렸다"가 아니라
 *    "아직 안 끝났다"라서, 다 적기도 전에 줄마다 경고가 붙으면 목록이 경고밭이 된다.
 *    빠지는 줄이 있으면 [완료] 확인 창이 몇 줄인지 알려 준다(`InviteCommitDialog`).
 * ⚠️ 반면 주소 형식 오류는 **지금 치고 있는 칸**에 대한 말이라 그 자리에 남는다 —
 *    토스트로 옮기면 어느 줄인지 못 짚고 사라진다(CLAUDE.md §토스트).
 * ⚠️ 문구는 **한 줄에 들어가게 짧게** 쓴다. 길면 옆 칸(부서·역할)을 밀거나 접혀서
 *    행 높이가 들쭉날쭉해진다.
 */
function rowError(email: string, isDuplicated: boolean, isDuplicatedLeader: boolean) {
  // 입력 중에는 잔소리하지 않는다 — 뭔가 적혔는데 형식이 어긋날 때만 표시한다
  if (email.length > 0 && !isValidEmail(email)) return "주소 형식이 아닙니다";
  if (isDuplicated) return "위에 같은 주소가 있습니다";
  if (isDuplicatedLeader) return "리더가 이미 있습니다";
  return null;
}

export function InviteRow({
  invite,
  index,
  isDuplicated,
  isDuplicatedLeader,
  hasPlaceholder,
  onChangeName,
  onChangeEmail,
  onToggleAdmin,
  onRemove,
  ...sources
}: InviteRowProps) {
  const email = invite.email.trim();
  /*
    아직 아무것도 안 적은 줄.
    ⚠️ **테두리는 채운 줄과 똑같이 그린다**(팀 결정). 한때 연하게 눕혔더니 줄 전체가
       비활성으로 읽혔다 — 안 채운 것과 못 쓰는 것은 다르다.
       구분은 **안내 글자**(`선택`)의 세기로만 한다.
    ⚠️ **줄 단위 "발송 완료" 잠금은 없다**(2026-08-04). [완료]가 발송과 단계 이동을 함께 해서,
       보낸 줄이 이 화면에 남아 있는 순간이 없다.
  */
  const isBlank = !email;
  const errorText = rowError(email, isDuplicated, isDuplicatedLeader);
  const errorId = errorText ? `invite-error-${invite.id}` : undefined;

  return (
    /*
      ⚠️ 행 높이는 고정이다 — 줄마다 높이가 달라지면 목록이 들썩인다.
      ⚠️ 에러 문구는 이메일 칸 **오른쪽**에 둔다. 아래에 두면 그만큼 입력칸이 위로 밀려
         옆의 선택 칸들과 한 줄로 안 선다 — 대신 가로가 필요해 셸 폭을 1440으로 키웠다.
      ⚠️ 문구 칸은 **남는 자리를 그대로 쓴다**(`flex-1`). 폭을 고정하면 좁은 화면에서
         오른쪽 칸(직급·Admin)이 잘리고, 넓은 화면에서는 빈 자리가 남는다.
    */
    <div className="group border-border hover:bg-secondary/60 relative flex h-[60px] items-center gap-3 border-t px-4 transition-colors">
      <InviteRowFields
        invite={invite}
        index={index}
        errorText={errorText}
        errorId={errorId}
        hasPlaceholder={hasPlaceholder}
        onChangeName={onChangeName}
        onChangeEmail={onChangeEmail}
      />

      <InviteRowSelects invite={invite} isBlank={isBlank} {...sources} />

      {/*
        ⚠️ Admin은 **직급 옆 별도 칸**이다. 직급 드롭다운에 넣으면 "Leader 대신 Admin"으로 읽히는데,
           실제로는 Leader **이면서** Admin이다.
      */}
      <span className={cn(INVITE_COLUMN.ADMIN, "flex shrink-0 justify-center")}>
        <InviteAdminToggle
          isOn={invite.isAdmin}
          label={email || "새 초대"}
          onToggle={() => onToggleAdmin(invite.id)}
        />
      </span>

      <button
        type="button"
        aria-label={`${email || "빈 줄"} 초대 목록에서 빼기`}
        onClick={() => onRemove(invite.id)}
        className={cn(
          INVITE_COLUMN.REMOVE,
          "text-muted-foreground hover:text-foreground hover:bg-foreground/10 focus-visible:ring-ring flex shrink-0 items-center justify-center rounded opacity-0 transition-[color,background-color,opacity] group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-hidden",
        )}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
