"use server";

import { revalidatePath } from "next/cache";

import type { ActionRejectReason } from "@/constants/meeting";
import { requireAccessToken } from "@/features/auth/session";
import { getViewer } from "@/features/shell/viewer";
import { ApiError, serverApi, toUserMessage } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { assertPermission, canOperateMeeting } from "@/lib/permission";
import { isMock } from "@/mocks/config";

import { hostIdOf, parseMeetingDetail } from "../mapper";
import { findMockMeetingReview, markMockReviewConfirmed } from "./mock/review";
import type { ManualDraftInput } from "./types";

/**
 * Host가 [확정] 누른 시점의 판정 한 건 — 반려 안 된 AI 초안이 여기 담겨 온다.
 *
 * ⚠️ **고친 칸만 `changes`에 싣는다**(2026-08-12, BE RVW-02 대조). BE는 바뀐 필드를 보고
 *    `WRONG_ASSIGNEE` 같은 라벨을 자동으로 만들어 AI 학습 재료로 쓴다 — 안 고친 값까지
 *    "고쳤다"고 보내면 **틀린 배정을 AI에게 가르치는 셈**이다. `changes`가 비면 CONFIRM,
 *    있으면 MODIFY로 나간다.
 * ⚠️ `plannedStartDate`는 `changes` 밖이다 — AI가 내지 않는 값이라 "고침"이 아니라
 *    "사람이 처음 정함"이고, CONFIRM에도 실을 수 있다(BE가 검사에서 일부러 뺐다).
 */
export interface ReviewedDraftInput {
  /** BE `actionId` 문자열 */
  id: string;
  /** 정했을 때만 — 빈 값이면 안 보낸다 */
  plannedStartDate?: string;
  changes?: {
    title?: string;
    description?: string;
    assigneeId?: number;
    /**
     * 부서(팀) — Owner 회의 전용, `assigneeId`와 상호 배타다(2026-08-13, BE
     * `REVIEW_ASSIGNEE_TEAM_CONFLICT` 422). 화면이 모드로 갈라 보내므로 둘 다 오는 일은 없다.
     */
    teamId?: number;
    dueDate?: string;
  };
}

/** ✕로 뺀 초안 — 사유를 남긴다(WORKFLOW.md §3-4, AI 피드백용 라벨이 된다). */
export interface RejectedDraftInput {
  id: string;
  reason: ActionRejectReason;
}

export interface ConfirmActionDistributionPayload {
  reviewed: ReviewedDraftInput[];
  rejected: RejectedDraftInput[];
  /** ⚠️ `localId`를 함께 보낸다 — 만든 결과를 화면의 그 초안과 맞춰 주기 위해서다 */
  manuallyAdded: (ManualDraftInput & { localId: string })[];
}

/**
 * 직접 추가한 초안이 서버에서 받은 id — **화면이 로컬 초안을 이 id로 갈아 끼운다.**
 *
 * ⚠️ **재시도 이중 생성을 막는 자리다**(2026-08-13, 코드래빗 지적). ③에서 액션을 만든 뒤
 *    ④가 409로 멈추면 화면은 같은 payload를 들고 있다 — [그래도 확정]을 누르는 순간 ③이
 *    다시 돌아 **같은 액션이 하나 더 생긴다.** 성공·실패와 무관하게 "여기까지 만들었다"를
 *    돌려주면, 화면이 그 초안을 서버 id로 바꿔 다음 시도에서는 판정(②)으로만 나간다.
 */
export interface CreatedManualDraft {
  /** 화면이 들고 있던 로컬 id(`manual-…`) */
  localId: string;
  /** BE가 만든 실제 액션 id */
  actionId: number;
}

/** 어떤 결과든 **여기까지 서버에 만든 것**을 함께 돌려준다 — 재시도가 겹쳐 만들지 않게 */
interface CreatedManuals {
  createdManuals: CreatedManualDraft[];
}

export type ConfirmActionDistributionResult = CreatedManuals &
  (
    | { status: "confirmed"; createdCount: number; skippedCount: number }
    | { status: "alreadyConfirmed" | "notFound"; createdCount: 0 }
    /** 확인되지 않은 STT 구간 등으로 BE가 확정을 멈췄다(409) — `force`로만 강행한다 */
    | { status: "blocked"; message: string }
    | { status: "failed"; message: string }
  );

