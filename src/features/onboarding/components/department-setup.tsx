"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { LeaveGuard } from "@/components/common/leave-guard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { loadDraft, saveDraftDepartments } from "../draft";
import { countDepartments } from "../tree";
import type { DepartmentNode as DepartmentNodeType } from "../types";
import { useCommittedRedirect } from "../use-committed-redirect";
import type { DraggingInfo } from "../use-department-drag";
import { useDepartmentTree } from "../use-department-tree";
import { useDraftSync } from "../use-draft-sync";
import { DepartmentAddRow } from "./department-add-row";
import { DepartmentDeleteDialog } from "./department-delete-dialog";
import { DepartmentIntro } from "./department-intro";
import { DepartmentNode, type DepartmentNodeHandlers } from "./department-node";

/**
 * 온보딩 1단계 — 부서 체계.
 * ⚠️ 서버 저장은 미구현이다. 단계를 오갈 때 입력이 사라지지 않게
 *    임시 보관함(`draft.ts` · sessionStorage)에만 담아둔다. BE 연동 후 [완료]에서 한 번에 커밋한다.
 */
export function DepartmentSetup({
  initialDepartments,
}: {
  initialDepartments: DepartmentNodeType[];
}) {
  // 제출을 마쳤으면 앞 단계를 고칠 수 없다 — 세 단계가 3단계 [완료]에서 한 번에 커밋된다
  useCommittedRedirect();

  const tree = useDepartmentTree(initialDepartments);
  const [draftName, setDraftName] = useState("");
  const [dragging, setDragging] = useState<DraggingInfo | null>(null);

  useDraftSync({
    value: tree.departments,
    load: () => loadDraft().departments,
    save: saveDraftDepartments,
    restore: tree.reset,
  });

  const total = countDepartments(tree.departments);

  const handleAddRoot = () => {
    if (tree.addRoot(draftName)) setDraftName("");
  };

  const handlers: DepartmentNodeHandlers = {
    onRename: tree.rename,
    onAddChild: tree.addChild,
    onRemove: tree.requestRemove,
    onMove: tree.move,
    onShift: tree.shift,
    onPromote: tree.promote,
    onDemote: tree.demote,
    editingId: tree.editingId,
    onEditingChange: tree.setEditingId,
    dragging,
    onDraggingChange: setDragging,
  };

  return (
    <div className="flex flex-col gap-[21px]">
      {/* 적어 둔 게 있으면 탭을 닫기 전에 브라우저가 한 번 물어본다 — 저장은 이 탭 안에만 있다 */}
      {/* ⚠️ 목록뿐 아니라 **아직 안 누른 입력칸**도 센다 — 적다가 닫으면 그것도 사라진다 */}
      <LeaveGuard hasUnsaved={tree.departments.length > 0 || draftName.trim().length > 0} />

      {/* 높이를 여기서 한 번만 정한다 — 좌우 두 칸이 같은 높이를 나눠 쓴다 */}
      {/*
        ⚠️ 높이를 560px로 못박으면 낮은 화면(노트북 150% 배율 등)에서 아래가 잘린다.
           **세로가 충분할 때만** 고정한다 — 좁으면 내용 높이 그대로 두고 페이지가 스크롤되게 한다.
      */}
      <div className="flex flex-col gap-7 lg:flex-row [@media(min-height:820px)]:lg:h-[560px]">
        <DepartmentIntro departments={tree.departments} />

        {/* 높이 고정 — 팀을 아무리 추가해도 카드 크기는 그대로고 안에서만 스크롤된다 */}
        <section className="border-border bg-card flex h-[460px] flex-1 flex-col overflow-hidden rounded-xl border shadow-sm [@media(min-height:820px)]:lg:h-full">
          <header className="border-border bg-muted flex h-12 shrink-0 items-center justify-between border-b px-4">
            <h2 className="flex items-center gap-2 text-[13px] leading-5">팀 구조 미리보기</h2>
            {/* 계층 제약 안내는 좌측 안내문에 있다 — 헤더에 겹쳐 쓰면 지저분해진다 */}
            <span className="text-muted-foreground/70 text-[12px] leading-4 tabular-nums">
              팀 {total}개
            </span>
          </header>

          {/* 스크롤바는 숨긴다(스크롤 자체는 된다) */}
          <div className="flex-1 overflow-auto overscroll-contain px-4 pt-4 pb-3">
            {tree.departments.length === 0 ? (
              <p className="text-muted-foreground/70 py-12 text-center text-[13px]">
                아래에서 첫 팀을 추가해 주세요
              </p>
            ) : (
              <ul>
                {tree.departments.map((node, index) => (
                  <li key={node.id} className={index > 0 ? "pt-[1.75px]" : undefined}>
                    <DepartmentNode node={node} depth={0} parentId={null} {...handlers} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DepartmentAddRow value={draftName} onChange={setDraftName} onSubmit={handleAddRoot} />
        </section>
      </div>

      <div className="border-border flex items-center justify-end border-t pt-[17.5px]">
        {/* 시안의 주 버튼은 액센트(파랑)가 아니라 먹색이다(토큰 충돌 — 팀 확인 필요) */}
        <Link
          href="/onboarding/2"
          className={cn(
            buttonVariants(),
            "bg-foreground text-background hover:bg-foreground/90 h-[34px] gap-[5.25px] rounded-md px-[12.25px] text-[13px] leading-none",
          )}
        >
          <span className="leading-none">다음</span>
          <ChevronRight className="size-3.5" />
        </Link>
      </div>

      <DepartmentDeleteDialog
        target={tree.pendingDelete}
        onCancel={tree.cancelRemove}
        onConfirm={tree.confirmRemove}
      />
    </div>
  );
}
