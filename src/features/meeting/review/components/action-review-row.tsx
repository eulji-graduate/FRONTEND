"use client";

import { CircleAlert, MessageSquareQuote, RotateCcw, Users, X } from "lucide-react";

import { DatePickerField } from "@/components/common/date-picker-field";
import { ProfileAvatar } from "@/components/common/profile-avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACTION_REJECT_REASON_LABEL,
  type ActionRejectReason,
  REVIEW_ASSIGNMENT_TARGET_LABEL,
} from "@/constants/meeting";
import { cn } from "@/lib/utils";

import { formatAssigneeLabel, reviewStartDateMin } from "../lib";
import type { AiActionDraft, AssigneeOption, TeamOption } from "../types";
import { InlineEditableField } from "./inline-editable-field";

interface ActionReviewRowProps {
  draft: AiActionDraft;
  assigneeOptions: AssigneeOption[];
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onAssigneeChange: (assigneeId: number) => void;
  onStartDateChange: (startDate: string) => void;
  onDueDateChange: (dueDate: string) => void;
  onReject: () => void;
  /**
   * Owner 개설 회의면 "부서" 드롭다운, 아니면 "담당자" 드롭다운(2026-08-13 팀 확정,
   * 오너 회의 → 팀 액션 배분). 회의 하나에 두 모드가 섞이지 않으므로 화면 전체가 같은
   * 값을 받는다(행마다 갈리지 않는다).
   */
  teamOptions?: TeamOption[];
  onTeamChange?: (teamId: number) => void;
  /**
   * 반려된 아이템은 목록에서 지우지 않고 상태로 남긴다(2026-08-18, #622).
   * 사유가 있으면 반려된 것으로 취급 — 아이템은 흐려지고 편집이 잠기며, ✕ 자리에는
   * [반려 취소]가 뜬다. 사유는 아이템 하단에 빨간 텍스트로 표시한다.
   */
  rejectReason?: ActionRejectReason | null;
  onUnreject?: () => void;
  /**
   * 확정 시도 후 필수 필드 강조 여부. 부모(`MeetingReviewView`)가 [확정] 버튼을 눌러 검증
   * 실패한 상태를 내려 주면 이 행 안의 제목·세부 내용·마감일 필드가 비어 있을 때 빨간
   * 테두리로 승격한다. 최초 진입에서는 회색 placeholder만 두고 확정 시도 뒤에야 강조한다.
   */
  hasAttemptedConfirm?: boolean;
}

/**
 * 액션 초안 한 행 — 담당자·시작일·마감일은 확정 전까지 전부 수정 가능하다
 * (WORKFLOW.md §3-4 "두 그룹 다 수정 가능(A안)").
 * ⚠️ 시작일·마감일은 **두 칸으로 나눈다**(2026-08-07 팀 확정) — 보드·프로젝트가 시작일로
 *    상태를 계산하므로 액션도 같은 값이 필요하다.
 */