/** BE RVW-05 응답 — [확인] `DistributionConfirmResponse.java` */
interface BeDistributionConfirm {
  dispatchedCount: number;
  dispatchedAt: string | null;
  /** reason: `STILL_PENDING` · `REJECTED` · `NO_ASSIGNEE` · `ALREADY_DISPATCHED` */
  skipped: { actionId: number; reason: string }[];
}

/**
 * [액션 분배 확정] — 반려 안 된 초안 + 직접 추가한 항목으로 실제 팀/개인 액션을 생성한다.
 * ⚠️ **되돌릴 수 없다**(1회성 화면 정책, WORKFLOW.md §3-4) — 확정 뒤 이 화면에 다시 못 들어온다.
 * ⚠️ **화면은 확정 전까지 전부 로컬 상태다**(팀 확정 2026-08-10 "자동 반영 완료 로직 폐기").
 *    BE는 항목별 판정(RVW-02)을 따로 받는 모델이라, 이 액션이 확정 시점에 **판정 → 추가 →
 *    확정을 순서대로 대신 보낸다** — UX는 팀 확정대로 두고 API 계약만 맞춘다.
 * ⚠️ **중간에 끊겨도 다시 누르면 이어진다.** 판정(①②)을 다시 보내면 라벨 행이 하나 더 쌓일 뿐
 *    값이 어긋나지는 않는다(BE 주석).
 * ⚠️ **직접 추가(③)만은 다르다** — 다시 보내면 액션이 하나 더 생긴다. 그래서 만든 id를
 *    `createdManuals`로 돌려주고, 화면이 그 초안을 서버 id로 갈아 끼워 다음 시도에서는
 *    ②(판정)로만 나가게 한다. 반려해 둔 항목을 재조회가 걸러 주는 건 **확정에 성공해
 *    화면을 다시 연 경우**뿐이라, 409로 멈춘 자리에서는 이 교체가 유일한 방어다.
 */
