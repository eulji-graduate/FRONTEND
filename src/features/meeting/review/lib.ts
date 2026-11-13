import type { AiActionDraft, AssigneeOption } from "./types";

/**
 * 확정 전에 꼭 채워야 하는 칸이 비었는지 — **제목·마감일**만 본다.
 * ⚠️ 세부 내용은 보지 않는다(#37). BE가 `detail`을 비워도 받는다 — 화면만 막으면 AI가 비워 둔
 *    액션을 하나하나 채워야 확정된다.
 */
export function isMissingRequired(draft: Pick<AiActionDraft, "title" | "dueDate">): boolean {
  return draft.title.trim().length === 0 || draft.dueDate.length === 0;
}

/** "김서준 개발팀장"처럼 이름 뒤에 역할 라벨을 붙인다. 없으면 이름만. */
export function formatAssigneeLabel(option: AssigneeOption): string {
  return option.roleLabel ? `${option.name} ${option.roleLabel}` : option.name;
}

/**
 * 시작일 달력의 최소 선택값 — 오늘 이후만 허용한다(#637).
 * ⚠️ BE `Action.applyHumanReview`가 `plannedStartDate`를 "익일부터 프로젝트 마감일 사이"로
 *    강제한다(Action.java:285-293). 오늘 이하 값을 실어 보내면 확정이 400으로 튕겨서
 *    사용자에겐 "입력값이 올바르지 않습니다"만 뜬다 — 달력에서 미리 막는다.
 */
export function reviewStartDateMin(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}
