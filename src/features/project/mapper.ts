import type { ActionStatus, ProjectStatus } from "@/constants/domain";
import { hexFromTagName, tagNameFromHex } from "@/lib/palette";

import type {
  ProjectAttachment,
  ProjectDetail,
  ProjectDraft,
  ProjectListItem,
  ProjectTeamAction,
} from "./types";

/**
 * BE shape → UI 계약 (§Mock 격리막 — 흡수하는 곳은 여기 하나다).
 * [확인] 잇다(Z) REST API 연동 가이드 최종본(2026-08-10) + BACKEND 실코드 대조
 *   `project/presentation/api/response/{ProjectSummaryResponse,ProjectDetailResponse}.java`
 */

/** [확인] `ProjectSummaryResponse` */
export interface BeProjectSummary {
  id: number;
  tag: string;
  color: string;
  name: string;
  /** 목록 카드 첫 줄 요약용 — 2026-08-11 이홍근 요청으로 추가됨. */
  description: string;
  status: ProjectStatus;
  /** 마이그레이션 이전 생성 프로젝트는 `null` — 채울 원천이 없다. */
  startDate: string | null;
  dueDate: string;
  teamCount: number;
  actionCount: number;
  completedActionCount: number;
  meetingCount: number;
  /**
   * ⚠️ **FE는 안 쓴다**(소수 값이다). 진척율 표시는 `getProgressPercent(actionDone, actionTotal)`가
   *    만든다 — 반올림·소수점 없음 규칙이 FE 몫이라 두 벌로 두지 않는다(`toProjectListItem`
   *    위 주석 참고).
   */
  progressPct: number;
  /** 생성·수정 응답에서는 항상 빈 배열 — 실제 값은 목록 조회에서만 온다. */
  teamNames: string[];
}

/** [확인] `AttachmentResponse` */
export interface BeAttachment {
  attachmentId: number;
  fileName: string;
  /** 브라우저로 못 여는 S3 오브젝트 키 — 다운로드는 별도 발급 API를 거친다. */
  fileUrl: string;
  fileSize: number;
  createdAt: string;
}

/** [확인] `ProjectDetailResponse` */
export interface BeProjectDetail {
  id: number;
  tag: string;
  color: string;
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string | null;
  dueDate: string;
  teamIds: number[];
  attachments: BeAttachment[];
}

/**
 * [확인] `ProjectTimelineItemResponse` — **`status`는 프로젝트가 아니라 action 도메인
 * enum이다**(BE `ActionStatus`, 2026-08-18 실코드 대조). `ProjectStatus`로 잘못 선언돼 있었다 —
 * 지금은 문자열 값이 우연히 같아(`TODO`·`IN_PROGRESS`·`DONE`) TS도 조용히 통과했지만,
 * `constants/project.ts`가 "액션과 값이 같다고 재사용하지 않는다"고 못박은 그 이유 그대로
 * 이 자리도 한쪽만 값이 늘면 조용히 갈린다.
 */
export interface BeProjectTimelineItem {
  actionId: number;
  title: string;
  teamId: number;
  teamName: string;
  status: ActionStatus;
  dueDate: string;
  isDelayed: boolean;
}

/** [확인] `PageResponse<T>` — 목록 3종(project·action·team action) 공용 봉투. */
export interface BePageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

/**
 * ⚠️ **`startDate`가 `null`이면 오늘로 대신 채운다.** 보드 칸 구분(`getBoardColumn`)이
 *    `Pick<..,"startDate">`를 문자열로 가정하고 있어 `null`을 그대로 넘기면 계산이 깨진다.
 *    마이그레이션 이전에 만들어진 프로젝트라 기록이 없을 뿐이니, "이미 진행 중이었다"로 보고
 *    오늘 날짜를 넣어 진행중 칸에 들어가게 한다(할일 칸으로 잘못 떨어지는 것보다 안전한 쪽).
 */
function fallbackStartDate(startDate: string | null): string {
  return startDate ?? new Date().toISOString().slice(0, 10);
}

/**
 * ⚠️ **`be.progressPct`는 안 옮긴다 — 쓰지 않는 필드다.** 진척율의 표시 규칙(소수점 없이
 *    반올림)이 FE 몫이라(`lib.ts` `getProgressPercent`, `project-list-table.tsx`가 `%`만 쓴다)
 *    같은 숫자를 두 벌로 만들지 않으려면 한쪽을 버려야 한다. `actionCount`·`completedActionCount`
 *    두 숫자만 받아 화면이 계산하는 쪽을 정본으로 둔다 — BE 값을 표시하려면 반올림 규칙까지
 *    BE로 옮겨야 하고, 그러면 목(mock) 경로가 진척율을 못 만든다.
 * ⚠️ `actionCount`·`completedActionCount`는 **개인 액션(리프)만** 센다(docs/WORKFLOW.md §1,
 *    BE-12). 팀 액션을 함께 세면 같은 일이 두 번 세어져 진척율이 실제보다 낮게 나온다.
 */
