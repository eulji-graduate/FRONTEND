"use client";

import { useEffect } from "react";

import { LeaveGuard } from "@/components/common/leave-guard";

import { loadDraft, saveDraftInvites } from "../draft";
import { createInviteChoices } from "../invite-choices";
import { duplicatedLeaderIds, type InviteRules } from "../invite-rules";
import type { DepartmentNode, Invite, Position } from "../types";
import { useCommittedRedirect } from "../use-committed-redirect";
import { useDraftSync } from "../use-draft-sync";
import { useInviteCommit } from "../use-invite-commit";
import { useInviteList } from "../use-invite-list";
import { useInviteOptions } from "../use-invite-options";
import { InviteColumnHead } from "./invite-column-head";
import { InviteCommitDialog } from "./invite-commit-dialog";
import { InviteFooter } from "./invite-footer";
import { InviteIntro } from "./invite-intro";
import { InviteRow, type InviteRowHandlers } from "./invite-row";
import { InviteSendBar } from "./invite-send-bar";

interface InviteSetupProps {
  departments: DepartmentNode[];
  positions: Position[];
}

/**
 * 온보딩 3단계 — 사원 초대.
 *
 * 부서·직급은 1·2단계에서 정한 것을 그대로 쓴다. 아직 서버 저장이 없어서
 * **임시 보관함(`draft.ts`)** 에 담긴 값을 먼저 보고, 없으면 서버 값을 쓴다.
 * ⚠️ **[완료]를 누르면 끝이다.** 확인 창을 거치면 초대장이 나가고 4단계(결제)로 넘어가며, 되돌아올 수 없다 —
 *    나간 메일은 취소되지 않으니 화면만 고칠 수 있게 두면 그게 거짓말이 된다.
 */
