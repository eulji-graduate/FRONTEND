"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { LeaveGuard } from "@/components/common/leave-guard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { loadDraft, saveDraftPositions } from "../draft";
import { blockedRoles } from "../positions";
import type { AssignableRole, Position } from "../types";
import { useCommittedRedirect } from "../use-committed-redirect";
import { useDraftSync } from "../use-draft-sync";
import type { DraggingPositionId } from "../use-position-drag";
import { usePositionList } from "../use-position-list";
import { PositionAddRow } from "./position-add-row";
import { POSITION_COLUMN } from "./position-columns";
import { PositionIntro } from "./position-intro";
import { PositionRow, type PositionRowHandlers } from "./position-row";

/**
 * 온보딩 2단계 — 직급 체계.
 * ⚠️ 서버 저장은 미구현이다. 단계를 오갈 때 입력이 사라지지 않게
 *    임시 보관함(`draft.ts` · sessionStorage)에만 담아둔다. BE 연동 후 [완료]에서 한 번에 커밋한다.
 */
interface PositionSetupProps {
  initialPositions: Position[];
}

export function PositionSetup({ initialPositions }: PositionSetupProps) {
  // 제출을 마쳤으면 앞 단계를 고칠 수 없다 — 세 단계가 3단계 [완료]에서 한 번에 커밋된다
  useCommittedRedirect();

  const list = usePositionList(initialPositions);
  const [draftName, setDraftName] = useState("");
  const [draftRole, setDraftRole] = useState<AssignableRole>(list.defaultRole);
  const [draggingId, setDraggingId] = useState<DraggingPositionId>(null);

  useDraftSync({
    value: list.positions,
    load: () => loadDraft().positions,
    save: saveDraftPositions,
    restore: list.reset,
  });

  const handleAdd = () => {
    if (list.add(draftName, draftRole)) {
      setDraftName("");
      setDraftRole(list.defaultRole);
    }
  };

  const handlers: PositionRowHandlers = {
    onRename: list.rename,
    onChangeRole: list.changeRole,
    onRemove: list.remove,
    onMove: list.move,
    onShift: list.shift,
    blockedRolesOf: (id: string) => blockedRoles(list.positions, id),
    editingId: list.editingId,
    onEditingChange: list.setEditingId,
    draggingId,
    onDraggingChange: setDraggingId,
  };

  return (
    <div className="flex flex-col gap-[21px]">
      {/* 적어 둔 게 있으면 탭을 닫기 전에 브라우저가 한 번 물어본다 — 저장은 이 탭 안에만 있다 */}
      {/* ⚠️ 목록뿐 아니라 **아직 안 누른 입력칸**도 센다 — 적다가 닫으면 그것도 사라진다 */}
      <LeaveGuard hasUnsaved={list.positions.length > 0 || draftName.trim().length > 0} />

      {/* 높이를 여기서 한 번만 정한다 — 좌우 두 칸이 같은 높이를 나눠 쓴다 */}
      {/*
        ⚠️ 높이를 560px로 못박으면 낮은 화면(노트북 150% 배율 등)에서 아래가 잘린다.
           **세로가 충분할 때만** 고정한다 — 좁으면 내용 높이 그대로 두고 페이지가 스크롤되게 한다.
      */}
      <div className="flex flex-col gap-7 lg:flex-row [@media(min-height:820px)]:lg:h-[560px]">
        <PositionIntro positions={list.positions} />

        {/* 높이 고정 — 직급을 아무리 추가해도 카드 크기는 그대로고 안에서만 스크롤된다 */}
        <section className="border-border bg-card flex h-[460px] flex-1 flex-col overflow-hidden rounded-xl border shadow-sm [@media(min-height:820px)]:lg:h-full">
          <header className="border-border bg-muted flex h-12 shrink-0 items-center border-b px-4">
            <h2 className="flex items-center gap-2 text-[13px] leading-5">직급과 권한</h2>
          </header>

          {/*
            행(PositionRow)과 같은 padding·gap을 쓰고, 칸 너비는 `position-columns.ts`에서 온다.
            ⚠️ 높이·글자는 3단계 열 머리(`InviteColumnHead`)와 **같다**(h-8 · 12px) —
               `gap`만 다른 건 행의 칸 간격이 단계마다 다르기 때문이다.
          */}
          <div className="text-muted-foreground border-border bg-secondary/50 flex h-8 shrink-0 items-center gap-2 border-b px-4 text-[12px] leading-4">
            <span className={cn(POSITION_COLUMN.INDEX, "shrink-0")} aria-hidden />
            <span className={cn(POSITION_COLUMN.NAME, "shrink-0 text-center")}>직급명</span>
            <span className="flex-1" aria-hidden />
            <span className={cn(POSITION_COLUMN.ROLE, "shrink-0 text-center")}>권한</span>
            <span className={cn(POSITION_COLUMN.REMOVE, "shrink-0")} aria-hidden />
          </div>

          {/* 스크롤바는 숨긴다(스크롤 자체는 된다) */}
          <div className="flex-1 overflow-auto overscroll-contain">
            {list.positions.length === 0 ? (
              <p className="text-muted-foreground/70 py-12 text-center text-[13px]">
                아래에서 첫 직급을 추가해 주세요
              </p>
            ) : (
              list.positions.map((position, index) => (
                <PositionRow key={position.id} position={position} index={index} {...handlers} />
              ))
            )}
          </div>

          <PositionAddRow
            name={draftName}
            role={draftRole}
            blocked={blockedRoles(list.positions)}
            onNameChange={setDraftName}
            onRoleChange={setDraftRole}
            onSubmit={handleAdd}
          />
        </section>
      </div>

      <div className="border-border flex items-center justify-end gap-2 border-t pt-[17.5px]">
        <Link
          href="/onboarding/1"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-[34px] gap-1 text-[13px] leading-none",
          )}
        >
          <ChevronLeft className="size-3.5" />
          <span className="leading-none">이전</span>
        </Link>
        {/* ⚠️ 저장은 미구현 — BE 연동 후 Server Action으로 붙인다.
            시안의 주 버튼은 액센트(파랑)가 아니라 먹색이다(토큰 충돌 — 팀 확인 필요). */}
        <Link
          href="/onboarding/3"
          className={cn(
            buttonVariants(),
            "bg-foreground text-background hover:bg-foreground/90 h-[34px] gap-[5.25px] rounded-md px-[12.25px] text-[13px] leading-none",
          )}
        >
          <span className="leading-none">다음</span>
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
