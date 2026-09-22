"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { FLASH_TOAST_PARAM } from "@/constants/flash-toast";
import { requireAccessToken } from "@/features/auth/session";
import { getViewer } from "@/features/shell/viewer";
import { ApiError, serverApi, toUserMessage } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import type { PaginatedResult } from "@/lib/paginate";
import { canCreateProject, canEditProjectPlan } from "@/lib/permission";
import { isMock } from "@/mocks/config";

import type { BeIssuedUploadUrl, BeProjectSummary, ConfirmAttachmentRequestBody } from "./mapper";
import { toCreateProjectRequestBody } from "./mapper";
import { addMockProject } from "./mock/projects";
import { getProjectsPage, type ProjectListQuery, resolveTeamIds } from "./server";
import type {
  AttachmentConfirmResult,
  AttachmentDeleteResult,
  AttachmentIssueResult,
  ProjectDraft,
  ProjectFormErrors,
  ProjectListItem,
} from "./types";
import { validateAttachmentFile, validateProjectDraft } from "./validate";

const LIST_PATH = "/app/projects";
/*
  ⚠️ **만들었다는 말을 주소에 실어 보낸다.** `redirect`가 걸린 액션은 성공을 화면에 돌려주지
     못해 토스트를 띄울 자리가 없다 — 목록에 도착한 화면이 `FlashToast`로 대신 말한다.
*/
const CREATED_PATH = `${LIST_PATH}?${FLASH_TOAST_PARAM}=PROJECT_CREATED`;

/**
 * 생성 폼 결과 — `useActionState`가 그대로 들고 있는 모양.
 * ⚠️ `createdProjectId`는 **첨부파일이 있을 때만** 실려 온다. 파일은 브라우저가 S3에 직접
 *    PUT해야 해서(BE는 바이너리를 안 받는다 — [확인] `ProjectAttachmentController` 주석)
 *    액션이 `redirect`로 끝나 버리면 화면이 업로드를 이어갈 프로젝트 id를 못 받는다.
 *    파일이 없으면 기존처럼 `redirect`한다 — 이 값이 있다 = "만들어졌고, 업로드는 네 차례".
 */
export interface ProjectFormState {
  errors: ProjectFormErrors;
  createdProjectId?: number;
}

function readDraft(formData: FormData): ProjectDraft {
  return {
    name: String(formData.get("name") ?? ""),
    // ⚠️ 화면이 이미 대문자로 바꿔 보내지만, 서버는 그 처리를 신뢰하지 않고 다시 올린다.
    tag: String(formData.get("tag") ?? "").toUpperCase(),
    description: String(formData.get("description") ?? ""),
    tagColor: String(formData.get("tagColor") ?? "slate") as ProjectDraft["tagColor"],
    startDate: String(formData.get("startDate") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
    teamNames: formData.getAll("teamNames").map(String),
    attachmentName: String(formData.get("attachmentName") ?? "") || undefined,
  };
}

/**
 * 프로젝트 생성 — 격리막(CLAUDE.md §Mock 격리막).
 * ⚠️ **권한을 서버에서 다시 본다** — 화면 숨김은 UX일 뿐 보안이 아니다(§권한).
 * ⚠️ 화면과 **같은 함수**(`validateProjectDraft`)로 다시 검증한다.
 */
export async function createProjectAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const viewer = await getViewer();
  if (!canCreateProject(viewer)) return { errors: { name: "프로젝트를 생성할 권한이 없습니다" } };

  const draft = readDraft(formData);
  const errors = validateProjectDraft(draft);
  if (Object.keys(errors).length > 0) return { errors };

  /*
    ⚠️ 첨부파일이 있으면 `redirect` 대신 **만들어진 id를 화면에 되돌린다** — 업로드 3단계
       (발급→브라우저 PUT→확정)는 화면이 이어서 돈다(`use-attachment-upload.ts`).
       redirect로 끝내면 업로드를 걸 프로젝트 id가 사라진다(§ProjectFormState 주석).
  */
  const hasAttachment = formData.get("hasAttachment") === "1";
  let createdProjectId: number;

  if (!isMock) {
    const accessToken = await requireAccessToken();
    /*
      ⚠️ **`resolveTeamIds`도 실패를 잡는다**(2026-08-15, `rooms/actions.ts`의 `getMeetingRooms()`와
         같은 사고 — #553/#554/#556). BE 팀 목록 조회가 실패하면 이 호출도 예외를 던지는데,
         감싸지 않으면 이 액션 전체가 죽어 페이지가 500으로 날아간다.
    */
    let teamIds: number[];
    try {
      teamIds = await resolveTeamIds(accessToken, draft.teamNames);
    } catch {
      return { errors: { name: "팀 목록을 불러오지 못했습니다 — 잠시 후 다시 시도해 주세요" } };
    }
    const body = toCreateProjectRequestBody(draft, teamIds);

    try {
      // [확인] BE `ProjectController.create` — `ApiResponse<ProjectSummaryResponse>`로 방금
      // 만든 프로젝트를 되돌려 준다(`id` 포함). 첨부 업로드가 이 id에 걸린다.
      const created = await serverApi<BeProjectSummary>(ep.projects(), {
        method: "POST",
        json: body,
        accessToken,
      });
      createdProjectId = created.id;
    } catch (error) {
      if (error instanceof ApiError) return { errors: { name: error.message } };
      throw error;
    }
  } else {
    createdProjectId = addMockProject(draft).id;
  }

  revalidatePath(LIST_PATH);
  if (hasAttachment) return { errors: {}, createdProjectId };

  // ⚠️ `redirect`는 내부적으로 예외를 던진다 — try/catch 밖에 둔다(§렌더링·데이터)
  redirect(CREATED_PATH);
}

