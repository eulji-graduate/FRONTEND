/**
 * AI 액션 분배 리뷰 화면(`/app/meeting/:id/review`)의 **UI 계약**(CLAUDE.md §Mock 격리막).
 *
 * ⚠️ 회의 종료 → AI 요약은 여기 오기 전 **초안**까지다. 실제 액션(팀/개인)은 이 화면에서
 *    [액션 분배 확정]을 눌러야 생긴다(CLAUDE.md §브라우저 API). 반려(✕)한 항목은 안 생긴다.
 */

import type { AiConfidence } from "@/constants/meeting";

/**
 * 담당자 드롭다운 선택지 — 화면엔 "이름 직급/팀"으로 합쳐 보여준다(스크린샷 기준).
 * ⚠️ **이 회의 참석자로만 한정한다.** 회사 전체 인원이 아니다 — 회의에 없던 사람에게
 *    액션이 갈 수는 없다. 연동 시 `Meeting.attendeeIds`(features/meeting/types.ts)로
 *    걸러서 채운다(지금은 mock이라 데모 회의 참석자를 고정으로 둔다).
 */
export interface AssigneeOption {
  id: number;
  name: string;
  /** "개발팀장"처럼 이름 뒤에 붙는 라벨. 없으면 빈 문자열(예: Owner). */
  roleLabel: string;
}

/**
 * 부서 드롭다운 선택지 — Owner 개설 회의 전용(2026-08-13 팀 확정, 오너 회의 → 팀 액션 배분).
 * ⚠️ **AI가 부서를 추론하지 않는다.** 오너 회의의 참석자는 팀장으로만 제한되므로(FE #452),
 *    참석자 목록 자체가 팀별 대표 목록이다 — 그래서 옵션도 참석자에서 만든다(별도 팀 조회 API 없음).
 * ⚠️ 담당자(사람)가 아니라 **부서**가 확정 대상이다 — 팀장 이름은 화면에 안 보여준다
 *    (팀장이 바뀌어도 팀 액션은 그대로이므로, 담당 팀장은 팀 액션 화면에서 그때그때 조회한다).
 */
export interface TeamOption {
  teamId: number;
  teamName: string;
}

/** 근거 발화 — 수정 판단의 근거이므로 AI가 뽑은 항목엔 반드시 있다(WORKFLOW.md §3-4). */
export interface DraftEvidence {
  speaker: string;
  quote: string;
  /** 회의 안에서의 시각 `MM:SS` — 클릭하면 그 시점 스크립트로 이동(추후 연동). */
  timestamp: string;
}

/**
 * 액션 초안 한 건.
 *
 * ⚠️ `isManual`이면 `evidence`가 없다 — Host가 [액션 직접 추가]로 넣은 항목은
 *    회의 발화에서 뽑힌 게 아니라 근거를 달 수 없다.
 * ⚠️ `startDate`·`dueDate` 둘 다 이 화면에서 조정 가능하다(2026-08-07 팀 확정 — 보드·프로젝트
 *    상태 계산이 시작일을 쓰므로 액션도 동일 정책). [액션 분배 확정] 시점의 값이 최종이고
 *    그 뒤로 자동 변경되지 않는다.
 */