export function InviteSetup({ departments, positions }: InviteSetupProps) {
  const { isReady, source, departmentOptions, rolesOf, positionOptions, isLeaderPosition } =
    useInviteOptions(departments, positions);

  /*
    역할·직급 짝 규칙이 보는 값 — 2단계(직급 권한)와 1단계(부서 트리)에서 온다.
    ⚠️ 규칙 자체는 `invite-rules.ts`에 있다. 화면은 값만 준다.
  */
  const rules: InviteRules = {
    isLeaderPosition,
    hasRoles: (departmentId: string) => rolesOf(departmentId).length > 0,
  };

  const list = useInviteList(rules);

  const { rolesFor, positionsFor, isRoleLocked } = createInviteChoices({
    invites: list.invites,
    rolesOf,
    positionOptions,
    isLeaderPosition,
  });

  const duplicatedLeaders = duplicatedLeaderIds(list.invites, isLeaderPosition);

  useDraftSync({
    value: list.invites,
    load: () => loadDraft().invites,
    save: saveDraftInvites,
    restore: list.reset,
  });

  // 1단계에서 부서를 지웠다면, 그 부서를 가리키던 줄을 기본값으로 되돌린다.
  // 선택지가 확정된 뒤에만 돈다 — 그전에 돌면 보관함에 있던 선택이 지워진다.
  useEffect(() => {
    if (!isReady) return;

    list.remapToOptions(
      new Set(departmentOptions.map((option) => option.id)),
      new Set(positionOptions.map((option) => option.id)),
      (departmentId) => new Set(rolesOf(departmentId).map((option) => option.id)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, departmentOptions, positionOptions]);

  useCommittedRedirect();
  const {
    isConfirmOpen,
    setConfirmOpen,
    unfilledCount,
    flaggedCount,
    commit,
    isCommitting,
    error: commitError,
  } = useInviteCommit({
    invites: list.invites,
    sendable: list.sendable,
    // ⚠️ props가 아니라 `source`다 — 보관함에 담긴 **방금 고친 값**이 저장돼야 한다
    departments: source.departments,
    positions: source.positions,
    markSent: list.markSent,
  });

  /*
    ⚠️ **주소를 적은 줄 수** — 확인 창의 요약 알약이 이 값을 쓴다. `sendable`을 쓰면
       세 칸을 다 못 고른 줄이 있을 때 `초대 0`이 떠서, 사람을 넷 적어 놓고도
       적은 게 다 날아간 줄 안다. 실제로 몇 명에게 나가는지는 그 아래 문장이 말한다.
    ⚠️ 기준은 **주소**다. 이름만 적힌 줄은 아직 누구인지 정해지지 않았다(주소가 계정이 된다).
  */
  const writtenCount = list.invites.filter((invite) => invite.email.trim().length > 0).length;

  const handlers: InviteRowHandlers = {
    onChangeName: list.changeName,
    onChangeEmail: list.changeEmail,
    onChangeDepartment: list.changeDepartment,
    onChangeRole: list.changeRole,
    onChangePosition: list.changePosition,
    onToggleAdmin: list.toggleAdmin,
    onRemove: list.remove,
    departments: departmentOptions,
    rolesFor,
    isRoleLocked,
    positionsFor,
  };

  return (
    <div className="flex flex-col gap-[21px]">
      {/* 적어 둔 게 있으면 탭을 닫기 전에 브라우저가 한 번 물어본다 — 저장은 이 탭 안에만 있다 */}
      {/*
        ⚠️ `sendable`은 **주소가 유효한 줄**만 센다. 적다 만 줄도 잃을 것이라
           여기서는 뭐라도 적힌 줄을 기준으로 본다.
        ⚠️ `isSent`는 보지 않는다. [완료] 직후엔 모든 줄이 `isSent`라, 그걸 세면
           **이미 제출을 마친 사람**까지 붙잡아 "저장 안 됐다"는 창을 띄운다.
      */}
      <LeaveGuard hasUnsaved={list.invites.some((invite) => invite.email.trim().length > 0)} />

      {/* 높이를 여기서 한 번만 정한다 — 좌우 두 칸이 같은 높이를 나눠 쓴다(2단계와 동일) */}
      {/*
        ⚠️ 높이를 560px로 못박으면 낮은 화면(노트북 150% 배율 등)에서 아래가 잘린다.
           **세로가 충분할 때만** 고정한다 — 좁으면 내용 높이 그대로 두고 페이지가 스크롤되게 한다.
      */}
      <div className="flex flex-col gap-7 lg:flex-row [@media(min-height:820px)]:lg:h-[560px]">
        <InviteIntro
          invites={list.sendable}
          departments={departmentOptions}
          rolesOf={rolesOf}
          positions={positionOptions}
        />

        {/* 높이 고정 — 줄을 아무리 추가해도 카드 크기는 그대로고 안에서만 스크롤된다 */}
        <section className="border-border bg-card flex h-[460px] flex-1 flex-col overflow-hidden rounded-xl border shadow-sm [@media(min-height:820px)]:lg:h-full">
          {/* 1·2단계 카드 헤더와 **같은 높이·글자**다(h-12 · 13px) — 단계마다 다르면 넘길 때 화면이 들썩인다 */}
          <header className="border-border bg-muted flex h-12 shrink-0 items-center border-b px-4">
            <h2 className="flex items-center gap-2 text-[13px] leading-5">초대 목록</h2>
          </header>

          <InviteColumnHead />

          {/* 스크롤바는 숨긴다(스크롤 자체는 된다) */}
          <div className="flex-1 overflow-auto overscroll-contain">
            {list.invites.map((invite: Invite, index: number) => (
              <InviteRow
                key={invite.id}
                invite={invite}
                index={index}
                isDuplicated={list.isDuplicated(invite)}
                isDuplicatedLeader={duplicatedLeaders.has(invite.id)}
                hasPlaceholder={index === 0}
                {...handlers}
              />
            ))}
          </div>

          <InviteSendBar sendableCount={list.sendable.length} onAddRow={list.addRow} />
        </section>
      </div>

      <InviteFooter onCommit={() => setConfirmOpen(true)} />

      <InviteCommitDialog
        isOpen={isConfirmOpen}
        onOpenChange={(next) => {
          /*
            ⚠️ **보내는 동안엔 Esc·바깥 클릭으로도 못 닫는다**(2026-08-18, 타임아웃을
               60초로 늘리며 같이 손봄). 계정 발급 + 메일 발송이 최대 1분 걸리는데, 그동안
               창을 닫아버리면 요청은 그대로 진행 중인데 사용자는 아무 결과도 못 보고
               "안 됐나" 하고 다시 열어 또 누르게 된다 — 두 벌 커밋 위험(§정직성).
          */
          if (!next && isCommitting) return;
          setConfirmOpen(next);
        }}
        departmentCount={departmentOptions.length}
        positionCount={positionOptions.length}
        writtenCount={writtenCount}
        sendableCount={list.sendable.length}
        unfilledCount={unfilledCount}
        flaggedCount={flaggedCount}
        onConfirm={commit}
        isPending={isCommitting}
        error={commitError}
      />
    </div>
  );
}