export function ActionReviewRow({
  draft,
  assigneeOptions,
  onTitleChange,
  onDescriptionChange,
  onAssigneeChange,
  onStartDateChange,
  onDueDateChange,
  onReject,
  teamOptions,
  onTeamChange,
  rejectReason,
  onUnreject,
  hasAttemptedConfirm,
}: ActionReviewRowProps) {
  /* ⚠️ 모드는 이 prop 하나로 정해진다 — 부모(`MeetingReviewView`)가 회의 전체 기준으로 내려준다 */
  const isTeamMode = teamOptions !== undefined;
  const isRejected = rejectReason != null;
  /*
    ⚠️ **반려된 행은 강조 대상이 아니다**(반려는 이미 사람이 판단한 것이라 미완성 필드도
       확정 요청에 안 실린다) — `hasAttemptedConfirm`이 켜져 있어도 반려된 행은 검증에서 뺀다.
  */
  const showInvalid = Boolean(hasAttemptedConfirm) && !isRejected;
  const invalidTitle = showInvalid && draft.title.trim().length === 0;
  const invalidDescription = showInvalid && draft.description.trim().length === 0;
  const invalidDueDate = showInvalid && draft.dueDate.length === 0;
  return (
    <div
      className={cn(
        "border-border px-7 py-4 transition-colors not-first:border-t",
        isRejected
          ? /* ⚠️ 반려된 행은 흐리게 두고 배경도 옅게 — 살아있는 다른 행과 시각적으로 갈린다.
               hover도 죽여 "만질 것 없음"을 모양으로 말한다(§정직성).
             ⚠️ 조작(편집·셀렉트·날짜)은 아래에서 `pointer-events-none`으로 잠근다 —
               반려 취소 버튼만 살려 사람이 되돌릴 길을 준다. */
            "bg-muted/20"
          : "hover:bg-foreground/[0.015]",
      )}
      aria-label={isRejected ? "반려된 액션" : undefined}
    >
      {/*
        ⚠️ **두 열이다**(2026-08-11). 왼쪽은 읽는 것(이름·설명·근거), 오른쪽은 고치는 것
           (담당자·기간·반려) — 글이 조작 아래로 흘러들지 않게 열을 못 박는다.
        ⚠️ 조작은 **글 덩이 전체의 세로 가운데**다(`items-center`). 이름 줄에만 맞춰 두면
           글이 세 줄인데 조작만 맨 위에 붙어 행의 무게중심이 위로 쏠린다.
      */}
      <div className="flex items-center gap-6">
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-2",
            /* ⚠️ 반려된 초안은 편집을 잠근다(#622) — pointer-events로 클릭·포커스도 막고,
               opacity로 취소선 대신 감춰진 느낌을 준다. 취소선을 그으면 반려 사유의 빨간
               텍스트와 시각이 두 겹으로 겹쳐 지저분해진다. */
            isRejected && "pointer-events-none opacity-60",
          )}
        >
          <InlineEditableField
            value={draft.title}
            onChange={onTitleChange}
            ariaLabel="액션명"
            placeholder="액션명을 입력해 주세요"
            isInvalid={invalidTitle}
          />

          {/* ⚠️ 설명과 근거는 **한 덩이**다(gap-1) — 근거는 그 설명의 출처라 사이를 벌리지 않는다 */}
          <div className="flex min-w-0 flex-col gap-1">
            <InlineEditableField
              value={draft.description}
              onChange={onDescriptionChange}
              ariaLabel="세부 내용"
              placeholder="세부 내용을 입력해 주세요"
              multiline
              allowEmpty
              isInvalid={invalidDescription}
            />

            {/*
              ⚠️ **이모지를 안 쓴다**(§디자인 토큰). `💬`·`▶`는 기기마다 다른 그림으로 그려지고
                 글자 크기와도 안 맞는다 — 아이콘은 `lucide-react` 하나로 통일한다.
              ⚠️ 근거는 **왼쪽에 선을 세워** 인용임을 모양으로 말한다. 설명과 같은 12px 흐린
                 글자라 나란히 두면 어디까지가 우리 말이고 어디부터가 회의에서 나온 말인지 흐렸다.
            */}
            {draft.evidence && (
              <p className="border-border text-muted-foreground flex items-baseline gap-1.5 border-l-2 pl-2.5 text-[12px] leading-4 break-keep">
                <MessageSquareQuote className="size-3.5 shrink-0 translate-y-0.5" aria-hidden />
                <span className="min-w-0">
                  &ldquo;{draft.evidence.quote}&rdquo;
                  {/* 시각이 없는 발화(화자 판정 포기 등)는 가운뎃점째 감춘다 — 00:00을 지어내지 않는다 */}
                  {draft.evidence.timestamp && (
                    <span className="text-muted-foreground/70 ml-2 tabular-nums">
                      · {draft.evidence.timestamp}
                    </span>
                  )}
                </span>
              </p>
            )}

            {/*
              ⚠️ 기한이 회의에서 안 나와 **프로젝트 마감일로 채워진 액션**은 그 사실을 적는다
                 (BE `dueDateDefaulted`). 안 적으면 AI가 판단한 날짜처럼 읽혀, 고쳐야 할
                 기한을 그냥 넘긴다(§정직성).
            */}
            {draft.isDueDateDefaulted && (
              <p className="text-muted-foreground/70 text-[12px] leading-4">
                마감일은 회의에서 정해지지 않아 프로젝트 마감일로 채웠습니다
              </p>
            )}
          </div>
        </div>

        {/*
          ⚠️ 조작은 **키가 같다**(32). 셀렉트 32 · 날짜 40 · ✕ 28로 셋이 제각각이라 같은 줄인데
             중앙이 어긋나 보였다 — 날짜 칸의 높이는 공용 컴포넌트에서 바로잡았다(§DESIGN 3).
          ⚠️ 날짜 칸은 **값에 맞춘 폭**(140)이다. 연도를 뗀 뒤에도 180으로 두니 `8월 7일(금)`
             한 덩이가 칸 왼쪽에만 붙어 오른쪽이 비었다.
        */}
        {/* ⚠️ 좁아지면 줄을 바꾼다 — 셋(180+140+140)+✕는 1180px 아래에서 글 칸을 0으로 밀어냈다 */}
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {/*
            ⚠️ 반려된 초안은 조작을 통째로 잠근다(#622) — 셀렉트·날짜 편집이 다시 열리면
               "반려됐지만 여전히 손댈 수 있는" 것처럼 읽혀 상태가 흐려진다. 잠금은 이 감싸는
               div가 하고, [반려 취소] 버튼만 아래에서 따로 살려 되돌릴 길을 준다.
          */}
          <div
            className={cn(
              "flex flex-wrap items-center gap-2",
              isRejected && "pointer-events-none opacity-60",
            )}
          >
            {isTeamMode ? (
              /*
              ⚠️ **담당자가 아니라 부서를 고른다**(2026-08-13, 오너 회의 → 팀 액션 배분). 팀장
                 이름은 안 보여준다 — 팀장이 바뀌어도 팀 액션은 그대로라, 담당 팀장은 팀 액션
                 화면에서 그때그때 조회한다(`TeamActionService` 패턴, BE 쪽 담당).
            */
              <Select
                value={draft.teamId === null ? "" : String(draft.teamId)}
                onValueChange={(value) => value && onTeamChange?.(Number(value))}
              >
                <SelectTrigger
                  aria-label={`${REVIEW_ASSIGNMENT_TARGET_LABEL.TEAM} 선택`}
                  className="w-[180px]"
                >
                  <SelectValue>
                    {(value) => {
                      const option = teamOptions?.find(
                        (candidate) => String(candidate.teamId) === value,
                      );
                      if (!option)
                        return (
                          <span className="text-muted-foreground">
                            {REVIEW_ASSIGNMENT_TARGET_LABEL.TEAM} 미정
                          </span>
                        );
                      return (
                        <>
                          <Users className="size-4 shrink-0" aria-hidden />
                          <span className="truncate">{option.teamName}</span>
                        </>
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent side="bottom" alignItemWithTrigger={false}>
                  {teamOptions?.map((option) => (
                    <SelectItem key={option.teamId} value={String(option.teamId)}>
                      <Users className="size-4 shrink-0" aria-hidden />
                      {option.teamName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              /* ⚠️ 미정(null)은 빈 값으로 둔다 — String(null)은 "null"이라는 가짜 값이 된다 */
              <Select
                value={draft.assigneeId === null ? "" : String(draft.assigneeId)}
                onValueChange={(value) => value && onAssigneeChange(Number(value))}
              >
                <SelectTrigger
                  aria-label={`${REVIEW_ASSIGNMENT_TARGET_LABEL.PERSONAL} 선택`}
                  className="w-[180px]"
                >
                  {/*
                  ⚠️ **아바타를 붙인다**(2026-08-11). 이름만 늘어놓으니 다섯 줄이 회색 글자
                     덩어리였다 — 아바타는 색을 써도 되는 자리이고(§DESIGN 5), 그 사람 id에서
                     나온 색이라 목록·회의 상세에서 익힌 색과 같다. 누가 맡는지가 색으로 먼저 잡힌다.
                */}
                  <SelectValue>
                    {(value) => {
                      const option = assigneeOptions.find(
                        (candidate) => String(candidate.id) === value,
                      );
                      /* AI가 못 짚었거나 명단 밖을 가리킨 액션 — 숨기지 말고 미정으로 보여준다(매퍼 주석) */
                      if (!option)
                        return (
                          <span className="text-muted-foreground">
                            {REVIEW_ASSIGNMENT_TARGET_LABEL.PERSONAL} 미정
                          </span>
                        );
                      return (
                        <>
                          <ProfileAvatar userId={option.id} size={18} />
                          <span className="truncate">{formatAssigneeLabel(option)}</span>
                        </>
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent side="bottom" alignItemWithTrigger={false}>
                  {assigneeOptions.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      <ProfileAvatar userId={option.id} size={18} />
                      {formatAssigneeLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <DatePickerField
              aria-label="시작일"
              value={draft.startDate}
              min={reviewStartDateMin()}
              max={draft.dueDate}
              onChange={onStartDateChange}
              className="w-[140px]"
            />
            <DatePickerField
              aria-label="마감일"
              value={draft.dueDate}
              min={draft.startDate}
              onChange={onDueDateChange}
              aria-invalid={invalidDueDate || undefined}
              className={cn(
                "w-[140px]",
                // ⚠️ 확정 시도 후 비어 있으면 빨간 테두리로 승격 — 다른 필수 필드(제목·세부)와
                //    같은 시각으로 잡아야 사용자가 어디를 채워야 하는지 한눈에 짚는다.
                invalidDueDate && "border-destructive text-destructive",
              )}
            />
          </div>

          {/*
            ⚠️ **반려 상태에 따라 버튼이 갈린다**(#622). 활성 상태에서는 ✕(반려 다이얼로그
               열기), 반려 상태에서는 [반려 취소]로 되돌린다. 아이콘·라벨을 통째로 바꿔
               같은 자리에서 다른 조작임을 분명히 한다(색은 안 쓴다 — DESIGN §5, 색은 에러 자리).
          */}
          {isRejected ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="반려 취소"
              onClick={onUnreject}
            >
              <RotateCcw aria-hidden />
              반려 취소
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="이 액션 반려"
              onClick={onReject}
            >
              <X />
            </Button>
          )}
        </div>
      </div>

      {/*
        ⚠️ **반려 사유는 행 하단에 빨간 텍스트로**(#622). 색을 쓸 수 있는 자리는 에러뿐이라
           (DESIGN §5) `--destructive`를 그대로 쓴다. 아이콘 하나로 "이유가 붙어 있음"을
           모양으로도 알린다 — 스크린리더도 `role="status"`로 상태 변화를 읽는다.
      */}
      {isRejected && (
        <div
          role="status"
          className="text-destructive mt-3 flex items-center gap-1.5 pl-[6px] text-[12px] leading-4"
        >
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0">반려됨 · {ACTION_REJECT_REASON_LABEL[rejectReason]}</span>
        </div>
      )}
    </div>
  );
}