/**
 * 첨부 업로드 1단계 — presigned PUT URL 발급(격리막 §Mock 격리막).
 * [확인] BE `POST /api/projects/{projectId}/attachments/upload-url`
 *   (`ProjectAttachmentController.issueUploadUrl`) — 요청 `{fileName, fileSize}`
 *   (`IssueUploadUrlRequest`), 응답 `{uploadUrl, fileUrl}`(`IssuedUploadUrl`, 15분 만료).
 * ⚠️ **권한을 서버에서 다시 본다**(§권한) — BE도 OWNER/ADMIN만 받지만(`@PreAuthorize`),
 *    목 단계에는 BE가 없으니 여기서도 같은 판정을 세운다.
 * ⚠️ 실패는 던지지 않고 `message`로 돌려준다 — 던지면 error.tsx로 화면이 통째로 넘어가는데,
 *    프로젝트는 이미 만들어진 뒤라 "파일만 실패했다"를 그 자리에서 말해야 한다(§정직성).
 */
export async function issueProjectAttachmentUploadUrlAction(
  projectId: number,
  fileName: string,
  fileSize: number,
): Promise<AttachmentIssueResult> {
  const viewer = await getViewer();
  if (!canCreateProject(viewer)) return { ok: false, message: "첨부파일을 올릴 권한이 없습니다" };

  // ⚠️ 화면과 **같은 함수**로 다시 검증한다 — 화면 처리는 UX일 뿐 검증이 아니다(§권한).
  const invalid = validateAttachmentFile(fileName, fileSize);
  if (invalid) return { ok: false, message: invalid };

  if (isMock) {
    // 목 단계 — 올릴 S3가 없다. `uploadUrl: null`이 "PUT 건너뛰어라"는 신호다(UI 계약 주석).
    return { ok: true, ticket: { uploadUrl: null, fileUrl: `mock/${fileName}` } };
  }

  try {
    const accessToken = await requireAccessToken();
    const issued = await serverApi<BeIssuedUploadUrl>(ep.projectAttachmentUploadUrl(projectId), {
      method: "POST",
      json: { fileName, fileSize },
      accessToken,
    });
    return { ok: true, ticket: issued };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}

/**
 * 첨부 업로드 3단계 — 업로드 확정(메타데이터 저장).
 * [확인] BE `POST /api/projects/{projectId}/attachments/confirm`
 *   (`ProjectAttachmentController.confirm`) — 요청 `{fileName, fileUrl, fileSize}`
 *   (`ConfirmAttachmentRequest`), 같은 `fileUrl` 재확정은 기존 레코드 반환(idempotent)이라
 *   재시도로 두 번 불러도 안전하다.
 */
export async function confirmProjectAttachmentAction(
  projectId: number,
  body: ConfirmAttachmentRequestBody,
): Promise<AttachmentConfirmResult> {
  const viewer = await getViewer();
  if (!canCreateProject(viewer)) return { ok: false, message: "첨부파일을 올릴 권한이 없습니다" };

  const invalid = validateAttachmentFile(body.fileName, body.fileSize);
  if (invalid) return { ok: false, message: invalid };

  if (isMock) return { ok: true }; // 목 단계 — 저장할 곳이 없다. 성공만 흉내낸다(발급 쪽 주석 참고).

  try {
    const accessToken = await requireAccessToken();
    await serverApi(ep.projectAttachmentConfirm(projectId), {
      method: "POST",
      json: body,
      accessToken,
    });
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }

  // 확정돼야 상세(기획 탭)의 첨부 목록에 나타난다 — 그 화면의 캐시를 지운다.
  revalidatePath(`/app/projects/${projectId}`);
  return { ok: true };
}

/**
 * 프로젝트 첨부파일 삭제(교체의 첫 단계) — 화면은 [삭제] 확인 다이얼로그를 거쳐 부른다.
 * ⚠️ **OWNER 전용이다**(`canEditProjectPlan`) — BE `ProjectAttachmentController.delete`도
 *    `hasRole('OWNER')`뿐이라 업로드·확정(OWNER‖admin)보다 좁다. 화면 숨김은 UX일 뿐이라
 *    여기서 다시 검사한다(§권한).
 * ⚠️ **되돌릴 수 없다** — 화면이 파괴적 작업 확인 다이얼로그(`ConfirmDialog`)를 반드시 거친다.
 */
export async function deleteProjectAttachmentAction(
  projectId: number,
  attachmentId: number,
): Promise<AttachmentDeleteResult> {
  const viewer = await getViewer();
  if (!canEditProjectPlan(viewer)) return { ok: false, message: "첨부파일을 지울 권한이 없습니다" };

  // 목 단계 — 지울 실제 파일이 없다. 성공만 흉내낸다(업로드·확정과 같은 패턴).
  if (isMock) return { ok: true };

  try {
    const accessToken = await requireAccessToken();
    // `ApiResponse<Void>` — 다른 봉투 있는 삭제 액션과 같은 규약(구독 해지 등).
    await serverApi<void>(ep.projectAttachment(projectId, attachmentId), {
      method: "DELETE",
      accessToken,
    });
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }

  revalidatePath(`/app/projects/${projectId}`);
  return { ok: true };
}

/**
 * 첨부파일 다운로드 URL 발급 — 클릭 시점에 부른다(5분 만료라 미리 받아두면 안 된다).
 * ⚠️ mock 단계는 파일이 실제로 없어 발급할 게 없다 — 호출부가 `null`을 보고 "연동 전" 토스트를 띄운다.
 */
export async function getProjectAttachmentDownloadUrlAction(
  projectId: number,
  attachmentId: number,
): Promise<string | null> {
  if (isMock) return null;

  const accessToken = await requireAccessToken();
  const { downloadUrl } = await serverApi<{ downloadUrl: string; expiresInSeconds: number }>(
    ep.projectAttachmentDownloadUrl(projectId, attachmentId),
    { accessToken },
  );
  return downloadUrl;
}

/** 팀 액션 상세의 첨부파일 다운로드 URL 발급 — 프로젝트 쪽과 같은 패턴, 경로만 다르다. */
export async function getTeamActionAttachmentDownloadUrlAction(
  teamActionId: number,
  attachmentId: number,
): Promise<string | null> {
  if (isMock) return null;

  const accessToken = await requireAccessToken();
  const { downloadUrl } = await serverApi<{ downloadUrl: string; expiresInSeconds: number }>(
    ep.teamActionAttachmentDownloadUrl(teamActionId, attachmentId),
    { accessToken },
  );
  return downloadUrl;
}

/**
 * 프로젝트 목록의 **다음 페이지** — 무한 스크롤 훅(`useInfiniteScrollList`)이 부른다.
 * 첫 페이지는 서버 컴포넌트가 이미 렌더했다(§핵심 4원칙 ① — 여기서 다시 부르지 않는다).
 *
 * ⚠️ 실패는 **빈 페이지로 돌려주지 않는다** — 던지면 훅이 받아 [다시 시도]를 띄운다
 *    (`action/actions.ts` `fetchMyActionsPageAction`과 같은 이유, §목록 3상태).
 * ⚠️ 권한 게이트는 따로 안 건다 — 프로젝트 목록은 로그인 전원 공개이고 회사 스코프는 BE가
 *    토큰으로 자른다([확인] `ProjectController.list` — `@PreAuthorize("isAuthenticated()")`).
 * ⚠️ 거르개(상태·검색어·정렬)를 **매 페이지 같이 보낸다.** 안 보내면 2페이지부터 서버 기본
 *    조건으로 돌아와 다른 목록이 이어 붙는다.
 */
export async function fetchProjectsPageAction(
  query: ProjectListQuery,
  page: number,
): Promise<PaginatedResult<ProjectListItem>> {
  // ⚠️ `page`는 0-base다(BE 표준 확정, 2026-08-10) — NaN·Infinity·음수는 모두 0으로 당긴다.
  const safePage = Number.isFinite(page) ? Math.max(0, Math.trunc(page)) : 0;
  return getProjectsPage(query, safePage);
}