export async function confirmActionDistributionAction(
  meetingId: string,
  payload: ConfirmActionDistributionPayload,
  options?: { force?: boolean },
): Promise<ConfirmActionDistributionResult> {
  if (isMock) return confirmMockDistribution(meetingId, payload);

  const accessToken = await requireAccessToken();
  const id = Number(meetingId);

  /*
    ⚠️ **여기서도 Host인지 본다**(2026-08-13, 코드래빗 지적). 화면은 Host에게만 열리지만
       Server Action은 **주소만 알면 부를 수 있다**(§권한: 화면 숨김은 보안이 아니다) —
       BE는 확정(④)만 403으로 막고 판정·반려·추가(①②③)는 참석자 전원에게 열려 있어,
       가드가 없으면 참석자가 남의 회의 초안을 반려하거나 액션을 만들 수 있었다.
    ⚠️ 목 경로(`confirmMockDistribution`)의 `assertPermission`과 **같은 기준**이다 —
       판정이 두 벌이면 목과 실서버가 다른 사람을 막는다.
  */
  try {
    const detail = parseMeetingDetail(await serverApi<unknown>(ep.meeting(id), { accessToken }));
    if (!canOperateMeeting(await getViewer(), { ownerId: hostIdOf(detail) })) {
      return {
        status: "failed",
        message: "이 회의의 담당자만 확정할 수 있습니다",
        createdManuals: [],
      };
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { status: "notFound", createdCount: 0, createdManuals: [] };
    }
    return { status: "failed", message: toUserMessage(error), createdManuals: [] };
  }

  /* 여기까지 만든 것 — 어떤 경로로 끝나든 화면에 돌려준다(위 `CreatedManualDraft` 주석) */
  const createdManuals: CreatedManualDraft[] = [];

  try {
    /* ① 반려 — 값은 안 실린다(BE가 무시한다). 사유 코드만 판정으로 남는다. */
    for (const rejected of payload.rejected) {
      await serverApi(ep.meetingReviewDecision(id, Number(rejected.id)), {
        method: "PATCH",
        accessToken,
        json: { decision: "REJECT", rejectReason: rejected.reason },
      });
    }

    /* ② 판정 — 고친 칸만 MODIFY, 그대로면 CONFIRM(값 실으면 422라 changes로 가른다) */
    /*
      ⚠️ **시작일이 비거나 오늘 이하면 내일로 클램프한다**(2026-08-18 FE 방어, #637).
         BE `Action.applyHumanReview`가 `plannedStartDate`를 "익일부터 프로젝트 마감일 사이"로
         강제해서(Action.java:285-293) 오늘 이하 값이 실려 나가면 확정이 400으로 튕긴다.
         AI가 회의 당시 기준으로 뽑아 둔 값이 그대로 남아 있으면 오늘 기준으로는 과거 값이라
         그 케이스가 실제로 잡혔다(#637 발견). 프로젝트 마감일은 여기서 모르므로 상한은 못
         씌운다 — 상한 초과분은 BE 예외 문구가 사용자에게 보인다.
    */
    const plannedStartFallback = tomorrowIsoDate();
    for (const draft of payload.reviewed) {
      const changes = draft.changes ?? {};
      const plannedStartDate = clampToTomorrowOrLater(draft.plannedStartDate, plannedStartFallback);
      const value = {
        ...(changes.assigneeId !== undefined ? { assigneeMemberId: changes.assigneeId } : {}),
        ...(changes.teamId !== undefined ? { teamId: changes.teamId } : {}),
        ...(changes.dueDate !== undefined ? { dueDate: changes.dueDate } : {}),
        ...(changes.title !== undefined ? { title: changes.title } : {}),
        ...(changes.description !== undefined ? { detail: changes.description } : {}),
        plannedStartDate,
      };
      const isModify = Object.keys(changes).length > 0;

      await serverApi(ep.meetingReviewDecision(id, Number(draft.id)), {
        method: "PATCH",
        accessToken,
        json: isModify
          ? { decision: "MODIFY", value }
          : { decision: "CONFIRM", value: { plannedStartDate } },
      });
    }

    /* ③ 직접 추가 — RVW-03에는 시작일 칸이 없어, 만들어진 id로 MODIFY를 뒤따라 보낸다 */
    for (const manual of payload.manuallyAdded) {
      /*
        ⚠️ **`assigneeMemberId`·`teamId` 상호 배타**(2026-08-13, BE #476/PR #477) — 폼이 모드별로
           둘 중 하나만 채워 보내므로 여기서도 그대로 하나만 싣는다(ManualDraftInput 주석).
      */
      const added = await serverApi<{ actionId: number }>(ep.meetingReviewAddAction(id), {
        method: "POST",
        accessToken,
        json: {
          ...(manual.teamId !== undefined
            ? { teamId: manual.teamId }
            : { assigneeMemberId: manual.assigneeId }),
          title: manual.title,
          detail: manual.description,
          dueDate: manual.dueDate,
          evidenceTranscriptId: null,
        },
      });
      /* ⚠️ **만들자마자 적는다.** 뒤 호출이 실패해도 "이건 이미 만들어졌다"가 남아야 한다 */
      createdManuals.push({ localId: manual.localId, actionId: added.actionId });

      /* 시작일도 ② 판정 쪽 클램프와 같은 규칙 — 오늘 이하면 내일로 채운다(#637). */
      const plannedStartDate = clampToTomorrowOrLater(manual.startDate, plannedStartFallback);
      await serverApi(ep.meetingReviewDecision(id, added.actionId), {
        method: "PATCH",
        accessToken,
        json: { decision: "MODIFY", value: { plannedStartDate } },
      });
    }

    /* ④ 확정 — 여기서부터 액션이 각자의 보드로 나간다. Host 아니면 BE가 403으로 막는다. */
    const result = await serverApi<BeDistributionConfirm>(
      ep.meetingReviewConfirm(id, options?.force ?? false),
      { method: "POST", accessToken },
    );

    revalidatePath(`/app/meeting/${meetingId}/review`);
    revalidatePath(`/app/meeting/${meetingId}`);

    /* 전부 "지난 확정에서 이미 나감"이면 다른 탭이 먼저 확정한 것이다 */
    const alreadyDispatched =
      result.dispatchedCount === 0 &&
      result.skipped.length > 0 &&
      result.skipped.every((skip) => skip.reason === "ALREADY_DISPATCHED");
    if (alreadyDispatched) {
      return { status: "alreadyConfirmed", createdCount: 0, createdManuals };
    }

    return {
      status: "confirmed",
      createdManuals,
      createdCount: result.dispatchedCount,
      /*
        ⚠️ 반려(`REJECTED`)는 **의도한 제외**라 세지 않는다. 남는 건 미검토·담당자 미정처럼
           사람이 몰랐을 수 있는 것들이다 — 조용히 넘기면 검토가 끝난 줄 알고 화면을 닫는다
           (BE 주석: "skipped가 절반이다").
      */
      skippedCount: result.skipped.filter((skip) => skip.reason !== "REJECTED").length,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404) return { status: "notFound", createdCount: 0, createdManuals };
      /* 확인되지 않은 STT 구간·미검토가 남았다 — 사람이 알고 강행할지 정한다(§정직성) */
      if (error.status === 409)
        return { status: "blocked", message: composeConfirmFailureMessage(error), createdManuals };
    }
    return { status: "failed", message: composeConfirmFailureMessage(error), createdManuals };
  }
}

