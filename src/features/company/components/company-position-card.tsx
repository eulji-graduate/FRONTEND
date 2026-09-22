"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { LeaveGuard } from "@/components/common/leave-guard";
import { Button } from "@/components/ui/button";
import { COMPANY_SECTION_TITLE } from "@/constants/company";
import { AUTHORITY } from "@/constants/domain";
import { PositionAddRow } from "@/features/onboarding/components/position-add-row";
import { POSITION_COLUMN } from "@/features/onboarding/components/position-columns";
import {
  PositionRow,
  type PositionRowHandlers,
} from "@/features/onboarding/components/position-row";
import { blockedRoles } from "@/features/onboarding/positions";
import type { AssignableRole } from "@/features/onboarding/types";
import type { DraggingPositionId } from "@/features/onboarding/use-position-drag";
import { usePositionList } from "@/features/onboarding/use-position-list";
import { cn } from "@/lib/utils";

import { savePositionsAction } from "../actions";
import type { Position } from "../types";
import { SettingCard } from "./setting-card";

/**
 * 직급·권한 — 온보딩 2단계에서 만든 직급을 나중에 고친다.
 *
 * ⚠️ 편집 조각은 **온보딩 것을 그대로 쓴다**(§팀 체계 카드와 같은 이유).
 * ⚠️ **Admin은 여기 없다.** 직급이 아니라 사람에게 붙는 겸직이라 사원 관리에서 켠다
 *    (CLAUDE.md §라우트 그룹 — `is_admin`은 역할이 아니라 플래그다).
 * ⚠️ Leader는 **한 직급만** 가진다 — 훅이 막고, 서버가 다시 본다.
 */
