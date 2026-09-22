import type { ActionStatus, ProjectStatus } from "@/constants/domain";
import type { TagColorName } from "@/lib/palette";

/**
 * 프로젝트 전체 조회(`/app/projects`)의 한 행. UI 계약(Mock → Live 격리막) — 컴포넌트는 이 타입만 안다.
 * ⚠️ 프로젝트는 전부 Owner가 개설하므로 개설자 라벨은 항상 "Owner"라 필드로 두지 않는다(상수 표시).
 */
export interface ProjectListItem {
  /** BE 자동증가 정수 PK. URL(`/app/projects/:projectId`)에는 이 값이 그대로 실린다(태그 아님). */
  id: number;
  name: string;
  /**
   * 세부 설명(기획). 실제로는 Owner가 길게 쓸 수 있는 본문이라 목록에선 **첫 줄만** 잘라 보여준다.
   * ⚠️ 목록 카드에는 요약이 아니라 원문을 그대로 내려보내고, 자르기는 화면이 `line-clamp`로 한다.
   */
  description: string;
  /** 프로젝트 태그(프로젝트당 1개 고정) — 칩에 찍히는 글자다. 색은 `tagColor`가 정한다. */
  tag: string;
  /**
   * 사용자가 프로젝트 생성 때 고른 색 — **팔레트 이름**이다(HEX가 아니다).
   *
   * ⚠️ **HEX를 계약에 담지 않는다.** 팔레트 값은 라이트·다크가 다른 CSS 변수라
   *    (`globals.css --tag-*`) hex를 들고 있으면 테마를 못 따라간다. BE가 저장하는 HEX는
   *    매퍼(`toProjectListItem`)가 `tagNameFromHex`로 되돌린다.
   */
  tagColor: TagColorName;
  /** 참여 부서명들 — 2개까지 노출 후 `+N` */
  departments: string[];
  /**
   * 이 프로젝트의 **개인 액션(리프)** 수 — 팀 액션은 세지 않는다(docs/WORKFLOW.md §1).
   * ⚠️ 팀 액션을 함께 세면 같은 일이 두 번 세어져 진척율이 실제보다 낮게 나온다
   *    (팀 액션 1건 + 그 하위 개인 액션 3건 = 4건이 아니라 3건이다).
   */
  actionTotal: number;
  /** 그중 완료(`DONE`)인 개인 액션 수 — 진척율 = `getProgressPercent(actionDone, actionTotal)`. */
  actionDone: number;
  /**
   * 시작일 `YYYY-MM-DD`. ⚠️ 화면엔 노출하지 않는다 — 상태(할 일/진행중/지연)·타임라인 계산용
   * 값일 뿐이다. 사용자가 볼 수 있는 값은 마감일뿐이다(2026-08-06 확정).
   */
  startDate: string;
  /** 마감일 `YYYY-MM-DD` */
  dueDate: string;
  status: ProjectStatus;
}

/**
 * 프로젝트 생성 폼 입력 — 화면과 서버 액션이 **같은 스키마**로 검증한다(규칙이 두 벌이면 어긋난다).
 * ⚠️ `attachmentName`은 목 단계라 파일명만 들고 있는다 — 실제 업로드는 API 스펙 확정 후.
 */
export interface ProjectDraft {
  name: string;
  tag: string;
  description: string;
  tagColor: TagColorName;
  /** 시작일 `YYYY-MM-DD` — 화면엔 노출 안 함(상태·타임라인 계산용). 생성 폼에서만 받는다. */
  startDate: string;
  dueDate: string;
  /** 참여 팀 — 최소 1개. 순서 무관, 빈 값은 제출 전 걸러낸다. */
  teamNames: string[];
  attachmentName?: string;
}

/** 칸별 검증 오류 — 비어 있으면 통과. `teamNames`는 배열이라 한 문구로 받는다. */
export type ProjectFormErrors = Partial<
  Record<keyof Omit<ProjectDraft, "teamNames" | "attachmentName">, string> & {
    teamNames: string;
  }
>;

/**
 * 첨부 업로드 1단계(발급) 결과 — UI 계약(§Mock 격리막). 컴포넌트는 이 모양만 안다.
 * ⚠️ `uploadUrl`이 `null`이면 **업로드를 건너뛴다** — mock 단계에는 올릴 곳이 없다.
 *    컴포넌트가 `isMock`을 직접 보면 격리막이 깨지므로, 분기는 이 값 하나로 접는다.
 */
export interface AttachmentUploadTicket {
  /** presigned PUT URL(15분 만료). `null`이면 브라우저 PUT 생략(목 단계). */
  uploadUrl: string | null;
  /** S3 오브젝트 키 — 확정(confirm)에 그대로 되돌린다. 브라우저로 열리는 URL이 아니다. */
  fileUrl: string;
}

/** 발급 액션 결과 — 실패 `message`는 화면에 그대로 띄울 한국어 문장(§lib/api). */
export type AttachmentIssueResult =
  { ok: true; ticket: AttachmentUploadTicket } | { ok: false; message: string };

/** 확정 액션 결과 — 발급 쪽과 같은 규약, 돌려줄 값만 없다. */
export type AttachmentConfirmResult = { ok: true } | { ok: false; message: string };

/** 삭제 액션 결과 — 확정 쪽과 같은 규약. */
export type AttachmentDeleteResult = { ok: true } | { ok: false; message: string };

