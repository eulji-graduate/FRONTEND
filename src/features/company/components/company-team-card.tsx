"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { LeaveGuard } from "@/components/common/leave-guard";
import { Button } from "@/components/ui/button";
import { COMPANY_SECTION_TITLE } from "@/constants/company";
import { DepartmentAddRow } from "@/features/onboarding/components/department-add-row";
import {
  DepartmentNode,
  type DepartmentNodeHandlers,
} from "@/features/onboarding/components/department-node";
import { countDepartments, findNode } from "@/features/onboarding/tree";
import type { DraggingInfo } from "@/features/onboarding/use-department-drag";
import { useDepartmentTree } from "@/features/onboarding/use-department-tree";

import { saveDepartmentsAction } from "../actions";
import type { DepartmentNode as DepartmentNodeType } from "../types";
import { SettingCard } from "./setting-card";

/**
 * 팀 체계 — 온보딩 1단계에서 만든 트리를 나중에 고친다.
 *
 * ⚠️ 편집 조각은 **온보딩 것을 그대로 쓴다**(훅·행·추가줄·삭제 확인창).
 *    두 벌로 만들면 온보딩에서 되는 조작(끌어 옮기기·키보드 승격)이 여기서 조용히 빠진다.
 * ⚠️ 온보딩과 다른 건 **끝**뿐이다 — 거기선 [다음]으로 넘어가고 여기선 저장한다.
 *    임시 보관함(`draft.ts`)은 안 쓴다. 그건 단계를 오가는 동안 값을 지키는 장치지,
 *    이 화면은 오갈 단계가 없고 저장하면 서버가 정본을 들고 있다.
 * ⚠️ 트리를 **통째로** 보낸다 — 순서와 계층이 값이라 한 줄씩 보내면 중간 상태가 저장된다.
 */
interface CompanyTeamCardProps {
  initial: DepartmentNodeType[];
  /** 팀 id → 사원 수. 사람이 딸린 팀은 못 지운다 */
  memberCounts: Record<string, number>;
  /** 역할 id → 그 역할을 쓰는 사원 수. 사람이 딸린 역할도 못 지운다(BE PR #528) */
  roleMemberCounts: Record<string, number>;
}

