import { AUTHORITY, type Authority } from "@/constants/authority";
import { addMockMeeting } from "@/features/meeting/mock/meetings";
import type { MeetingDraft, MeetingTopic } from "@/features/meeting/types";
import { TOP_LEVEL_PROJECTS } from "@/features/project/mock/projects";
import { type Actor, requiresParentTeamAction } from "@/lib/permission";

import { RESERVATION_DURATION_MINUTES } from "../constants";
import type { RoomReservation, RoomReservationDraft } from "../types";
import { findMockRoom } from "./rooms";

/**
 * ⚠️ 목 데이터 — BE 연동 전. **서버 프로세스 메모리에만 있다**(재시작하면 초기값으로 되돌아간다).
 * 예약 생성 Server Action이 이 배열을 직접 바꾼다 — 실제 DB 흉내다.
 * ⚠️ 상태를 `globalThis`에 매단다 — dev의 HMR로 `let`이 초기화되면 방금 만든 예약이 사라진다
 *    (개인 캘린더 목과 같은 트릭, `calendar/mock/events.ts`).
 */
interface ReservationStore {
  reservations: RoomReservation[];
  sequence: number;
}

/**
 * 오늘(2026-08-06)이 속한 주(월 8/3~금 8/7) 기준 시드.
 * ⚠️ **회의는 예외 없이 30분 고정이다**(팀 확정, CLAUDE.md §브라우저 API) — 목 데이터도 이
 *    규칙을 그대로 지킨다. 90분·2시간짜리 목업을 두면 "30분 고정"이 화면에서부터 거짓말이 된다.
 * ⚠️ **프로젝트 태그는 전부 채워져 있다**(WORKFLOW.md §3-1 확정 — 프로젝트 없는 예약은 없다).
 */
const INITIAL: RoomReservation[] = [
  {
    id: "reservation-1",
    title: "Q3 OKR 중간 점검",
    start: new Date("2026-08-03T09:00:00"),
    end: new Date("2026-08-03T09:30:00"),
    roomId: "room-small-b",
    roomName: "소회의실 B",
    projectId: "1",
    projectTag: "GOODS",
    topics: [{ main: "팀 운영", sub: "위클리 싱크" }],
    attendeeIds: [1, 2, 3],
    ownerId: 1,
  },
  {
    id: "reservation-2",
    title: "마케팅 채널 전략 논의",
    start: new Date("2026-08-03T10:00:00"),
    end: new Date("2026-08-03T10:30:00"),
    roomId: "room-large",
    roomName: "대회의실",
    projectId: "2",
    projectTag: "BRAND",
    topics: [{ main: "마케팅", sub: "채널 전략" }],
    attendeeIds: [1, 2, 3],
    ownerId: 2,
  },
  {
    id: "reservation-3",
    title: "8월 제품 로드맵 검토",
    start: new Date("2026-08-03T14:00:00"),
    end: new Date("2026-08-03T14:30:00"),
    roomId: "room-large",
    roomName: "대회의실",
    projectId: "1",
    projectTag: "GOODS",
    topics: [{ main: "제품", sub: "로드맵 검토" }],
    attendeeIds: [1, 2, 3, 4],
    ownerId: 1,
  },
  {
    id: "reservation-4",
    title: "인프라 마이그레이션 리뷰",
    start: new Date("2026-08-05T15:30:00"),
    end: new Date("2026-08-05T16:00:00"),
    roomId: "room-small-a",
    roomName: "소회의실 A",
    projectId: "3",
    projectTag: "COLLAB",
    topics: [{ main: "인프라", sub: "마이그레이션 리뷰" }],
    attendeeIds: [4, 5, 6],
    ownerId: 4,
  },
  {
    id: "reservation-5",
    title: "팀 위클리 싱크",
    start: new Date("2026-08-06T11:00:00"),
    end: new Date("2026-08-06T11:30:00"),
    roomId: "room-video",
    roomName: "화상회의실",
    projectId: "3",
    projectTag: "COLLAB",
    topics: [{ main: "팀 운영", sub: "위클리 싱크" }],
    attendeeIds: [2, 3, 7],
    ownerId: 2,
  },
];

const globalStore = globalThis as typeof globalThis & {
  __roomReservationStore?: ReservationStore;
};
const store: ReservationStore = (globalStore.__roomReservationStore ??= {
  reservations: INITIAL,
  sequence: INITIAL.length,
});

export function listMockReservations(): RoomReservation[] {
  return store.reservations;
}

export function listMockReservationsByRoom(roomId: string): RoomReservation[] {
  return store.reservations.filter((reservation) => reservation.roomId === roomId);
}

export function findMockReservation(id: string): RoomReservation | null {
  return store.reservations.find((reservation) => reservation.id === id) ?? null;
}

/**
 * 예약 수정 — 회의 수정(MEET-05, #436)이 시간·회의실·프로젝트를 바꿀 때 **예약도 같이**
 * 고친다("회의실 예약 = 회의 개설"이 한 동작이듯, 고치는 것도 한 동작이다 — 여기만 고치고
 * `meeting/mock/meetings.ts`의 회의 레코드를 안 맞추면, 또는 반대로 회의만 고치고 여기를
 * 안 맞추면 회의실 주간 캘린더(`getRoomWeekAvailability`, 이 파일의 `listMockReservationsByRoom`
 * 를 본다)가 옛 슬롯을 계속 "예약됨"으로 보여준다). 참조 무결성은 호출부(`meeting/actions.ts`)
 * 가 이미 확인한 뒤에만 이 함수를 부른다.
 */
