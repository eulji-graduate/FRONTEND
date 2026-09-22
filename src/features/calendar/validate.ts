import { isValid, parse } from "date-fns";

import type { PersonalTodoDraft, PersonalTodoFormErrors } from "./types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 제목 **20자**까지.
 *
 * ⚠️ 개인 Todo는 **상세 화면이 없다** — 제목 줄이 곧 전부다. 그래서 오른쪽 일정 목록에서는
 *    **한 줄에 전부 보이는 길이**로 막는다. 목록에서까지 잘리면 전문을 볼 자리가 어디에도 없다.
 * ⚠️ 20자는 **재서 나온 값**이다(2026-08-08). 일정 카드 360px에서 제목이 쓰는 폭은 244px이고,
 *    13px 한글은 한 자에 약 11.3px다 — 20자 225px(19px 여유) · 21자 236px · **22자 247px로 넘친다.**
 *    폭이 바뀌면 이 값도 다시 재야 한다.
 * ⚠️ 40 → 30 → 20으로 줄여 왔다. 40·30은 두 줄을 전제한 값이었는데, 두 줄로 흘리면 글자 폭에
 *    따라 카드 높이가 줄마다 달라져 목록이 들쭉날쭉했다.
 * ⚠️ 화면에서 `maxLength`로 막고 여기서도 본다 — 입력칸을 거치지 않는 요청이 있다.
 */
export const PERSONAL_TODO_TITLE_MAX = 20;

/** "YYYY-MM-DD" 형식이면서 실제로 있는 날짜인지(2월 30일 같은 값은 걸러낸다). */
function isValidCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  return isValid(parse(value, "yyyy-MM-dd", new Date()));
}

/**
 * 개인 Todo 작성 검증 — 제목·날짜 필수.
 * ⚠️ 화면(폼)과 서버(Server Action)가 **이 함수 하나**로 본다 — 규칙이 두 벌이면 반드시 어긋난다.
 */
export function validatePersonalTodoDraft(draft: PersonalTodoDraft): PersonalTodoFormErrors {
  const errors: PersonalTodoFormErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = "제목을 입력해 주세요";
  else if (title.length > PERSONAL_TODO_TITLE_MAX)
    errors.title = `제목은 ${PERSONAL_TODO_TITLE_MAX}자까지 입력할 수 있습니다`;

  if (!draft.date.trim()) errors.date = "시작 날짜를 선택해 주세요";
  else if (!isValidCalendarDate(draft.date)) errors.date = "올바른 시작 날짜가 아닙니다";

  if (!draft.endDate.trim()) errors.endDate = "끝 날짜를 선택해 주세요";
  else if (!isValidCalendarDate(draft.endDate)) errors.endDate = "올바른 끝 날짜가 아닙니다";
  else if (!errors.date && draft.endDate < draft.date)
    errors.endDate = "끝 날짜는 시작 날짜보다 이전일 수 없습니다";

  return errors;
}