export function CompanyTeamCard({ initial, memberCounts, roleMemberCounts }: CompanyTeamCardProps) {
  const router = useRouter();
  const tree = useDepartmentTree(initial);
  /*
    ⚠️ 삭제 확인은 **여기서 직접 받는다.** 온보딩의 `requestRemove`는 안에 역할이 있을 때만
       묻는데, 거기선 아직 아무도 안 쓰는 초안이라 그래도 됐다. 여기는 **실제 조직**이라
       빈 팀을 지워도 그 팀 소속 사원이 갈 곳을 잃는다 — 늘 묻는다(§토스트: 파괴적 작업은 Dialog).
  */
  const [pendingTeam, setPendingTeam] = useState<DepartmentNodeType | null>(null);
  const [draftName, setDraftName] = useState("");
  const [dragging, setDragging] = useState<DraggingInfo | null>(null);
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

  /**
   * 사원이 딸린 **팀(뿌리)** 인가.
   * ⚠️ 역할(아랫단)은 사원이 소속되는 곳이 아니라 언제나 `false`다(§권한 ③).
   */
  /** 뿌리(팀)인가 — 아랫단은 역할이다 */
  const isRootTeam = (id: string) => tree.departments.some((team) => team.id === id);

  const hasMembers = (id: string) => isRootTeam(id) && (memberCounts[id] ?? 0) > 0;

  /*
    ⚠️ **강등·이동도 막는다.** 사원이 있는 팀을 남의 팀 아래로 내리면 그 사원들의 소속이
       역할이 되어 버린다 — 지우는 것과 같은 결과다. 화면에서 안 막으면 서버만 거절해서,
       사용자는 지운 적도 없는데 "사원이 남아 있습니다"를 보고 무엇을 되돌릴지 모른다.
    ⚠️ 조용히 무시하지 않고 **왜 안 되는지 말한다**(§정직성).
  */
  const blockIfStaffed = (id: string, run: () => void) => {
    if (!hasMembers(id)) {
      run();
      return;
    }
    toast.error("사원이 있어 옮길 수 없습니다");
  };

  const handlers: DepartmentNodeHandlers = {
    onRename: tree.rename,
    onAddChild: tree.addChild,
    onRemove: (id: string) => setPendingTeam(findNode(tree.departments, id) ?? null),
    /*
      ⚠️ `inside`만 막으면 샌다. 역할 옆에 `before`/`after`로 떨어뜨리면 그 역할의 **부모 아래**로
         들어가서, 뿌리 팀이 역할 단으로 내려간다 — 결과가 `inside`와 같다.
         그래서 **떨어뜨리는 자리가 역할 옆인지**를 보고 막는다.
    */
    onMove: (draggedId, targetId, position) =>
      position === "inside" || !isRootTeam(targetId)
        ? blockIfStaffed(draggedId, () => tree.move(draggedId, targetId, position))
        : tree.move(draggedId, targetId, position),
    onShift: tree.shift,
    onPromote: tree.promote,
    onDemote: (id: string) => blockIfStaffed(id, () => tree.demote(id)),
    editingId: tree.editingId,
    onEditingChange: tree.setEditingId,
    dragging,
    onDraggingChange: setDragging,
    /*
      ⚠️ **순서를 저장할 API가 없다**(§연동 검증). 손잡이를 그대로 두면 순서를 바꾸고
         [저장]을 눌렀을 때 "저장했습니다"가 뜨지만 실제로는 조용히 사라진다(2026-08-14
         적발) — 계층 변경(승격·강등)은 이미 "역할 안 저장" 안내로 막혀 있는데 순서만
         그 경로를 안 타서 몰래 새고 있었다. `DepartmentNodeHandlers.canReorder` 참고.
    */
    canReorder: false,
  };

  /*
    ⚠️ **팀 수는 뿌리만 센다.** `countDepartments`는 안에 든 역할까지 다 세는데, 그 값을
       `팀 n개`라고 적으면 팀 셋짜리 회사가 `팀 5개`라고 나온다 — 역할은 따로 적는다.
  */
  const roleCount = countDepartments(tree.departments) - tree.departments.length;
  const aside = `팀 ${tree.departments.length}개 · 역할 ${roleCount}개`;

  // 안 고친 걸 저장하면 "저장했습니다"가 아무 뜻이 없다 — 바뀐 게 있을 때만 연다
  const isDirty = JSON.stringify(tree.departments) !== JSON.stringify(saved);

  /* 편집하면 스냅샷이 어긋나 문구가 저절로 사라진다 */
  const error =
    failed && JSON.stringify(tree.departments) === failed.snapshot ? failed.message : null;

  /*
    ⚠️ 삭제 버튼은 **역할에도** 붙어 있다. 전부 "팀"이라 부르면 역할을 지울 때 "'프론트' 팀을
       지울까요?"가 되어 무엇을 지우는지 잘못 말한다(§권한 ③: 팀과 역할은 다른 단이다).
  */
  const isTeam = pendingTeam !== null && tree.departments.some((t) => t.id === pendingTeam.id);
  const unit = isTeam ? "팀" : "역할";

  /**
   * 지우려는 것에 남은 사원 수 — **팀이면 팀원 수, 역할이면 그 역할을 쓰는 사원 수**다.
   * ⚠️ 0이면 확인만 받고, 1명이라도 있으면 **막고 갈 곳을 알려 준다** — 팀은 인수인계·액션
   *    귀속의 단위라 소속이 사라지면 그 사람을 아무도 관리할 수 없고, 역할이 사라지면
   *    되돌릴 명시적 재할당 없이 조용히 "역할 없음"이 된다(BE PR #528, §validate).
   */
  const pendingMembers = pendingTeam
    ? (isTeam ? memberCounts : roleMemberCounts)[pendingTeam.id]
    : undefined;
  const isBlocked = (pendingMembers ?? 0) > 0;

  const handleSave = () => {
    const next = tree.departments;
    startSaving(async () => {
      /*
        ⚠️ **거절도 받아 낸다.** 액션은 BE 실패를 값으로 돌려주지만, 브라우저에서 Next 서버까지
           가는 길이 끊기면(네트워크·서버 재시작·배포) `await` 자체가 던진다 — 안 잡으면
           저장 화면이 통째로 `error.tsx`로 넘어가 **방금 고친 값을 잃는다.**
      */
      let result;
      try {
        result = await saveDepartmentsAction(next);
      } catch {
        setFailed({
          snapshot: JSON.stringify(next),
          message: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        });
        return;
      }

      if (!result.isSuccess) {
        /*
          ⚠️⚠️ **부분 실패면 화면 트리도 서버 진실로 되돌린다**(코드래빗 지적, 2026-08-14).
             저장이 팀·역할을 한 건씩 부르다 중간에 실패하면, 이미 성공한 것들은 서버에
             **진짜 id**로 남는데 화면은 여전히 **임시 id**를 들고 있다 — 그대로 다시 저장을
             누르면 방금 만든 걸 "없다"고 읽어 지우고 임시 id로 또 만든다. `result.departments`가
             오면(실서버 분기의 부분 실패) 그 값으로 트리를 되돌린다 — 실패 문구는 그대로 두되
             `snapshot`도 **되돌린 트리**로 맞춰야 방금 뜬 문구가 리셋 직후 조용히 사라지지
             않는다(아래 `error` 계산이 `tree.departments`와 `snapshot`을 비교한다).
        */
        if (result.departments) {
          tree.reset(result.departments);
          setSaved(result.departments);
          setFailed({
            snapshot: JSON.stringify(result.departments),
            message: result.message ?? "팀 체계를 저장하지 못했습니다",
          });
        } else {
          setFailed({
            snapshot: JSON.stringify(next),
            message: result.message ?? "팀 체계를 저장하지 못했습니다",
          });
        }
        return;
      }
      setFailed(null);
      setSaved(next);
      toast.success("팀 체계를 저장했습니다");
    });
  };

  return (
    <>
      {/*
        ⚠️ 저장 안 한 편집을 들고 나가면 **조용히 사라진다.** 확인창에서 "[저장]을 눌러야
           반영됩니다"라고 말해 놓고 저장 없이 나가는 걸 안 막으면 앞뒤가 안 맞는다.
        ⚠️ 아직 안 누른 입력칸도 센다 — 적다가 닫으면 그것도 사라진다.
      */}
      <LeaveGuard hasUnsaved={isDirty || draftName.trim().length > 0} />

      <SettingCard
        title={COMPANY_SECTION_TITLE.TEAM}
        aside={aside}
        description={
          <>
            <span className="text-foreground font-medium">팀 아래 역할까지 두 단계</span>입니다.
            사원은 팀에 소속되고, 역할은 비워 둘 수 있습니다.
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
        {/*
          열 머리 — 표가 있는 다른 카드(저장소 관리)와 같은 모양이다.
          ⚠️ 면은 표 머리 규격(`bg-secondary/50`)이다 — 옆 카드(직급·권한)와 같은 띠라야
             나란히 놓았을 때 같은 줄로 읽힌다. 바닥의 추가 줄은 온보딩 공용이라 `bg-muted`를
             쓰지만, 그건 **입력 줄**이지 표 머리가 아니다.
          ⚠️ 여백은 카드 전체와 같은 28px다. 아래 목록은 `DepartmentNode`가 자기 몫으로
             8px(`px-2`)를 쓰므로 컨테이너가 20px만 대서 합이 28이 된다.
        */}
        <div className="text-muted-foreground bg-secondary/50 border-border flex items-center justify-between border-b px-7 py-3 text-[12px] leading-4">
          <span>팀 · 역할</span>
          <span>구분</span>
        </div>

        {/*
          ⚠️ 높이를 못박지 않는다. 옆 카드(직급)와 나란히 서서 **키를 나눠 쓰는데**,
             여기서 300px로 고정하면 남는 자리가 [추가] 줄 아래에 빈 띠로 남는다.
             길어지면 이 안에서만 스크롤된다.
        */}
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-5 pt-4 pb-3">
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

        <DepartmentAddRow
          insetClassName="px-7"
          value={draftName}
          onChange={setDraftName}
          onSubmit={() => {
            if (tree.addRoot(draftName)) setDraftName("");
          }}
        />
      </SettingCard>

      {/*
        ⚠️ **무엇을 잃는지**와 **언제 그렇게 되는지**를 같이 적는다. 여기서 [삭제]를 눌러도
           화면에서만 빠지고, 카드 밑 [저장]을 눌러야 서버에 간다 — 그 말을 빼면 이미
           지워진 줄 알고 저장 없이 나가서, 지운 팀이 그대로 남는다(§정직성).
        ⚠️ 사람이 딸린 팀·역할이면 **창이 하는 일이 달라진다** — 확인이 아니라 막는 안내다.
           워크플로우에서 사람이 빠질 때는 늘 명시적 재할당을 거치므로(휴직·오프보딩 →
           인수인계 → 귀속), 삭제만 조용히 소속·역할을 지우게 두지 않는다(BE PR #528로
           역할도 팀과 같은 원칙을 따른다).
      */}
      <ConfirmDialog
        isOpen={pendingTeam !== null}
        onOpenChange={() => setPendingTeam(null)}
        title={
          isBlocked
            ? `\u2018${pendingTeam?.name ?? ""}\u2019 ${unit}은 지울 수 없습니다`
            : `\u2018${pendingTeam?.name ?? ""}\u2019 ${unit}을 지울까요?`
        }
        description={
          isBlocked ? (
            <>
              사원 {pendingMembers}명이{" "}
              {isTeam ? "이 팀에 속해 있습니다" : "이 역할을 쓰고 있습니다"}.
              <br />
              사원 관리에서 {isTeam ? "다른 팀으로 옮긴" : "역할을 바꾼"} 뒤 지워 주세요.
              {isDirty && (
                <>
                  <br />
                  지금 나가면 저장하지 않은 팀 편집은 사라집니다.
                </>
              )}
            </>
          ) : (
            <>
              {pendingTeam && pendingTeam.children.length > 0
                ? `안에 있는 역할 ${pendingTeam.children.length}개도 함께 목록에서 빠집니다.`
                : `이 ${unit}에는 사원이 없어 바로 지울 수 있습니다.`}
              <br />
              [저장]을 눌러야 반영됩니다.
            </>
          )
        }
        /* 막힌 창은 **다음 걸음**을 준다 — "안 됩니다"만 말하고 끝내면 갈 곳을 찾아 헤맨다 */
        confirmLabel={isBlocked ? "사원 관리 열기" : "삭제"}
        cancelLabel={isBlocked ? "닫기" : undefined}
        mark={isBlocked ? "alert" : "check"}
        isDestructive={!isBlocked}
        onConfirm={() => {
          if (!pendingTeam) return;
          if (isBlocked) {
            /*
              ⚠️ `LeaveGuard`는 `beforeunload`만 잡는다 — Next의 클라이언트 이동에는 안 뛴다.
                 그래서 나가기 전에 **설명으로 한 번 알리고**(위 문장) 창을 닫고 옮긴다.
            */
            setPendingTeam(null);
            router.push("/manage/members");
            return;
          }
          tree.confirmRemove(pendingTeam.id);
          setPendingTeam(null);
        }}
      />
    </>
  );
}