export function updateMockReservation(
  id: string,
  patch: Pick<
    RoomReservation,
    "title" | "roomId" | "roomName" | "projectId" | "projectTag" | "start" | "end"
  >,
): RoomReservation | null {
  const found = findMockReservation(id);
  if (!found) return null;

  const updated: RoomReservation = { ...found, ...patch };
  store.reservations = store.reservations.map((reservation) =>
    reservation.id === id ? updated : reservation,
  );
  return updated;
}

/**
 * 예약 생성 — 시작 시각 + 고정 30분으로 종료 시각을 계산하고, roomId/projectId를 표시용
 * 이름·태그로 채워 넣는다(컴포넌트는 코드값을 모른다, §Mock 격리막).
 * ⚠️ **회의(Meeting)도 같이 만든다**(WORKFLOW.md §3-1: "회의실 예약 = 회의 개설"은 한 동작) —
 *    `features/meeting/mock/meetings.ts`를 직접 부른다(그 도메인엔 아직 소비할 화면이 없어
 *    server.ts 격리막이 없다, `rooms/actions.ts`가 `TOP_LEVEL_PROJECTS`를 직접 참조하는 것과
 *    같은 이유).
 * ⚠️ 참조 무결성(roomId/projectId/attendeeIds/parentTeamActionId 존재 여부)은 여기서 다시
 *    안 본다 — 호출부(`actions.ts`)가 먼저 확인한 뒤에만 이 함수를 부른다.
 * ⚠️ **host는 명단 맨 앞에 자동으로 들어간다** — 피커가 host를 후보로 안 내주므로
 *    (`attendee-scope.ts`) 제출값에는 host가 없다. 안 넣으면 MEMBER가 개설한 회의를 개설자
 *    본인이 못 연다(`canViewMeetingDetail`은 참석자 명단으로 판정한다). 교체(MEET-09)의
 *    `updateMockMeetingAttendees`·시드 데이터와 같은 규칙이다.
 */
export function addMockReservation(draft: RoomReservationDraft, actor: Actor): RoomReservation {
  const room = findMockRoom(draft.roomId);
  const start = new Date(`${draft.date}T${draft.startTime}:00`);
  const end = new Date(start.getTime() + RESERVATION_DURATION_MINUTES * 60_000);
  const project = TOP_LEVEL_PROJECTS.find((item) => String(item.id) === draft.projectId);

  const reservation: RoomReservation = {
    id: `reservation-${++store.sequence}`,
    title: draft.title.trim(),
    start,
    end,
    roomId: draft.roomId,
    roomName: room?.name ?? draft.roomId,
    projectId: draft.projectId,
    projectTag: project?.tag ?? "",
    topics: draft.topics.map((topic) => ({ main: topic.main.trim(), sub: topic.sub.trim() })),
    attendeeIds: Array.from(new Set([actor.id, ...draft.attendeeIds])),
    ownerId: actor.id,
  };
  store.reservations = [...store.reservations, reservation];

  // ⚠️ `Meeting.topics`는 최소 1개짜리 튜플 타입이다 — `validateRoomReservationDraft`가 이미
  //    최소 1쌍을 보장했으니 여기서 그 사실을 튜플로 그대로 옮긴다(캐스팅 없이).
  const [firstTopic, ...restTopics] = reservation.topics;
  const topics: [MeetingTopic, ...MeetingTopic[]] = [firstTopic!, ...restTopics];

  const meetingCommon = {
    title: reservation.title,
    start: reservation.start,
    end: reservation.end,
    roomId: reservation.roomId,
    roomName: reservation.roomName,
    projectId: project?.id ?? 0,
    projectTag: reservation.projectTag,
    topics,
    attendeeIds: reservation.attendeeIds,
    hostId: actor.id,
    roomReservationId: reservation.id,
    // ⚠️ 회의실 예약이 만드는 회의는 대면이다 — 비대면(이슈 #473)은 `createOnlineMeetingAction`
    //    (`features/meeting/actions.ts`)이 회의실 없이 따로 만든다.
    isOnline: false,
    recordingFileName: null,
  };

  // ⚠️ `Meeting`은 Owner 개설/팀 액션 개설을 판별식 유니언으로 나눠 둔다(hostTeamId·
  //    parentTeamActionId가 둘 다 있거나 둘 다 없거나만 허용) — 그래서 여기서도 분기해서
  //    만든다. Leader/Member 분기의 `!`는 `actions.ts`가 이미 상위 팀 액션·자기 팀 소속을
  //    검증한 뒤에만 이 함수를 부르기 때문에 안전하다. SYSTEM 역할은 `/app/rooms`를 쓰지
  //    않아(회사 소속이 아님) 이 분기에 올 일이 없다.
  const meetingDraft: MeetingDraft = requiresParentTeamAction(actor)
    ? {
        ...meetingCommon,
        hostAuthority: actor.role as Extract<Authority, "LEADER" | "MEMBER">,
        hostTeamId: actor.teamId!,
        parentTeamActionId: draft.parentTeamActionId!,
      }
    : { ...meetingCommon, hostAuthority: AUTHORITY.OWNER };

  addMockMeeting(meetingDraft);

  return reservation;
}