export function toProjectListItem(be: BeProjectSummary): ProjectListItem {
  return {
    id: be.id,
    name: be.name,
    // ⚠️ 2026-08-11 해결 — ProjectSummaryResponse에 description 추가됨(이홍근 요청).
    description: be.description,
    tag: be.tag,
    /*
      ⚠️ **BE 저장 HEX → 팔레트 이름**으로 되돌린다. BE는 팔레트 키가 아니라 HEX 문자열
         그대로를 저장·반환하지만, 화면 계약은 라이트/다크 짝을 알기 위해 팔레트 이름을 쓴다.
      ⚠️ `be.color ?? ""`로 방어한다 — `tagNameFromHex`가 `hex.toUpperCase()`를 바로 부르므로
         `undefined`가 오면 TypeError를 던진다. 타입상 필수라 계약대로는 안 오지만, 서버
         컴포넌트 렌더가 그 자리에서 통째로 죽는 결과가 부담스러워 접어 둔다(§정직성).
    */
    tagColor: tagNameFromHex(be.color ?? ""),
    departments: be.teamNames,
    actionTotal: be.actionCount,
    actionDone: be.completedActionCount,
    startDate: fallbackStartDate(be.startDate),
    dueDate: be.dueDate,
    status: be.status,
  };
}

/** 팀 액션 상세(action 도메인)도 같은 `Attachment` shape을 복제해서 쓴다 — 그쪽 매퍼가 재사용한다. */
export function toProjectAttachment(be: BeAttachment): ProjectAttachment {
  return { id: be.attachmentId, fileName: be.fileName, fileSize: be.fileSize };
}

export function toProjectDetail(be: BeProjectDetail, teamNames: string[]): ProjectDetail {
  return {
    id: be.id,
    tag: be.tag,
    /* ⚠️ 목록과 같은 이유·같은 방어(위 `toProjectListItem` 주석). */
    tagColor: tagNameFromHex(be.color ?? ""),
    name: be.name,
    description: be.description,
    dueDate: be.dueDate,
    // ⚠️ 상세 응답(ProjectDetailResponse)엔 teamIds만 있고 teamNames가 없다 — 팀 목록을
    //    따로 조회해 id→이름으로 매핑한 값을 호출부가 넘긴다(server.ts 참고).
    teamNames,
    attachments: be.attachments.map(toProjectAttachment),
  };
}

export function toProjectTeamAction(be: BeProjectTimelineItem): ProjectTeamAction {
  return {
    id: be.actionId,
    name: be.title,
    team: be.teamName,
    // ⚠️ 타임라인 항목엔 startDate가 없다(팀 액션 카드는 진행률만 보여줄 뿐 기간 바가 아니다) —
    //    ActionTimeline 계약이 요구해서 마감일과 같은 값으로 채운다(막대 폭이 0이 되는 대신
    //    한 칸짜리로 보인다). 팀 액션에 startDate가 필요해지면 그때 BE에 노출을 요청한다.
    startDate: be.dueDate,
    dueDate: be.dueDate,
    status: be.status,
    /*
      ⚠️ **BE 판정을 그대로 옮긴다** — 프로젝트 타임라인은 BE `ProjectService.getTimeline`이
         이미 계산해 보낸다(같은 파일 71행에 `isDelayed`가 선언돼 있는데 지금까지 조용히
         버려지고 있었다). 두 벌이면 서버·브라우저 시각이 갈리는 자정에 어긋난다.
      ⚠️ 지금 BE 판정식은 `status != DONE && dueDate < today`라 FE 확정 규칙(진행중 && 마감
         경과)과 다르다 — BE-13이 좁힌다. 그전까지 이 타임라인만 '할일 + 마감 경과'가
         지연으로 뜬다(다른 화면은 FE 로컬 계산이라 이번 변경으로 사라진다).
    */
    isDelayed: be.isDelayed,
  };
}

/**
 * [확인] `ProjectAttachmentStoragePort.IssuedUploadUrl` — 업로드 3단계 중 1단계(발급) 응답.
 * ⚠️ `fileUrl`은 브라우저로 열리는 URL이 아니라 **S3 오브젝트 키**다(BE Port 주석) —
 *    confirm에 이 값을 그대로 되돌려 준다.
 */
export interface BeIssuedUploadUrl {
  /** presigned PUT URL(15분 만료 — [확인] `ProjectAttachmentS3StorageAdapter.UPLOAD_URL_TTL`). */
  uploadUrl: string;
  fileUrl: string;
}

/** [확인] `ConfirmAttachmentRequest` — 업로드 3단계 중 3단계(확정) 요청 바디. */
export interface ConfirmAttachmentRequestBody {
  fileName: string;
  /** 발급 응답의 `fileUrl`(S3 키) 그대로 — 다른 값이면 BE가 `ATTACHMENT_KEY_MISMATCH`로 거부한다. */
  fileUrl: string;
  fileSize: number;
}

/** 프로젝트 생성/수정 요청 바디. */
export interface CreateProjectRequestBody {
  name: string;
  tag: string;
  description: string;
  color: string;
  startDate: string;
  dueDate: string;
  teamIds: number[];
}

/**
 * 화면 계약(`ProjectDraft`) → BE 요청 바디.
 * ⚠️ `teamIds`는 호출부가 이름→id로 미리 바꿔 넘긴다(팀 이름 중복이 없다는 전제 — 지금
 *    회사 팀 목록엔 동명이 없어 괜찮지만, 생기면 이 가정부터 깨진다).
 */
export function toCreateProjectRequestBody(
  draft: ProjectDraft,
  teamIds: number[],
): CreateProjectRequestBody {
  return {
    name: draft.name,
    tag: draft.tag,
    description: draft.description,
    color: hexFromTagName(draft.tagColor),
    startDate: draft.startDate,
    dueDate: draft.dueDate,
    teamIds,
  };
}
