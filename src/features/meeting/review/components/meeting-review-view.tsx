"use client";

import { CircleCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import {
  type ActionRejectReason,
  AI_CONFIDENCE,
  REVIEW_ASSIGNMENT_TARGET_LABEL,
} from "@/constants/meeting";

import { confirmActionDistributionAction } from "../actions";
import type { AiActionDraft, ManualDraftInput, MeetingReviewInfo } from "../types";
import { ActionReviewGroup } from "./action-review-group";
import { ActionReviewRow } from "./action-review-row";
import { ManualDraftForm } from "./manual-draft-form";
import { RejectReasonDialog } from "./reject-reason-dialog";
import { ReviewLeaveGuard } from "./review-leave-guard";

/** 다음 수동 초안 id — updater 밖에서 생성한다(React가 updater를 두 번 부를 수 있어, 안에서 세면 어긋난다). */
function nextManualDraftId(): string {
  return `manual-${crypto.randomUUID()}`;
}

interface MeetingReviewViewProps {
  review: MeetingReviewInfo;
}

/**
 * AI 액션 분배 리뷰 — 화면(`/app/meeting/:id/review`)의 클라이언트 오케스트레이션.
 * ⚠️ **로컬 상태인 건 [액션 직접 추가]로 방금 만든 초안뿐이다.** AI가 뽑은 행은 회의 종료
 *    직후 분석 단계에서 이미 서버에 만들어져 있다 — 확정 전이라 담당자 화면에 안 나타날
 *    뿐이다(WORKFLOW.md §3-4 "정본은 `actionsConfirmed` 하나뿐"). [액션 분배 확정]이 하는
 *    일은 그 행을 **내보내는 것**이지 새로 만드는 게 아니다.
 */
export function MeetingReviewView({ review }: MeetingReviewViewProps) {
  const [drafts, setDrafts] = useState<AiActionDraft[]>(review.drafts);
  const [rejectedReasons, setRejectedReasons] = useState<Record<string, ActionRejectReason>>({});
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  /*
    ⚠️ **제목은 베껴 두고 열림 깃발만 내린다**(2026-08-10). 전에는 제목을 `rejectTargetId`에서
       그때그때 찾아 썼는데, 닫을 때 id가 먼저 비어서 **닫힘 애니메이션이 도는 동안**
       창에 `''이 확정 대상에서 제외됩니다`가 스쳤다 — 방금 보던 제목이 빈 따옴표로 바뀐다.
       창이 아직 화면에 있는 동안에는 마지막에 보던 값이 그대로 있어야 한다
       (기업 상세 확인창이 같은 이유로 쓰는 방식 — `system/company-detail-dialog.tsx`).
  */
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectTitle, setRejectTitle] = useState("");
  const [pendingReason, setPendingReason] = useState<ActionRejectReason | null>(null);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  /*
    ⚠️ BE가 확정을 멈춘 상태(409 — 확인되지 않은 STT 구간 등). 실수가 아니라 **알고
       강행할지**를 사람이 정할 일이라, 버튼을 [그래도 확정]으로 바꿔 `force`로 다시 보낸다.
  */
  const [isBlocked, setIsBlocked] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();
  /*
    ⚠️ **확정 시도 뒤에만 필수 필드를 빨갛게 강조한다.** 최초 진입에서는 회색 placeholder만
       뒀다가, [액션 분배 확정]을 눌렀는데 값이 비어 있으면 이 플래그가 켜져 각 행이
       비어 있는 제목·세부·마감을 빨간 테두리로 승격한다(§DESIGN 5 — 색은 에러 자리).
  */
  const [hasAttemptedConfirm, setHasAttemptedConfirm] = useState(false);

  /*
    ⚠️ **반려된 것도 목록에 남긴다**(2026-08-18, #622). 이전엔 filter로 아예 뺐는데, 사람이
       무엇을 반려했는지·왜 반려했는지가 화면에서 사라져 다시 훑는 사람이 이유를 못 찾았다.
       분배 확정 대상만 골라내는 자리(대상 카운트·확정 잠금·서버 요청)는 아래 `activeDrafts`가
       담당한다 — 화면에는 전부 남긴다.
  */
  const highConfidence = drafts.filter((d) => d.confidence === AI_CONFIDENCE.HIGH);
  const needsReview = drafts.filter((d) => d.confidence === AI_CONFIDENCE.NEEDS_REVIEW);
  /** 반려 안 된 초안 — 확정 대상·미정 검사·요청 페이로드는 전부 이 기준. */
  const activeDrafts = drafts.filter((draft) => !(draft.id in rejectedReasons));
  /* ⚠️ 이 화면이 "부서"·"담당자" 중 뭐라고 부를지는 이 한 곳에서만 고른다(CodeRabbit 지적) */
  const assignmentTargetLabel = review.isOwnerMeeting
    ? REVIEW_ASSIGNMENT_TARGET_LABEL.TEAM
    : REVIEW_ASSIGNMENT_TARGET_LABEL.PERSONAL;
  /*
    ⚠️ **담당자 미정이 남아 있으면 확정을 잠근다.** AI가 담당자를 못 짚은 액션은 "담당자
       미정"으로 온다(매퍼 주석) — BE도 그 항목을 `NO_ASSIGNEE`로 걸러 분배하지 않으므로,
       여기서 안 잠그면 확정이 끝난 줄 알았는데 몇 건이 조용히 남는다(§정직성).
  */
  /*
    ⚠️ **Owner 회의는 `teamId`가 미정 기준이다**(2026-08-13). 그 외엔 그대로 `assigneeId` —
       회의 하나가 두 모드를 섞지 않으므로 검사도 회의 전체 기준(`review.isOwnerMeeting`)으로
       한 번만 가른다.
    ⚠️ **반려된 초안은 검사 대상이 아니다**(#622) — 반려는 사람이 이미 판단을 끝낸 것이라
       담당자가 없어도 확정을 막을 이유가 없다(BE `ConfirmDistributionService`도 반려를
       담당자 검사보다 먼저 걸러낸다 — `skipReasonOf` 주석).
  */
  const hasUnassigned = review.isOwnerMeeting
    ? activeDrafts.some((draft) => draft.teamId === null)
    : activeDrafts.some((draft) => draft.assigneeId === null);
  /*
    ⚠️ **필수 입력값(제목·세부내용·마감일) 누락 검사**(#622). BE는 입력 스키마 위반을
       422로 튕기는데, 확정 다이얼로그가 뜬 뒤에 그걸 마주치면 사용자는 "다이얼로그까지
       왔는데 왜 실패?"로 인지 불일치가 생긴다. 다이얼로그 진입 전이 아니라 다이얼로그
       안에서 안내한다 — 확정 대상은 이 시점에 확정된 값(`activeDrafts`)이라 여기서 검사가
       가장 정확하다.
    ⚠️ **`title`·`description`은 `trim()`으로 본다** — 공백만 있는 값은 BE도 빈 값 취급.
    ⚠️ **반려된 항목은 검사 대상이 아니다** — `activeDrafts`가 이미 걸렀다.
  */
  const hasMissingRequired = activeDrafts.some(
    (draft) =>
      draft.title.trim().length === 0 ||
      draft.description.trim().length === 0 ||
      draft.dueDate.length === 0,
  );
  function updateDraft(id: string, patch: Partial<AiActionDraft>) {
    setDrafts((prev) => prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
  }

  /*
    ⚠️ **부서만 세팅하고 `assigneeId`는 손대지 않는다**(2026-08-18 원복, #631).
       BE 검사(`ApplyReviewDecisionService#requireDecisionShape`)가 요청 body에 assignee·teamId가
       둘 다 있으면 무조건 `REVIEW_ASSIGNEE_TEAM_CONFLICT` 422로 막는다 — 전에 팀장 memberId를
       assignee에 함께 세팅했더니 항상 여기서 걸렸다. BE는 MODIFY + teamId만 오면
       `Action.convertToTeam`이 기존 assigneeMemberId를 알아서 null로 비우고 `ActionType=TEAM`으로
       바꾼다(BE 정본 확인 2026-08-18).
  */
  function handleTeamChange(draftId: string, teamId: number) {
    updateDraft(draftId, { teamId, assigneeId: null });
  }

  /**
   * 반려 취소 — 목록에 남아 있던 반려 아이템을 다시 활성 상태로 되돌린다(#622).
   * ⚠️ 반려 사유만 지운다. 초안의 내용·담당자·일정은 반려 전 값이 그대로 유지된다.
   */
  function unrejectDraft(id: string) {
    setRejectedReasons((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function openRejectDialog(id: string) {
    setRejectTargetId(id);
    setRejectTitle(drafts.find((d) => d.id === id)?.title ?? "");
    setPendingReason(null);
    setIsRejectOpen(true);
  }

  function confirmReject() {
    if (!rejectTargetId || !pendingReason) return;
    setRejectedReasons((prev) => ({ ...prev, [rejectTargetId]: pendingReason }));
    setIsRejectOpen(false);
  }

  function addManualDraft(input: ManualDraftInput) {
    const id = nextManualDraftId();
    setDrafts((prev) => [
      ...prev,
      {
        id,
        title: input.title,
        description: input.description,
        /* ⚠️ 폼이 모드별로 둘 중 하나만 채워 보낸다(`ManualDraftForm`) — 안 채운 쪽은 null */
        assigneeId: input.assigneeId ?? null,
        teamId: input.teamId ?? null,
        confidence: AI_CONFIDENCE.NEEDS_REVIEW,
        startDate: input.startDate,
        dueDate: input.dueDate,
        evidence: null,
        isManual: true,
      },
    ]);
    setIsAddingManual(false);
  }

  /**
   * 로컬에서 새로 만든 초안인가 — BE에서 온 초안은 id가 숫자 문자열이고, 이 화면에서
   * [액션 직접 추가]로 만든 것만 `manual-` 접두사를 갖는다(`nextManualDraftId`).
   * ⚠️ `isManual`로 가르면 안 된다 — 지난 확정 시도에서 서버에 이미 만들어진 수동 액션이
   *    재조회로 돌아오면 그것도 `isManual`이라, 같은 항목이 서버에 **한 번 더** 만들어진다.
   */
  function isLocalManual(id: string): boolean {
    return id.startsWith("manual-");
  }

  function handleConfirm(force: boolean) {
    setConfirmError(null);
    /* 처음 값과 대조해 **고친 칸만** 보낸다 — 안 고친 값까지 보내면 BE가 전부 "사람이
       고쳤다"로 라벨을 남겨 틀린 학습 재료가 된다(actions.ts 주석). */
    const initialById = new Map(review.drafts.map((draft) => [draft.id, draft]));

    startTransition(async () => {
      try {
        const result = await confirmActionDistributionAction(
          review.meetingId,
          {
            reviewed: activeDrafts
              .filter((draft) => !isLocalManual(draft.id))
              .map((draft) => {
                const initial = initialById.get(draft.id);
                const changes = {
                  ...(initial && draft.title !== initial.title ? { title: draft.title } : {}),
                  ...(initial && draft.description !== initial.description
                    ? { description: draft.description }
                    : {}),
                  /*
                    ⚠️ **오너 회의는 `teamId`만 보낸다**(2026-08-18 원복, #631). BE 검사
                       (`ApplyReviewDecisionService#requireDecisionShape`)가 body에 둘 다 있으면
                       무조건 `REVIEW_ASSIGNEE_TEAM_CONFLICT` 422로 막고, MODIFY + teamId만
                       오면 `Action.convertToTeam`이 기존 assigneeMemberId를 자동으로 null 처리
                       하며 `ActionType`을 TEAM으로 전환한다(BE 정본).
                    ⚠️ 그 외(팀 회의)는 그대로 `assigneeId`만 보낸다 — 사용자가 담당자를
                       바꿨을 때만 실어 서버가 "사람이 고쳤다" 라벨을 정확히 남기게 한다.
                  */
                  ...(review.isOwnerMeeting
                    ? draft.teamId !== null
                      ? { teamId: draft.teamId }
                      : {}
                    : initial &&
                        draft.assigneeId !== initial.assigneeId &&
                        draft.assigneeId !== null
                      ? { assigneeId: draft.assigneeId }
                      : {}),
                  ...(initial && draft.dueDate !== initial.dueDate
                    ? { dueDate: draft.dueDate }
                    : {}),
                };
                return {
                  id: draft.id,
                  ...(draft.startDate ? { plannedStartDate: draft.startDate } : {}),
                  ...(Object.keys(changes).length > 0 ? { changes } : {}),
                };
              }),
            /* 로컬에서만 만든 초안의 반려는 서버에 보낼 게 없다 — 만들지 않으면 그만이다 */
            rejected: Object.entries(rejectedReasons)
              .filter(([id]) => !isLocalManual(id))
              .map(([id, reason]) => ({ id, reason })),
            // ⚠️ 직접 추가한 항목은 `manuallyAdded`로 따로 보낸다 — 위에 넣으면 겹쳐 이중 집계된다.
            manuallyAdded: drafts
              .filter((draft) => isLocalManual(draft.id) && !(draft.id in rejectedReasons))
              .map((draft) => ({
                /* 서버가 만든 id를 이 초안과 맞춰 돌려주기 위한 표식(actions.ts 주석) */
                localId: draft.id,
                title: draft.title,
                description: draft.description,
                /*
                  ⚠️ 폼이 모드별로 둘 중 하나만 채운다(`canAdd`가 그 하나를 강제) — 오너 회의는
                     `teamId`, 그 외엔 `assigneeId`. 둘 다 실으면 BE가 422로 막는다(actions.ts 주석).
                */
                ...(draft.teamId !== null
                  ? { teamId: draft.teamId }
                  : { assigneeId: draft.assigneeId ?? 0 }),
                startDate: draft.startDate,
                dueDate: draft.dueDate,
              })),
          },
          { force },
        );

        /*
          ⚠️ **어떤 결과든 먼저 갈아 끼운다**(2026-08-13, 코드래빗 지적). 서버가 이미 만든
             수동 액션은 로컬 초안이 아니라 **서버 초안**이다 — 409로 멈춘 뒤 [그래도 확정]을
             누르면 같은 항목이 하나 더 만들어졌다. id를 바꿔 두면 다음 시도에서 `isLocalManual`이
             false가 되어 추가(③)가 아니라 판정(②)으로 나간다.
        */
        if (result.createdManuals.length > 0) {
          const byLocalId = new Map(result.createdManuals.map((made) => [made.localId, made]));
          setDrafts((prev) =>
            prev.map((draft) => {
              const made = byLocalId.get(draft.id);
              return made ? { ...draft, id: String(made.actionId) } : draft;
            }),
          );
          /* 반려해 둔 것도 같은 초안이라 키를 함께 옮긴다 — 안 옮기면 서버에 반려가 안 간다 */
          setRejectedReasons((prev) => {
            const next: Record<string, ActionRejectReason> = {};
            for (const [id, reason] of Object.entries(prev)) {
              next[byLocalId.get(id) ? String(byLocalId.get(id)!.actionId) : id] = reason;
            }
            return next;
          });
        }

        if (result.status === "notFound") {
          setConfirmError("회의를 찾을 수 없습니다. 페이지를 새로고침해 주세요.");
          return;
        }
        if (result.status === "failed") {
          setConfirmError(result.message);
          return;
        }
        /*
          ⚠️ BE가 멈춘 것(409)은 실패가 아니라 **경고**다 — 확인되지 않은 STT 구간이 남아
             액션이 빠졌을 수 있다는 뜻이라, 원인을 적고 [그래도 확정]으로만 넘어가게 한다.
        */
        if (result.status === "blocked") {
          setIsBlocked(true);
          setConfirmError(result.message);
          return;
        }

        // "alreadyConfirmed"도 결과적으로 확정된 상태다 — 다른 탭에서 먼저 확정한 경우까지 포함.
        setConfirmOpen(false);
        setIsConfirmed(true);
        /*
          ⚠️ 둘은 **다른 일**이다 — 내가 방금 확정한 것과, 다른 탭에서 이미 확정돼 있던 것.
             앞은 성공(체크)이고 뒤는 알림이라 아이콘 없이 둔다. 뒤를 성공으로 띄우면
             내가 분배한 것처럼 읽힌다(§정직성).
        */
        if (result.status === "confirmed") {
          toast.success(`${result.createdCount}건의 액션을 분배했습니다`);
          /* 반려 말고도 안 나간 게 있다 — 조용히 넘기면 검토가 끝난 줄 안다(§정직성) */
          if (result.skippedCount > 0) {
            toast.warning(`${result.skippedCount}건은 분배되지 않았습니다`);
          }
        } else {
          toast("이미 확정된 회의입니다");
        }
      } catch {
        // ⚠️ 다이얼로그를 열어 둔 채 원인을 적는다 — 토스트만 띄우면 몇 초 뒤엔 실패했던 사실이
        //    사라져 사용자가 같은 버튼을 다시 누른다(§confirm-dialog "토스트는 보조다").
        setConfirmError("액션 분배에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    });
  }

  if (isConfirmed) {
    return (
      <section className="border-border bg-card rounded-2xl border">
        <EmptyState
          icon={CircleCheck}
          title="액션 분배를 확정했습니다."
          description="이 화면은 다시 열 수 없습니다 — 확정 결과는 각 액션 상세에서 확인해 주세요."
        />
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <ReviewLeaveGuard isBlocked />

      {/*
        ⚠️ **머리를 한 줄로 눕힌다**(2026-08-11). 제목·회의·안내를 세로로 쌓아 네 줄을 쓰다 보니
           정작 고쳐야 할 표가 화면 한참 아래에서 시작했다 — 왼쪽은 **무엇을 보는 화면인지**,
           오른쪽은 **어느 회의이고 무엇까지 고칠 수 있는지**로 나눠 한 층에 담는다.
        ⚠️ 오른쪽 글은 오른끝 정렬이다. 가운데로 두면 두 줄의 시작선이 어긋난다.
        ⚠️ 좁아지면 다시 세로로 쌓인다(`sm:`) — 그때는 원래대로 위아래로 읽는다.
      */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        {/* ⚠️ h1 아니다 — 셸 `PageHeader`(layout.tsx)가 이미 h1을 그린다(§한 페이지 h1 하나). */}
        <h2 className="text-[22px] leading-[30px] font-semibold tracking-[-0.4px]">
          AI가 처리한 액션 분배 결과가 나왔습니다!
        </h2>

        <div className="flex shrink-0 flex-col gap-1 sm:items-end">
          <p className="text-muted-foreground text-[13px] leading-5">
            {review.meetingTitle} · {review.scheduleLabel}
          </p>
          <p className="text-muted-foreground text-[12px] leading-4">
            두 그룹 모두 확정 전까지 내용·{assignmentTargetLabel}·시작일·마감일을 수정할 수
            있습니다.
          </p>
        </div>
      </div>

      {/*
        ⚠️ **배너는 화면에 한 번만**(2026-08-13) — 행마다 "이건 팀 액션입니다"를 반복하지 않는다.
           회의 전체가 같은 모드라 한 번 알리면 충분하다.
      */}
      {review.isOwnerMeeting && (
        <p className="border-border bg-muted/30 text-muted-foreground rounded-lg border px-4 py-2.5 text-[13px] leading-5">
          이 회의는 오너 회의입니다 — 여기서 확정하는 액션은{" "}
          {REVIEW_ASSIGNMENT_TARGET_LABEL.PERSONAL}가 아니라 {REVIEW_ASSIGNMENT_TARGET_LABEL.TEAM}에
          하달됩니다.
        </p>
      )}

      <ActionReviewGroup confidence={AI_CONFIDENCE.HIGH} count={highConfidence.length}>
        {highConfidence.map((draft) => (
          <ActionReviewRow
            key={draft.id}
            draft={draft}
            assigneeOptions={review.assigneeOptions}
            onTitleChange={(title) => updateDraft(draft.id, { title })}
            onDescriptionChange={(description) => updateDraft(draft.id, { description })}
            onAssigneeChange={(assigneeId) => updateDraft(draft.id, { assigneeId })}
            onStartDateChange={(startDate) => updateDraft(draft.id, { startDate })}
            onDueDateChange={(dueDate) => updateDraft(draft.id, { dueDate })}
            onReject={() => openRejectDialog(draft.id)}
            teamOptions={review.isOwnerMeeting ? review.teamOptions : undefined}
            onTeamChange={(teamId) => handleTeamChange(draft.id, teamId)}
            rejectReason={rejectedReasons[draft.id] ?? null}
            onUnreject={() => unrejectDraft(draft.id)}
            hasAttemptedConfirm={hasAttemptedConfirm}
          />
        ))}
      </ActionReviewGroup>

      <ActionReviewGroup confidence={AI_CONFIDENCE.NEEDS_REVIEW} count={needsReview.length}>
        {needsReview.map((draft) => (
          <ActionReviewRow
            key={draft.id}
            draft={draft}
            assigneeOptions={review.assigneeOptions}
            onTitleChange={(title) => updateDraft(draft.id, { title })}
            onDescriptionChange={(description) => updateDraft(draft.id, { description })}
            onAssigneeChange={(assigneeId) => updateDraft(draft.id, { assigneeId })}
            onStartDateChange={(startDate) => updateDraft(draft.id, { startDate })}
            onDueDateChange={(dueDate) => updateDraft(draft.id, { dueDate })}
            onReject={() => openRejectDialog(draft.id)}
            teamOptions={review.isOwnerMeeting ? review.teamOptions : undefined}
            onTeamChange={(teamId) => handleTeamChange(draft.id, teamId)}
            rejectReason={rejectedReasons[draft.id] ?? null}
            onUnreject={() => unrejectDraft(draft.id)}
            hasAttemptedConfirm={hasAttemptedConfirm}
          />
        ))}

        {/* ⚠️ 오너 회의는 부서 옵션을 실어 보낸다 — BE #476/PR #477 머지로 [액션 직접 추가]도 열림 */}
        {isAddingManual ? (
          <ManualDraftForm
            assigneeOptions={review.assigneeOptions}
            teamOptions={review.isOwnerMeeting ? review.teamOptions : undefined}
            defaultDueDate={needsReview[0]?.dueDate ?? highConfidence[0]?.dueDate ?? ""}
            onAdd={addManualDraft}
            onCancel={() => setIsAddingManual(false)}
          />
        ) : (
          <div className="border-border border-t px-7 py-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddingManual(true)}
            >
              + 액션 직접 추가
            </Button>
          </div>
        )}
      </ActionReviewGroup>

      <div className="flex items-center justify-end gap-3">
        {/*
          왜 잠겼는지 버튼 옆에서 말한다 — 눌리지 않는 버튼만 두면 고장으로 읽힌다(§정직성).
          ⚠️ 필수 입력 누락이 우선순위가 더 높다(제목·설명·마감은 담당자보다 먼저 채워야 하는
             기본 필드) — 두 안내가 동시에 뜰 수는 있지만 하나만 뜰 상황에선 이쪽을 앞세운다.
          ⚠️ **버튼은 잠그지 않는다**(2026-08-20). 잠기면 "왜 안 눌리지" 하고 뭘 채워야 할지
             찾아 헤매게 된다 — 눌러 보면 비어 있는 필드가 즉시 빨갛게 강조되도록 승격한다.
             안내 문구는 그때 함께 붉게 뜬다(§정직성 · §DESIGN 5).
        */}
        {hasAttemptedConfirm && hasMissingRequired ? (
          <p className="text-destructive text-[12px] leading-4">
            제목·세부 내용·마감일이 비어 있는 액션이 있습니다. 빨갛게 표시된 자리를 채워 주세요.
          </p>
        ) : hasUnassigned ? (
          <p className="text-muted-foreground text-[12px] leading-4">
            {assignmentTargetLabel} 미정인 액션이 있습니다. {assignmentTargetLabel}를 지정해 주세요.
          </p>
        ) : null}
        <Button
          type="button"
          disabled={activeDrafts.length === 0 || hasUnassigned}
          className="bg-foreground text-background hover:bg-foreground/90"
          onClick={() => {
            /*
              ⚠️ 필수 필드가 비어 있으면 모달을 열지 않고 그 자리에서 빨간 강조로 안내한다 —
                 모달까지 열었다가 튕기면 사용자는 "왜 실패?"에 답을 못 찾는다(§정직성).
            */
            if (hasMissingRequired) {
              setHasAttemptedConfirm(true);
              return;
            }
            setConfirmOpen(true);
          }}
        >
          액션 분배 확정
        </Button>
      </div>

      <RejectReasonDialog
        isOpen={isRejectOpen}
        onOpenChange={(open) => !open && setIsRejectOpen(false)}
        actionTitle={rejectTitle}
        reason={pendingReason}
        onReasonChange={setPendingReason}
        onConfirm={confirmReject}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setConfirmError(null);
            setIsBlocked(false);
          }
        }}
        title="액션 분배를 확정할까요?"
        description={
          <>
            총 {activeDrafts.length}건의 액션이 지금 화면에 보이는 {assignmentTargetLabel}·일정
            그대로 하달됩니다.
            <br />
            확정 뒤에는 이 화면을 다시 열 수 없습니다.
          </>
        }
        confirmLabel={isBlocked ? "그래도 확정" : "확정"}
        isPending={isPending}
        pendingLabel="확정 중"
        error={confirmError}
        onConfirm={() => handleConfirm(isBlocked)}
      />
    </div>
  );
}