export function CompanyPositionCard({ initial }: { initial: Position[] }) {
  const list = usePositionList(initial);
  const [draftName, setDraftName] = useState("");
  const [draftRole, setDraftRole] = useState<AssignableRole>(list.defaultRole);
  const [draggingId, setDraggingId] = useState<DraggingPositionId>(null);
  const [saved, setSaved] = useState(initial);
  const [isSaving, startSaving] = useTransition();
  /*
    ⚠️ 저장 실패는 **화면에 남긴다.** 검증 문구는 `같은 이름이 둘 있습니다 — 개발팀`처럼
       어느 줄이 문제인지 담고 있는데, 토스트로 띄우면 한 줄에 잘리고 몇 초 뒤 사라진다 —
       그러면 사라진 문장을 기억해 목록을 눈으로 훑어야 한다(§토스트: 사라지므로 보조다).
  */
  /**
   * 마지막으로 **실패한 저장**과 그때 보낸 값.
   * ⚠️ 문구만 들고 있으면 값을 고쳐도 빨간 글씨가 남는다 — `같은 이름이 둘 있습니다`를
   *    고쳤는데 화면은 계속 그렇다고 말한다. 되돌려서 [저장]이 잠기면 지울 길조차 없다.
   *    실패한 값과 지금 값이 **같을 때만** 보여 주면 편집하는 순간 저절로 사라진다.
   */
  const [failed, setFailed] = useState<{ snapshot: string; message: string } | null>(null);
  /*
    ⚠️ 직급 삭제도 **확인을 받는다**(§토스트: 파괴적 작업은 Dialog). 그 직급을 쓰던 사원의
       권한이 사라지는 일이고, 특히 Leader 직급을 지우면 팀을 관리할 사람이 없어진다.
  */
  const [pending, setPending] = useState<Position | null>(null);

  const handlers: PositionRowHandlers = {
    onRename: list.rename,
    onChangeRole: list.changeRole,
    onRemove: (id: string) => setPending(list.positions.find((item) => item.id === id) ?? null),
    onMove: list.move,
    onShift: list.shift,
    blockedRolesOf: (id: string) => blockedRoles(list.positions, id),
    editingId: list.editingId,
    onEditingChange: list.setEditingId,
    draggingId,
    onDraggingChange: setDraggingId,
    /*
      ⚠️ **순서를 저장할 API가 없다**(§연동 검증). 직급 저장은 이름·권한만 비교해 보내서,
         순서를 바꾸고 [저장]을 누르면 "저장했습니다"가 뜨지만 실제로는 조용히 사라진다
         (2026-08-14 적발). `PositionRowHandlers.canReorder` 참고.
    */
    canReorder: false,
  };

  const isDirty = JSON.stringify(list.positions) !== JSON.stringify(saved);

  /* 편집하면 스냅샷이 어긋나 문구가 저절로 사라진다 */
  const error =
    failed && JSON.stringify(list.positions) === failed.snapshot ? failed.message : null;

  /** 지금 고를 수 없는 권한 — 추가 줄과 각 행이 같은 값을 본다 */
  const blocked = blockedRoles(list.positions);
  /*
    ⚠️ 막힌 값이면 **상태를 내린다.** 표시만 덮어쓰면 위 목록에서 리더를 도로 풀었을 때
       추가 줄이 손대지도 않았는데 Leader로 되살아난다 — 화면이 스스로 값을 바꾼 것처럼 보인다.
  */
  if (blocked.includes(draftRole)) setDraftRole(list.defaultRole);

  const handleSave = () => {
    const next = list.positions;
    startSaving(async () => {
      /*
        ⚠️ **거절도 받아 낸다.** 액션은 BE 실패를 값으로 돌려주지만, 브라우저에서 Next 서버까지
           가는 길이 끊기면(네트워크·서버 재시작·배포) `await` 자체가 던진다 — 안 잡으면
           저장 화면이 통째로 `error.tsx`로 넘어가 **방금 고친 값을 잃는다.**
      */
      let result;
      try {
        result = await savePositionsAction(next);
      } catch {
        setFailed({
          snapshot: JSON.stringify(next),
          message: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        });
        return;
      }

      if (!result.isSuccess) {
        setFailed({
          snapshot: JSON.stringify(next),
          message: result.message ?? "직급·권한을 저장하지 못했습니다",
        });
        return;
      }
      setFailed(null);
      setSaved(next);
      toast.success("직급 체계를 저장했습니다");
    });
  };

  return (
    <>
      {/* 저장 안 한 편집을 들고 나가면 조용히 사라진다 — 팀 체계 카드와 같은 이유 */}
      <LeaveGuard hasUnsaved={isDirty || draftName.trim().length > 0} />

      <SettingCard
        title={COMPANY_SECTION_TITLE.POSITION}
        aside={`직급 ${list.positions.length}개`}
        description={
          <>
            <span className="text-foreground font-medium">권한은 직급에서 옵니다.</span> Leader는 한
            직급만 가질 수 있고, 그 직급을 받은 사람이 팀마다 한 명씩 자기 팀 전체를 관리합니다.
            Admin은 직급이 아니라 사람에게 붙는 겸직이라 사원 관리에서 켭니다.
          </>
        }
        footer={
          <>
            {error && (
              <p role="alert" className="text-destructive mr-auto text-[12px] leading-4 break-keep">
                {error}
              </p>
            )}
            <Button
              type="button"
              size="sm"
              variant="ink"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? "저장 중…" : "저장"}
            </Button>
          </>
        }
      >
        {/* 칸 너비는 행(`PositionRow`)과 같은 곳에서 온다 — 따로 적으면 머리와 몸이 어긋난다 */}
        <div className="text-muted-foreground bg-secondary/50 border-border flex shrink-0 items-center gap-2 border-b px-7 py-3 text-[12px] leading-4">
          <span className={cn(POSITION_COLUMN.INDEX, "shrink-0")} aria-hidden />
          <span className={cn(POSITION_COLUMN.NAME, "shrink-0 text-center")}>직급명</span>
          <span className="flex-1" aria-hidden />
          <span className={cn(POSITION_COLUMN.ROLE, "shrink-0 text-center")}>권한</span>
          {/*
            ⚠️ 머리의 빈 칸은 **폭만** 잡는다(2026-08-11). `size-6`이라 높이 24px까지 밀어
               올려서, 이 띠만 옆 카드(팀 체계)보다 8px 두꺼웠다 — 띠의 키는 글자가 정한다.
          */}
          <span className="w-6 shrink-0" aria-hidden />
        </div>

        {/* 남는 키는 목록이 가져간다 — 팀 체계 카드와 같은 이유 */}
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
          {list.positions.length === 0 ? (
            <p className="text-muted-foreground/70 py-12 text-center text-[13px]">
              아래에서 첫 직급을 추가해 주세요
            </p>
          ) : (
            list.positions.map((position, index) => (
              <PositionRow
                key={position.id}
                position={position}
                index={index}
                insetClassName="px-7"
                {...handlers}
              />
            ))
          )}
        </div>

        {/*
        ⚠️ Leader는 **다른 말을 한다.** 회사에 하나뿐인 직급이라, 지우면 팀을 관리할 사람이
           아예 없어진다 — 사원 하나가 권한을 잃는 것과 무게가 다르다.
      */}
        <ConfirmDialog
          isOpen={pending !== null}
          onOpenChange={() => setPending(null)}
          title={`\u2018${pending?.name ?? ""}\u2019 직급을 지울까요?`}
          description={
            <>
              {pending?.role === AUTHORITY.LEADER
                ? "회사에 하나뿐인 Leader 직급입니다. 지우면 팀을 관리할 권한을 가진 사람이 없어집니다."
                : "이 직급을 쓰던 사원은 직급과 그에 딸린 권한을 잃습니다."}
              <br />
              [저장]을 눌러야 반영됩니다.
            </>
          }
          confirmLabel="삭제"
          isDestructive
          onConfirm={() => {
            if (!pending) return;
            list.remove(pending.id);
            setPending(null);
          }}
        />

        {/*
        ⚠️ 고를 수 없게 된 값은 **되돌려 보여 준다.** Leader를 골라 둔 채로 위 목록에서
           다른 줄을 Leader로 바꾸면, 칸에는 Leader라고 적혀 있는데 [추가]는 조용히
           Member로 낮춰 넣는다 — 화면이 거짓말한다(`usePositionList.add`).
      */}
        <PositionAddRow
          insetClassName="px-7"
          name={draftName}
          role={draftRole}
          blocked={blocked}
          onNameChange={setDraftName}
          onRoleChange={setDraftRole}
          onSubmit={() => {
            if (list.add(draftName, draftRole)) {
              setDraftName("");
              setDraftRole(list.defaultRole);
            }
          }}
        />
      </SettingCard>
    </>
  );
}
