import { PROJECT_DESCRIPTION_MAX_LENGTH, PROJECT_TAG_MAX_LENGTH } from "@/constants/project";
import { isReadableDate } from "@/lib/date";

import type { ProjectDraft, ProjectFormErrors } from "./types";

const TAG_PATTERN = /^[A-Z]+$/;

/**
 * 프로젝트 생성 검증 — 화면(폼)과 서버(Server Action)가 **이 함수 하나**로 본다.
 * ⚠️ 태그는 화면에서 이미 대문자로 강제 변환하지만, 서버 액션은 그 변환을 신뢰하지 않고 다시 본다
 *    (CLAUDE.md §권한: 화면 처리는 UX일 뿐 검증이 아니다).
 */
export function validateProjectDraft(draft: ProjectDraft): ProjectFormErrors {
  const errors: ProjectFormErrors = {};

  if (!draft.name.trim()) errors.name = "프로젝트명을 입력해 주세요";

  const tag = draft.tag.trim();
  if (!tag) errors.tag = "ProjectTag를 입력해 주세요";
  else if (tag.length > PROJECT_TAG_MAX_LENGTH)
    errors.tag = `ProjectTag는 영문 대문자 ${PROJECT_TAG_MAX_LENGTH}자 이내로 입력해 주세요`;
  else if (!TAG_PATTERN.test(tag)) errors.tag = "영문 대문자만 입력할 수 있습니다";

  if (!draft.description.trim()) errors.description = "세부 설명을 입력해 주세요";
  else if (draft.description.length > PROJECT_DESCRIPTION_MAX_LENGTH) {
    errors.description = `세부 설명은 ${PROJECT_DESCRIPTION_MAX_LENGTH}자를 넘을 수 없어요`;
  }

  // ⚠️ 브라우저 <input type="date"> 검증에 기대지 않는다 — 서버 액션은 폼 우회를 신뢰 안 한다.
  //    형식만이 아니라 실제 달력 날짜인지도 본다(`2026-02-30`은 정규식은 통과해도 없는 날).
  if (!draft.startDate.trim()) errors.startDate = "시작일을 선택해 주세요";
  else if (!isReadableDate(draft.startDate)) errors.startDate = "시작일 형식이 올바르지 않습니다";

  if (!draft.dueDate.trim()) errors.dueDate = "마감 기한을 선택해 주세요";
  else if (!isReadableDate(draft.dueDate)) errors.dueDate = "마감 기한 형식이 올바르지 않습니다";
  else if (!errors.startDate && draft.dueDate < draft.startDate) {
    errors.dueDate = "마감 기한은 시작일보다 앞설 수 없습니다";
  }

  if (draft.teamNames.filter((team) => team.trim()).length === 0) {
    errors.teamNames = "참여 팀을 1개 이상 지정해 주세요";
  }

  return errors;
}

/**
 * 첨부파일 검증 — 화면(파일 고른 직후)과 서버 액션(발급·확정 직전)이 **이 함수 하나**로 본다.
 * BE가 실제로 거부하는 것만 여기서 미리 막는다 — 없는 정책(용량 상한·확장자)을 지어내지 않는다
 * (최대 용량·확장자는 storage 팀 소관으로 미정 — [확인] BE `ProjectAttachmentStoragePort` 주석).
 *
 * - 0바이트: [확인] BE `IssueUploadUrlRequest`·`ConfirmAttachmentRequest`의 `@Positive fileSize`
 * - `..` 포함 파일명: [확인] BE `ProjectAttachmentService.issueUploadUrl` — s3Key 경로 조작
 *   오탐 방지로 발급 자체를 거부한다
 *
 * @returns 통과하면 `null`, 아니면 칸에 그대로 띄울 문장.
 */
export function validateAttachmentFile(fileName: string, fileSize: number): string | null {
  if (!fileName.trim()) return "파일 이름이 비어 있습니다";
  if (fileName.includes("..")) return "파일 이름에 '..'를 포함할 수 없습니다";
  if (fileSize <= 0) return "빈 파일(0바이트)은 첨부할 수 없습니다";
  return null;
}
