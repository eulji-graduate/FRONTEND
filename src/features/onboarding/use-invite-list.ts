"use client";

import { useMemo, useState } from "react";

import { duplicatedEmailIds, type InviteRules } from "./invite-rules";
import {
  changeInviteDepartment,
  changeInviteEmail,
  changeInviteName,
  changeInvitePosition,
  changeInviteRole,
  createInvite,
  markInvitesSent,
  nextInviteId,
  remapInvite,
  removeInvite,
  sendableInvites,
  toggleInviteAdmin,
} from "./invites";
import type { Invite } from "./types";

/**
 * 초대 목록 편집 상태.
 * 목록 조작은 `invites.ts`의 순수 함수가 하고, 여기서는 **무엇을 언제 부를지**만 정한다.
 */
export function useInviteList(rules: InviteRules) {
  const newInvite = (prev: Invite[]) => createInvite(nextInviteId(prev));

  const [invites, setInvites] = useState<Invite[]>(() => [createInvite(nextInviteId([]))]);

  /*
    ⚠️ `rules.isLeaderPosition`을 같이 넘긴다 — `팀당 리더 한 명`을 발송 검증이 직접 본다.
       전에는 목록을 바꾸는 쪽이 값을 지워 우회해서, 규칙이 코드 어디에도 없었다.
  */
  const sendable = useMemo(() => sendableInvites(invites, rules), [invites, rules]);
  /*
    ⚠️ **뒷줄만 표시한다**(`duplicatedEmailIds`). 전에는 주소 집합(`duplicateEmails`)으로
       봐서 **첫 줄에도** 경고가 붙었는데, 실제로 나가는 건 첫 줄이라 경고 2줄 : 빠지는 줄
       1줄로 어긋났다 — 확인 창이 "표시가 뜬 N줄"이라 말하는 이상 그 수가 맞아야 한다.
       리더 중복과 같은 규약이다(적대적 검토 #163).
  */
  const duplicated = useMemo(() => duplicatedEmailIds(invites), [invites]);

  return {
    invites,
    /** 이번에 나갈 줄 — 주소가 유효하고 아직 안 보낸 것만 */
    sendable,
    /** 이 줄의 주소가 위에 또 있는지 — 화면에서 표시해 준다 */
    isDuplicated: (invite: Invite) => duplicated.has(invite.id),
    addRow: () => setInvites((prev) => [...prev, newInvite(prev)]),
    changeName: (id: string, name: string) =>
      setInvites((prev) => changeInviteName(prev, id, name)),
    changeEmail: (id: string, email: string) =>
      setInvites((prev) => changeInviteEmail(prev, id, email)),
    changeDepartment: (id: string, departmentId: string) =>
      setInvites((prev) => changeInviteDepartment(prev, id, departmentId, rules)),
    /** ⚠️ 짝이 안 맞는 직급은 함께 비워진다(`changeInviteRole`) */
    changeRole: (id: string, roleId: string) =>
      setInvites((prev) => changeInviteRole(prev, id, roleId, rules)),
    /** ⚠️ 리더 직급이면 역할이 `리더`로 자동으로 채워진다(`changeInvitePosition`) */
    changePosition: (id: string, positionId: string) =>
      setInvites((prev) => changeInvitePosition(prev, id, positionId, rules)),
    /** Admin 겸직 — 역할을 바꾸지 않고 그 위에 얹거나 뗀다 */
    toggleAdmin: (id: string) => setInvites((prev) => toggleInviteAdmin(prev, id)),
    /** 마지막 한 줄은 남긴다 — 줄이 0개면 다시 추가할 곳이 사라진다 */
    remove: (id: string) =>
      setInvites((prev) => (prev.length === 1 ? [newInvite(prev)] : removeInvite(prev, id))),
    /** 발송 — 이번에 나간 줄을 잠근다. 이미 보낸 줄은 건드리지 않는다 */
    markSent: () => setInvites((prev) => markInvitesSent(prev, rules)),
    /** 임시 보관함에서 되돌릴 때만 쓴다(draft.ts) */
    reset: (next: Invite[]) => setInvites(next.length > 0 ? next : [newInvite([])]),
    /**
     * 부서·직급 목록이 바뀌었을 때 — 사라진 부서를 가리키던 줄을 기본값으로 되돌린다.
     * (1단계에서 부서를 지우고 3단계로 온 경우)
     *
     * ⚠️ **이미 나간 줄은 건드리지 않는다.** 보낸 내용과 화면이 달라지면 안 된다.
     */
    remapToOptions: (
      departmentIds: Set<string>,
      positionIds: Set<string>,
      roleIdsOf: (departmentId: string) => Set<string>,
    ) =>
      setInvites((prev) =>
        prev.map((invite) => remapInvite(invite, { departmentIds, positionIds, roleIdsOf }, rules)),
      ),
  };
}