/**
 * 확정 실패 문구 — BE가 표준 에러 포맷(`details: [{field, reason}]`)에 사유 코드를 담아 준다
 * (2026-08-18 BE 협의). 한글 라벨만 갈아 끼워 **"어느 단계가 성공했다"는 티는 안 낸다** —
 * 판정·추가는 트랜잭션이 별개라 일부가 이미 커밋됐어도 재조회에서 이미 반영됨 상태로 다시
 * 얹혀 나오므로, 사용자에게는 남은 원인만 보여 준다(§정직성).
 */
const CONFIRM_FAILURE_LABEL: Record<string, string> = {
  STILL_PENDING: "미검토 액션",
  UNRESOLVED_GAP: "미확인 발화 구간",
};

/** YYYY-MM-DD의 "내일" — 조회 폴백(`action/mapper.ts`)과 방향이 같다(§할일 칸으로 떨어지게). */
function tomorrowIsoDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

/**
 * 시작일이 비어 있거나 오늘 이하면 내일(`fallback`)로 밀어 준다.
 * ISO YYYY-MM-DD는 문자열 비교가 곧 시각 비교라 `Date` 파싱 없이 그대로 가른다.
 */
function clampToTomorrowOrLater(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return value < fallback ? fallback : value;
}

function composeConfirmFailureMessage(error: unknown): string {
  if (!(error instanceof ApiError) || !error.details || error.details.length === 0) {
    return toUserMessage(error);
  }
  const parts = error.details.map((detail) => {
    const label = CONFIRM_FAILURE_LABEL[detail.field] ?? detail.field;
    return detail.reason ? `${label} ${detail.reason}` : label;
  });
  return `분배를 처리하던 중 문제가 발생했습니다. 사유: ${parts.join(", ")}`;
}

/** 목 — 기존 흐름 그대로. 권한 재검사까지 목 경로에서도 같은 함수로 한다(§권한). */
async function confirmMockDistribution(
  meetingId: string,
  payload: ConfirmActionDistributionPayload,
): Promise<ConfirmActionDistributionResult> {
  const review = findMockMeetingReview(meetingId);
  if (!review) return { status: "notFound", createdCount: 0, createdManuals: [] };

  const viewer = await getViewer();
  assertPermission(canOperateMeeting(viewer, { ownerId: review.hostId }));

  if (review.actionsConfirmed)
    return { status: "alreadyConfirmed", createdCount: 0, createdManuals: [] };

  markMockReviewConfirmed(meetingId);

  revalidatePath(`/app/meeting/${meetingId}/review`);
  revalidatePath(`/app/meeting/${meetingId}`);

  return {
    status: "confirmed",
    createdCount: payload.reviewed.length + payload.manuallyAdded.length,
    skippedCount: 0,
    /* 목은 서버에 만드는 것이 없다 — 갈아 끼울 id도 없다 */
    createdManuals: [],
  };
}