/** 프로젝트 첨부파일 한 건 — 다운로드는 클릭 시점에 별도로 URL을 발급받아 연다(5분 만료). */
export interface ProjectAttachment {
  id: number;
  fileName: string;
  fileSize: number;
}

/**
 * 프로젝트 상세(`/app/projects/:projectId`)의 기획 탭. `ProjectListItem`과 필드가 겹치지만
 * 목록에 없는 첨부파일이 있어 별도 타입으로 둔다 — 목록 카드에 첨부파일까지 끌고 오지 않는다.
 * ⚠️ URL은 `id`로 다닌다(태그를 그대로 노출하지 않는다, 2026-08-06 확정) — `tag`는 화면 표시용.
 */
export interface ProjectDetail {
  /** BE 자동증가 정수 PK — `ProjectListItem.id`와 같은 값. */
  id: number;
  /** 프로젝트 태그 — 칩에 찍히는 글자다. 색은 `tagColor`가 정한다. */
  tag: string;
  /**
   * 사용자가 프로젝트 생성 때 고른 색 — **팔레트 이름**이다(HEX가 아니다).
   * ⚠️ HEX를 계약에 담지 않는다(같은 이유는 `ProjectListItem.tagColor` 주석 참고).
   */
  tagColor: TagColorName;
  name: string;
  description: string;
  dueDate: string;
  /** 참여 팀 전체 — 목록과 달리 자르지 않는다(상세라 다 보여준다) */
  teamNames: string[];
  /** 여러 개 가능(2026-08-10 다운로드 URL 발급 API 반영) — 예전엔 파일명 하나만 목 단계로 들고 있었다. */
  attachments: ProjectAttachment[];
}

/**
 * 프로젝트 상세의 타임라인 탭 한 줄 — 이 프로젝트에 속한 팀 액션 한 건.
 * ⚠️ 팀 액션 1개 = 이 프로젝트 타임라인의 막대 1개(WORKFLOW.md §1 타임라인 탭).
 */
export interface ProjectTeamAction {
  /** BE 자동증가 정수 PK(고유 id는 전부 오토 인크리먼트, 태그처럼 만들지 않는다). */
  id: number;
  name: string;
  team: string;
  /** 작업 시작일 `YYYY-MM-DD` */
  startDate: string;
  /** 마감일 `YYYY-MM-DD` */
  dueDate: string;
  status: ActionStatus;
  /**
   * 지연 배지 — **BE 판정을 그대로 쓴다**(`ProjectTimelineItemResponse.isDelayed`).
   * ⚠️ 파생값이라 저장되지 않는다. 프로젝트 타임라인은 BE가 이미 계산해 보내므로 화면이
   *    다시 계산하지 않는다 — 두 벌이면 서버·브라우저 시각이 갈리는 자정 무렵에 어긋난다.
   * ⚠️ 지금(2026-08-16) BE 판정식은 `status != DONE && dueDate < today`라 확정 규칙(진행중 &&
   *    마감 경과)과 다르다 — BE-13이 좁힌다. 그전에는 이 타임라인만 '할일 + 마감 경과'가
   *    지연으로 뜬다(로컬 계산과 결과가 다르다는 점을 매퍼 주석에 남겼다).
   */
  isDelayed: boolean;
}

/**
 * 팀 액션 상세(`/app/projects/:projectId/team/:teamActionId`)의 상세 탭.
 * ⚠️ **담당자는 저장된 값이 아니다** — BE가 그 팀의 현재 팀장을 그때그때 유도해서 채운다
 *    (2026-08-11, BACKEND PR #339). 팀장 공석이면 `assigneeName`·`assigneeRoleLabel` 둘 다 없다
 *    — 실제로 "팀장 없음"이 정상 상태라 optional이다(개인 액션 상세를 만들 때는 같은 자리에
 *    그 사람 본인 역할이 들어간다는 점만 개념이 다르다).
 */
export interface TeamActionDetail {
  /** BE 자동증가 정수 PK — `ProjectTeamAction.id`와 같은 값. */
  id: number;
  name: string;
  description: string;
  team: string;
  projectId: number;
  projectTag: string;
  /** ⚠️ 지연은 여기 없다 — 파생값이라 화면이 `isDelayed({status, dueDate})`로 계산한다(§도메인 상수). */
  status: ActionStatus;
  dueDate: string;
  /** 팀장 공석이면 없음. */
  assigneeName?: string;
  /** `"{팀명}장"` 고정 포맷(BE가 조립) — 팀장 공석이면 없음. */
  assigneeRoleLabel?: string;
  /** 이 팀 액션이 나온 프로젝트 회의 — 수동 추가 등으로 출처가 없으면 없음. 클릭 시 `/app/meeting/:id`로 이동. */
  sourceMeeting?: {
    id: number;
    title: string;
    /** ISO datetime */
    scheduledAt: string;
  };
  attachments: ProjectAttachment[];
}

/** 팀 액션 상세의 타임라인 탭 한 줄 — 이 팀 액션에 속한 개인 액션 한 건(담당자별 행). */
export interface TeamActionPersonalItem {
  /** BE 자동증가 정수 PK. */
  id: number;
  title: string;
  assigneeName: string;
  /** Leader면 "팀장" 등, 없으면 undefined(이름만 표시) */
  assigneeRoleLabel?: string;
  /** 작업 시작일 `YYYY-MM-DD` */
  startDate: string;
  /** 마감일 `YYYY-MM-DD` */
  dueDate: string;
  status: ActionStatus;
}
