"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { formatGb } from "@/features/billing/pricing";
import type { BillingConfig } from "@/features/billing/types";

import { deleteRecordingsAction } from "../actions";
import { buildStorageTotals, canDeleteRecordings, freedGb, totalFreeableGb } from "../storage";
import type { ProjectStorage, StorageOverview } from "../types";
import { ProjectStorageTable } from "./project-storage-table";
import { StorageSummary } from "./storage-summary";

interface StorageViewProps {
  overview: StorageOverview;
  config: BillingConfig;
  /** 지울 수 있는 사람인지 — 대표이거나 Admin을 겸한 사람 */
  canManage: boolean;
  /**
   * `4개월 전` 같은 표기를 계산하는 기준 날짜 `YYYY-MM-DD` — **서버가 정한다.**
   * ⚠️ 여기서 `new Date()`를 부르면 안 된다(하이드레이션 §서버우선).
   */
  today: string;
}

/**
 * 녹음 용량 — **지울지 판단하는 화면**이다.
 *
 * 읽는 순서는 **얼마나 찼나 → 지우면 무엇을 잃나 → 어디를 지울까**다.
 *
 * ⚠️ 지우면 그 프로젝트의 **음성과 자막·요약이 함께** 사라지고 줄이 목록에서 빠진다
 *    (2026-08-05 팀 결정). 자막·요약만 못 지우면 보관 기한이 없어 저장량이 단조 증가한다.
 * 가운데 한 줄이 빠지면 사용자는 요약과 액션까지 사라지는 줄 알고 손을 못 댄다.
 *
 * ⚠️ 데이터는 **서버에서 받아 props로** 내려온다. 이 컴포넌트가 클라이언트인 건 확인 창과
 *    아래 목 상태 때문이지 데이터를 가져오려는 게 아니다(§서버우선).
 * ⚠️ **삭제는 창으로 확인받는다.** 되돌릴 수 없는 일이라 토스트로 알리고 지나갈 수 없다
 *    (CLAUDE.md §렌더링: 파괴적 작업 확인은 Dialog).
 * ⚠️ 지운 결과는 지금 **화면 안에서만** 반영된다. 목이라서다 — 연동되면 이 `useState`를
 *    지우고 `revalidatePath`가 새 값을 내려 준다.
 */
export function StorageView({ overview, config, canManage, today }: StorageViewProps) {
  const [projects, setProjects] = useState<readonly ProjectStorage[]>(overview.projects);
  const [target, setTarget] = useState<ProjectStorage | null>(null);
  const [isPending, setIsPending] = useState(false);

  /*
    ⚠️ 합계를 서버 값 그대로 쓰지 않고 **목록에서 다시 낸다.** 지운 직후에도 위 카드가 따라
       줄어야 하는데, 서버가 준 총량을 그대로 두면 표만 줄고 게이지는 그대로여서 화면이
       두 가지 말을 하게 된다.
  */
  const totals = buildStorageTotals(
    {
      voiceGb: projects.reduce((sum, project) => sum + project.voiceGb, 0),
      sttGb: projects.reduce((sum, project) => sum + project.sttGb, 0),
      projects,
    },
    config,
  );

  const handleDelete = async () => {
    if (!target) return;

    setIsPending(true);
    /*
      ⚠️ 액션은 **거절될 수도 있다.** 권한·검증 실패는 값으로 오지만, 네트워크가 끊기거나
         서버가 죽으면 호출 자체가 거절된다 — 잡지 않으면 아무 일도 안 일어난 것처럼 보이고
         콘솔에만 남는다(§정직성).
      ⚠️ `finally`로 푼다. `await` 뒤에서만 풀면 거절됐을 때 버튼이 영영 잠긴다.
    */
    try {
      const result = await deleteRecordingsAction(target.tag);

      if (!result.isSuccess) {
        // ⚠️ 토스트는 한 줄(220px)이라 짧게 쓴다 — 길면 잘린다(`sonner.tsx`)
        toast.error(result.message ?? "삭제하지 못했습니다");
        return;
      }

      const freed = freedGb(target);
      /*
        ⚠️ **줄을 목록에서 뺀다.** 전에는 값만 0으로 바꿔 빈 줄이 남았는데, 이제 음성과
           자막·요약을 함께 지우므로 그 프로젝트가 저장소에서 차지하는 게 아무것도 없다 —
           `0GB · 0개`인 줄을 남겨 두면 아직 뭔가 있는 것처럼 읽힌다.
      */
      setProjects((prev) => prev.filter((project) => project.tag !== target.tag));
      setTarget(null);
      toast.success(`${formatGb(freed)}를 삭제했습니다`);
    } catch {
      toast.error("삭제하지 못했습니다");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-7">
      {/* ⚠️ 목록 화면 규격은 1440이다(CLAUDE.md §디자인 토큰 — PageLayout `list`) */}
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="flex flex-col gap-7">
          <StorageSummary
            totals={totals}
            freeableGb={totalFreeableGb(projects)}
            deletableCount={projects.filter(canDeleteRecordings).length}
          />

          <ProjectStorageTable
            projects={projects}
            totalVoiceGb={totals.voiceGb}
            canManage={canManage}
            today={today}
            onDelete={setTarget}
          />
        </div>
      </div>

      {/*
        ⚠️ 확인 창은 **무엇을 잃는지와 얼마가 비는지**를 같이 말한다. "정말요?"만 묻는 건
           확인이 아니다 — 되돌릴 수 없는 일이라 판단할 재료를 줘야 한다.
      */}
      <ConfirmDialog
        isOpen={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title="이 프로젝트의 기록을 삭제할까요?"
        description={
          target ? (
            <>
              <span className="font-medium">{target.name}</span>의 음성 {formatGb(target.voiceGb)}와
              자막·요약 {formatGb(target.sttGb)}가 모두 삭제됩니다.
              <br />
              회의 기록과 액션의 출처 추적이 끊기며 되돌릴 수 없습니다.
            </>
          ) : null
        }
        confirmLabel="삭제"
        pendingLabel="삭제 중"
        isPending={isPending}
        isDestructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
