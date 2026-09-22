import type { Authority } from "@/constants/authority";
import { requiresParentTeamAction } from "@/lib/permission";

import type { OnlineMeetingDraft, OnlineMeetingFormErrors } from "./types";

/**
 * 비대면 회의 만들기 폼 검증(이슈 #473) — `rooms/validate.ts`의 `validateRoomReservationDraft`와
 * **같은 규칙**을 쓰되 회의실·날짜·시작 시각 검사만 뺀다(잡을 시간 자체가 없다). 화면(모달)과
 * 서버(Server Action)가 이 함수 하나로 본다.
 * ⚠️ **참조 무결성도 여기서 안 본다** — `projectId`가 실제로 존재하는지, 골라 낸
 *    `parentTeamActionId`가 진짜 그 프로젝트·그 팀의 것인지는 `actions.ts`가 목/실서버 조회
 *    뒤에 따로 확인한다(§권한: 화면 숨김은 UX일 뿐 보안이 아니다). 여기는 **형식**만 본다.
 * @param host "상위 팀 액션" 필수 여부는 회의를 여는 사람의 권한에 달렸다(`requiresParentTeamAction`,
 *   WORKFLOW.md §3-1) — Owner면 이 필드가 없어도 되고, Leader/Member면 반드시 있어야 한다.
 */
export function validateOnlineMeetingDraft(
  draft: OnlineMeetingDraft,
  host: { role: Authority },
): OnlineMeetingFormErrors {
  const errors: OnlineMeetingFormErrors = {};

  if (!draft.title.trim()) errors.title = "회의 제목을 입력해 주세요";

  // ⚠️ 프로젝트는 항상 필수다(WORKFLOW.md §3-1 확정) — 프로젝트에 안 묶인 회의는 없다.
  // ⚠️ **숫자여야 한다** — `toCreateOnlineMeetingPayload`가 `Number()`로 그대로 바꿔 보낸다.
  //    여기서 막지 않으면 `"abc"` 같은 값이 `NaN`으로 바뀌어 그 사실을 모른 채 서버로 나간다.
  if (!draft.projectId.trim()) {
    errors.projectId = "프로젝트를 선택해 주세요";
  } else if (!Number.isInteger(Number(draft.projectId))) {
    errors.projectId = "프로젝트 값이 올바르지 않습니다";
  }

  if (draft.topics.length === 0 || !draft.topics[0]?.main.trim() || !draft.topics[0]?.sub.trim()) {
    errors.topics = "회의 안건(대주제·소주제)을 한 쌍 이상 입력해 주세요";
  } else if (draft.topics.some((topic) => !topic.main.trim() || !topic.sub.trim())) {
    errors.topics = "빈 안건 칸을 채우거나 삭제해 주세요";
  }

  // ⚠️ Owner가 개설하면 이 필드가 아예 없다(= 프로젝트 회의) — Leader/Member면 반드시 있어야
  //    한다(= 팀 액션 회의, WORKFLOW.md §3-1 "상위 팀 액션 노출 조건").
  if (requiresParentTeamAction(host)) {
    if (!draft.parentTeamActionId) errors.parentTeamActionId = "상위 팀 액션을 선택해 주세요";
  } else if (draft.parentTeamActionId !== undefined) {
    // ⚠️ Owner는 반대로 이 필드를 아예 못 넣는다 — Owner 개설 회의(프로젝트 회의)엔 상위 팀
    //    액션 개념이 없다(WORKFLOW.md §2). 폼이 조작돼 값이 들어와도 여기서 막는다.
    errors.parentTeamActionId = "Owner가 개설하는 회의에는 상위 팀 액션을 지정할 수 없습니다";
  }

  if (draft.attendeeIds.length === 0) {
    errors.attendeeIds = "참석자를 한 명 이상 선택해 주세요";
  } else if (draft.attendeeIds.some((id) => !Number.isInteger(id))) {
    errors.attendeeIds = "참석자 값이 올바르지 않습니다";
  }

  // ⚠️ 단일 모달로 바뀌며 녹음 파일이 선택이 아니라 등록의 일부가 됐다(2026-08-14 계약 변경).
  if (!draft.recording) errors.recording = "녹음 파일을 첨부해 주세요";

  return errors;
}
