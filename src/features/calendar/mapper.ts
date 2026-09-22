import { CALENDAR_ITEM_TAG, type CalendarItemTag, type PersonalCalendarEvent } from "./types";

/**
 * BE 캘린더 항목 — `GET /api/calendar` 응답 한 줄(§Mock 격리막).
 * [확인] BE PL 연동 가이드(2026-08-13, PR #457 머지 완료) — `CalendarItemResponse` 소스·테스트 대조.
 *
 * ⚠️ 판별자는 `type`이다(`tag`가 아니다) — `tag`는 PROJECT 전용 프로젝트 태그 문자열이고
 *    ACTION·TODO에서는 항상 `null`. `id`·`isDone`도 **TODO에서만** 값이 있고 PROJECT·ACTION은
 *    항상 `null`이다.
 * ⚠️ TODO의 `endDate`는 PR #459 머지로 **실제 종료일**이다(2026-08-13) — 조회도 overlap 쿼리라
 *    이전 달에 시작해 이번 달로 걸치는 Todo도 내려온다. mock의 겹침 필터(`server.ts`)와 같은 규칙.
 */
export interface BeCalendarItem {
  type: "PROJECT" | "ACTION" | "TODO";
  id: number | null;
  title: string;
  tag: string | null;
  startDate: string;
  endDate: string;
  isDone: boolean | null;
}

/** BE `type` → UI `CalendarItemTag` — 판별자 이름만 다를 뿐 값은 그대로 대응한다. */
const CALENDAR_ITEM_TAG_BY_TYPE: Record<BeCalendarItem["type"], CalendarItemTag> = {
  PROJECT: CALENDAR_ITEM_TAG.PROJECT,
  ACTION: CALENDAR_ITEM_TAG.PERSONAL_ACTION,
  TODO: CALENDAR_ITEM_TAG.PERSONAL_TODO,
};

/**
 * BE 항목 → UI 계약.
 * ⚠️ PROJECT·ACTION은 이 피드에서 id를 안 준다(BE 스펙, 항상 `null`) — 완료 토글도 없는 읽기
 *    전용 표시라 렌더링 키로만 쓰이는 합성 id로 충분하다. TODO만 완료 토글 대상이라 실 id가
 *    필요하다.
 */
export function toPersonalCalendarEvent(be: BeCalendarItem, index: number): PersonalCalendarEvent {
  const tag = CALENDAR_ITEM_TAG_BY_TYPE[be.type];
  const isTodo = be.type === "TODO";

  return {
    id: isTodo && be.id !== null ? String(be.id) : `${be.type.toLowerCase()}-${index}`,
    title: be.title,
    start: new Date(`${be.startDate}T00:00:00`),
    end: new Date(`${be.endDate}T00:00:00`),
    tag,
    isCompleted: be.isDone ?? false,
    // PROJECT만 채운다 — 프로젝트 목록과 같은 규칙(`getProjectTagColor`)으로 색을 뽑는 데 쓴다.
    projectTag: be.type === "PROJECT" && be.tag ? be.tag : undefined,
  };
}

/**
 * BE Todo 응답 — `POST /api/todos`·`PATCH /api/todos/{id}/complete` 공용 모양.
 * [확인] BE PL 연동 가이드(2026-08-13, PR #457·#459 머지 완료) — `TodoResponse` 소스 대조.
 * ⚠️ `endDate`는 요청에서 생략해도 응답엔 항상 값이 채워져 온다(`null` 없음).
 */
export interface BeTodoResponse {
  id: number;
  title: string;
  date: string;
  endDate: string;
  isDone: boolean;
}

/** `POST /api/todos` 응답 → UI 계약. 방금 만든 값이라 항상 TODO 태그·미완료로 시작한다. */
export function toPersonalCalendarEventFromTodo(be: BeTodoResponse): PersonalCalendarEvent {
  return {
    id: String(be.id),
    title: be.title,
    start: new Date(`${be.date}T00:00:00`),
    end: new Date(`${be.endDate}T00:00:00`),
    tag: CALENDAR_ITEM_TAG.PERSONAL_TODO,
    isCompleted: be.isDone,
  };
}