export interface AiActionDraft {
  id: string;
  title: string;
  /** 다른 액션 화면과 같은 필드(features/action/types.ts `description`) — 제목 아래 한 줄 요약. */
  description: string;
  /**
   * ⚠️ **미정이면 null**(2026-08-12, BE RVW-01 대조). AI가 담당자를 못 짚었거나 명단 밖을
   *    가리킨 액션은 "담당자 미정"으로 온다 — 숨기지 말고 사람이 고르게 보여준다(BE 주석).
   *    미정이 남아 있으면 [액션 분배 확정]이 잠긴다(BE도 `NO_ASSIGNEE`로 거른다).
   */
  assigneeId: number | null;
  /**
   * 부서(팀) — Owner 개설 회의에서만 쓰인다. `assigneeId`와 **상호 배타**다(BE
   * `REVIEW_ASSIGNEE_TEAM_CONFLICT` 422, 2026-08-13) — 확정 시 둘 중 하나만 실어 보낸다.
   * AI는 부서를 추론하지 않으므로 항상 `null`로 시작하고, 리뷰어가 이 화면에서 처음 정한다.
   */
  teamId: number | null;
  confidence: AiConfidence;
  /** ⚠️ BE가 안 내려주는 값이다 — 사람이 이 화면에서 처음 정한다(비었으면 빈 문자열). */
  startDate: string;
  dueDate: string;
  /**
   * 이 기한이 회의에서 나온 게 아니라 **프로젝트 마감일로 채워진 것**인지(BE `dueDateDefaulted`).
   * true면 "회의에서 정해지지 않음"을 함께 보여준다 — 없으면 AI가 판단한 날짜처럼 읽힌다.
   */
  isDueDateDefaulted?: boolean;
  evidence: DraftEvidence | null;
  isManual: boolean;
}

/** 리뷰 화면이 받는 조회 결과 한 판. */
export interface MeetingReviewInfo {
  meetingId: string;
  meetingTitle: string;
  /** 이 회의 개설자 — 마이페이지 "미확정 액션" 목록을 이 값으로 거른다(§3-4 "Host만 접근"). */
  hostId: number;
  projectTag: string;
  /** `8월 14일(목)` — 서버가 표기까지 만들어 보낸다(다른 화면과 동일 패턴). */
  scheduleLabel: string;
  assigneeOptions: AssigneeOption[];
  /**
   * ⚠️ **회의의 `teamId === null`로 판정한다**(BE 대조, 2026-08-13) — Owner가 개설한 회의만
   *    true. 이 값 하나로 화면 전체가 "부서 선택" 모드로 갈린다(행마다 갈리지 않는다 — 한
   *    회의 안에 팀 액션과 개인 액션이 섞이는 일은 없다).
   */
  isOwnerMeeting: boolean;
  /** Owner 회의일 때만 쓰는 부서 옵션 — 그 외엔 빈 배열. */
  teamOptions: TeamOption[];
  drafts: AiActionDraft[];
  /**
   * ⚠️ **1회성 화면 정책**(WORKFLOW.md §3-4): 이미 확정된 회의면 true — 화면이 이 값을 보고
   *    회의 상세로 리다이렉트한다(회의 상세 라우트 연동 전까지는 안내 문구로 대체).
   */
  actionsConfirmed: boolean;
}

/** 조회 결과 — 못 여는 이유까지 값으로 돌려준다(다른 화면의 `*Result` 패턴과 동일). */
export type MeetingReviewResult =
  | { kind: "ok"; review: MeetingReviewInfo }
  | { kind: "alreadyConfirmed"; meetingId: string }
  | { kind: "notHost" }
  | { kind: "notFound" };

/**
 * [액션 직접 추가]로 새 초안 행을 만들 때 필요한 최소 입력.
 * ⚠️ **`assigneeId`·`teamId` 중 정확히 하나만 채운다**(2026-08-13, BE #476/PR #477).
 *    Owner 회의는 `teamId`, 그 외엔 `assigneeId` — `ReviewValue`(RVW-02)와 같은 상호배타 규칙.
 */
export interface ManualDraftInput {
  title: string;
  description: string;
  assigneeId?: number;
  teamId?: number;
  startDate: string;
  dueDate: string;
}

/**
 * 마이페이지 "미확정 액션" 목록의 한 줄 — 회의 하나당 한 줄이다.
 * ⚠️ 회의 제목으로 구분하고, 부제는 "분배 확정지어야 할 액션 N건"이다(사용자 확정, 2026-08-07).
 */
export interface PendingReviewSummary {
  meetingId: string;
  meetingTitle: string;
  actionCount: number;
}
