import { CALENDAR_ITEM_TAG, type PersonalCalendarEvent, type PersonalTodoDraft } from "../types";

/**
 * ⚠️ 목 데이터 — BE 연동 전. **서버 프로세스 메모리에만 있다**(재시작하면 초기값으로 되돌아간다).
 * Todo 작성·완료 토글 Server Action이 이 배열을 직접 바꾼다 — 실제 DB 흉내다.
 *
 * ⚠️ 상태를 `globalThis`에 매단다 — dev의 HMR로 `let`이 초기화되면 방금 만든 Todo가 사라진다.
 *    (BE가 붙으면 이 파일은 사라지고 상태는 DB로 간다 — 이 트릭도 같이 사라진다.)
 */
interface CalendarStore {
  events: PersonalCalendarEvent[];
  sequence: number;
}

const INITIAL: PersonalCalendarEvent[] = [
  {
    id: "todo-1",
    title: "주간 보고서 작성",
    start: new Date("2026-08-05T10:00:00"),
    end: new Date("2026-08-05T11:00:00"),
    tag: CALENDAR_ITEM_TAG.PERSONAL_TODO,
    isCompleted: false,
  },
  {
    id: "action-1",
    title: "회의실 예약 정책 공유",
    start: new Date("2026-08-05T14:00:00"),
    end: new Date("2026-08-08T15:00:00"),
    tag: CALENDAR_ITEM_TAG.PERSONAL_ACTION,
    isCompleted: false,
  },
  {
    id: "todo-2",
    title: "회의실 예약",
    start: new Date("2026-08-07T09:00:00"),
    end: new Date("2026-08-07T09:30:00"),
    tag: CALENDAR_ITEM_TAG.PERSONAL_TODO,
    isCompleted: true,
  },
];

const globalStore = globalThis as typeof globalThis & { __calendarStore?: CalendarStore };
const store: CalendarStore = (globalStore.__calendarStore ??= {
  events: INITIAL,
  sequence: INITIAL.length,
});

export function listMockEvents(): PersonalCalendarEvent[] {
  return store.events;
}

export function findMockEvent(id: string): PersonalCalendarEvent | null {
  return store.events.find((event) => event.id === id) ?? null;
}

/** Todo 작성 — 하루 종일 항목으로 취급(시:분 지정 없이 날짜만 받는다), 시작~끝 날짜로 기간을 가진다. */
export function addMockTodo(draft: PersonalTodoDraft): PersonalCalendarEvent {
  const event: PersonalCalendarEvent = {
    id: `todo-${++store.sequence}`,
    title: draft.title.trim(),
    start: new Date(`${draft.date}T00:00:00`),
    end: new Date(`${draft.endDate}T00:00:00`),
    tag: CALENDAR_ITEM_TAG.PERSONAL_TODO,
    isCompleted: false,
  };
  store.events = [...store.events, event];
  return event;
}

/** 완료 토글 — PERSONAL_ACTION은 보드(액션 도메인)에서 상태를 바꾼다, 여기선 TODO만 넘어온다. */
export function toggleMockCompletion(id: string): PersonalCalendarEvent | null {
  const target = findMockEvent(id);
  if (!target) return null;
  const updated: PersonalCalendarEvent = { ...target, isCompleted: !target.isCompleted };
  store.events = store.events.map((event) => (event.id === id ? updated : event));
  return updated;
}
