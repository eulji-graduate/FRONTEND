/**
 * 회의실 예약 = 회의 개설(`POST /api/meetings`, MEET-01) BE shape → UI 계약.
 * [확인] BE `meeting/presentation/api/request/CreateMeetingRequest.java`(2026-08-18 실코드
 *   대조) — 필드 10개(`title`·`projectId`·`meetingRoomId`·`startAt`·`endAt`·`recordingConsent`·
 *   `relatedActionId`·`attendeeMemberIds`·`mainTopic`·`subTopics`) 전부 이름·타입 일치.
 */

import type {
  MeetingTopicInput,
  RoomCalendarEvent,
  RoomReservation,
  RoomReservationDraft,
} from "../types";

/**
 * `POST /api/meetings`(MEET-01, 구현 완료) 요청 본문 — "회의실 예약 = 회의 개설"이 한 동작이라
 * (WORKFLOW.md §3-1) 예약 드래프트를 회의 계약 필드명으로 바꾼다.
 * ⚠️ `recordingConsent`: 팀 확정 예약 모달(WORKFLOW.md §3-1)에 이 필드를 받는 입력이 없다 —
 *    계약도 "화면에 UI가 없어 항상 `false`로 온다"(2026-08-12 FE 확정)고 명시한다.
 * ⚠️ `relatedActionId`: 계약 확정본 — host가 OWNER면 이 필드를 **보내면 안 되고**, 그 외
 *    역할이면 **필수**다(2026-08-12). `parentTeamActionId`가 같은 개념이라 그대로 싣는다.
 * ⚠️ 종료 시각은 폼에서 안 받는다 — 예약은 **30분 한 타임 고정**이라(팀 확정) 시작 시각 +
 *    고정 길이로 계산한 값을 그대로 보낸다(FE에서 길이를 입력받지 않을 뿐, 계약이 요구하는
 *    `endAt` 자체는 보낸다).
 * ⚠️ `mainTopic`·`subTopics`: **신규 필드**(2026-08-12, 안건 저장 확정) — 계약은 "대주제 1개 +
 *    소주제 여러 개"인데 현재 폼의 안건 UI(`draft.topics`)는 "대주제·소주제 쌍 여러 개"다. 두
 *    모델이 안 맞는다 — 첫 쌍의 `main`을 `mainTopic`으로, **모든 쌍의 `sub`를 모아** `subTopics`로
 *    보낸다(형식 검증은 통과하지만, 둘째 쌍부터는 `main` 값이 버려진다). 안건 UI를 계약에 맞춰
 *    다시 설계할지는 별도 논의가 필요하다 — 지금은 요청이 400으로 막히지 않게 하는 최소 매핑이다.
 */
export interface BeCreateMeetingPayload {
  title: string;
  projectId: number;
  meetingRoomId: number;
  startAt: string;
  endAt: string;
  recordingConsent: boolean;
  relatedActionId?: number;
  attendeeMemberIds: number[];
  mainTopic: string;
  subTopics: string[];
}

/** BE가 받는 오프셋 없는 로컬 시각 문자열(`2026-08-14T10:00:00`) — 회의 개설·수정(#436)이 같이 쓴다. */
export function toLocalDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/**
 * 계약이 실제로 받는 안건 모양(대주제 1개 + 소주제 여러 개)으로 좁힌다 — `toCreateMeetingPayload`와
 * `toReservationFromCreatedMeeting`이 같은 값을 써야 "폼엔 여러 대주제가 있었는데 화면은 하나만
 * 보여준다" 같은 불일치가 안 생긴다(§정직성: 버려진 값을 저장된 것처럼 보이면 안 된다).
 */
function toSentTopics(topics: MeetingTopicInput[]): { mainTopic: string; subTopics: string[] } {
  return {
    mainTopic: topics[0]?.main.trim() ?? "",
    subTopics: topics.map((topic) => topic.sub.trim()).filter((sub) => sub.length > 0),
  };
}

export function toCreateMeetingPayload(
  draft: RoomReservationDraft,
  range: { start: Date; end: Date },
): BeCreateMeetingPayload {
  const { mainTopic, subTopics } = toSentTopics(draft.topics);
  return {
    title: draft.title.trim(),
    projectId: Number(draft.projectId),
    meetingRoomId: Number(draft.roomId),
    startAt: toLocalDateTime(range.start),
    endAt: toLocalDateTime(range.end),
    recordingConsent: false,
    relatedActionId: draft.parentTeamActionId,
    attendeeMemberIds: draft.attendeeIds,
    mainTopic,
    subTopics,
  };
}

/**
 * `POST /api/meetings` 성공 응답 — [확인] MEET-01 계약(2026-08-12), "응답 중첩 구조는
 * 확정본이다 — 코드와 대조했다"고 명시된 모양이다. `project`는 이 응답에 없다 — 개설
 * 직후 화면에 프로젝트 태그를 보여줄 값은 다른 곳(제출한 폼)에서 와야 한다.
 */
export interface BeCreateMeetingResponse {
  meetingId: number;
  status: string;
  title: string;
  startAt: string;
  endAt: string;
  recordingConsent: boolean;
  meetingRoom: { meetingRoomId: number; name: string; location: string };
  host: { memberId: number; name: string };
  attendees: { memberId: number; name: string; teamName: string | null }[];
}

/**
 * 응답과 방금 보낸 폼 입력을 합쳐 캘린더가 바로 얹을 수 있는 `RoomReservation`을 만든다
 * (`toCreatedMeetingRoom`과 같은 비관적 갱신 방식).
 * ⚠️ `roomName`·`ownerId`(host)는 **응답에서 직접 읽는다** — 확정된 중첩 구조 덕에 더 이상
 *    `getMeetingRooms()`를 따로 불러 이름을 찾을 필요가 없다.
 * ⚠️ `projectTag`만 빈 문자열로 남는다 — 계약 확정본에 `project`가 없다(BE가 안 준다, 추측
 *    아님). `revalidatePath` 뒤 캘린더 재조회(ROOM-02, 연동 완료)에는 정확한 값이 나온다.
 * ⚠️ `topics`는 폼 입력을 그대로 echo하지 않는다 — 계약이 대주제 1개만 받아서(위 `toSentTopics`
 *    참고) 둘째 쌍부터 `main`은 서버에 안 갔다. 그 값을 화면에 "저장됨"으로 보여주면 거짓말이라
 *    실제로 보낸 값(첫 대주제 + 소주제 목록)으로만 되짚는다.
 */
export function toReservationFromCreatedMeeting(
  response: BeCreateMeetingResponse,
  draft: RoomReservationDraft,
  range: { start: Date; end: Date },
): RoomReservation {
  const { mainTopic, subTopics } = toSentTopics(draft.topics);
  return {
    id: String(response.meetingId),
    title: draft.title.trim(),
    start: range.start,
    end: range.end,
    roomId: draft.roomId,
    roomName: response.meetingRoom.name,
    projectId: draft.projectId,
    projectTag: "",
    topics: subTopics.map((sub) => ({ main: mainTopic, sub })),
    attendeeIds: draft.attendeeIds,
    ownerId: response.host.memberId,
  };
}

/** 방금 만든 예약(`createRoomReservationAction`의 반환값)을 캘린더 막대 모양으로 맞춘다. */
export function toCalendarEventFromReservation(reservation: RoomReservation): RoomCalendarEvent {
  return {
    id: reservation.id,
    meetingId: reservation.id,
    title: reservation.title,
    start: reservation.start,
    end: reservation.end,
    attendeeIds: reservation.attendeeIds,
    projectTag: reservation.projectTag,
  };
}
