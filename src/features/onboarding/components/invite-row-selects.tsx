"use client";

import { cn } from "@/lib/utils";

import type { Invite } from "../types";
import { NO_ROLE_LABEL } from "../types";
import { INVITE_COLUMN, INVITE_SELECT_WIDTH } from "./invite-columns";
import { OptionSelect, type SelectOption } from "./option-select";

/** 아직 안 고른 선택 칸에 띄우는 글자 — 세 칸이 같은 말을 한다 */
const PICK_PLACEHOLDER = "선택";

export interface InviteSelectSources {
  departments: SelectOption[];
  /** 그 줄에서 고를 수 있는 역할 — 부서 안의 역할들 앞에 `없음`이 붙는다 */
  rolesFor: (invite: Invite) => SelectOption[];
  /** 역할 칸을 잠글지 — 리더 직급이면 역할은 `없음` 하나뿐이다 */
  isRoleLocked: (invite: Invite) => boolean;
  /** 줄마다 다르다 — 그 부서에 이미 리더가 있으면 리더 직급을 잠근다 */
  positionsFor: (invite: Invite) => SelectOption[];
  onChangeDepartment: (id: string, departmentId: string) => void;
  onChangeRole: (id: string, roleId: string) => void;
  onChangePosition: (id: string, positionId: string) => void;
}

interface InviteRowSelectsProps extends InviteSelectSources {
  invite: Invite;
  /** 아직 아무것도 안 적은 줄 — 안내 글자를 연하게 둔다 */
  isBlank: boolean;
}

/**
 * 한 줄의 선택 칸 셋 — 부서 · 역할 · 직급.
 *
 * ⚠️ **부서 → 역할 → 직급 순서로 열린다.** 앞 칸을 비워둔 채 뒤 칸부터 고르면
 *    리더 직급처럼 앞 칸에 매인 규칙을 설명할 자리가 없다.
 * ⚠️ 감싼 칸도 셀렉트와 **같은 폭**이어야 한다 — 다르면 열 머리와 세로축이 어긋난다.
 */
export function InviteRowSelects({ invite, isBlank, ...sources }: InviteRowSelectsProps) {
  const email = invite.email.trim();
  const who = email || "새 초대";
  const isRoleLocked = sources.isRoleLocked(invite);

  return (
    <>
      <span className={cn(INVITE_COLUMN.SELECT, "shrink-0")}>
        <OptionSelect
          value={invite.departmentId}
          onChange={(departmentId) => sources.onChangeDepartment(invite.id, departmentId)}
          options={sources.departments}
          label={`${who} 팀`}
          emptyText="팀 없음"
          placeholder={PICK_PLACEHOLDER}
          width={INVITE_SELECT_WIDTH}
          isMuted={isBlank}
          // 값이 열 헤더(부서) 바로 아래 가운데로 오게 한다 — 2단계 직급명과 같은 정렬
          className="justify-center gap-1"
        />
      </span>

      <span className={cn(INVITE_COLUMN.SELECT, "shrink-0")}>
        <OptionSelect
          value={invite.roleId}
          onChange={(roleId) => sources.onChangeRole(invite.id, roleId)}
          options={sources.rolesFor(invite)}
          label={`${who} 역할`}
          emptyText={NO_ROLE_LABEL}
          width={INVITE_SELECT_WIDTH}
          // 부서를 아직 안 고른 줄은 역할을 못 고른다 — 역할이 부서에 딸려 있다.
          // 리더 직급인 줄도 잠긴다 — 부서 전체를 맡는 자리라 역할은 `없음` 하나뿐이다.
          // 이유는 칸이 아니라 왼쪽 안내가 말한다("역할은 부서를 고른 뒤 정할 수 있습니다").
          disabled={!invite.departmentId || isRoleLocked}
          placeholder={PICK_PLACEHOLDER}
          isMuted={isBlank}
          className="justify-center gap-1"
        />
      </span>

      <span className={cn(INVITE_COLUMN.SELECT, "shrink-0")}>
        <OptionSelect
          value={invite.positionId}
          onChange={(positionId) => sources.onChangePosition(invite.id, positionId)}
          options={sources.positionsFor(invite)}
          label={`${who} 직급`}
          emptyText="직급 없음"
          placeholder={PICK_PLACEHOLDER}
          width={INVITE_SELECT_WIDTH}
          // ⚠️ 역할 칸이 잠긴 줄에서는 **직급을 연다.** 둘 다 잠기면 그 줄은 빠져나갈 길이
          //    없어진다 — 리더 직급을 다른 직급으로 바꿔야 역할이 다시 열리기 때문이다.
          disabled={!invite.roleId && !isRoleLocked}
          isMuted={isBlank}
          className="justify-center gap-1"
        />
      </span>
    </>
  );
}
