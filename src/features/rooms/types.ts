/**
 * 회의실 예약(주간 캘린더) — 격리막의 UI 계약(CLAUDE.md §Mock 격리막).
 * 컴포넌트는 이 타입만 알고, 목/실서버 분기는 `server.ts`가 끝낸다.
 */

import type { Authority } from "@/constants/authority";

/**
 * 회의실 한 곳.
 * ⚠️ **"수용 인원" 필드는 없다**(WORKFLOW.md §10-A 확정 — 전면 폐기). 화면·모달·데이터 구조
 *    어디에도 안 둔다. 대신 "위치"가 있다.
 * ⚠️ **운영시간(`openTime`/`closeTime`) 필드도 없다**(2026-08-15, BE PR #523 — DB 컬럼째 삭제,
 *    회의실은 이제 도메인상 항상 이용 가능하다). 예전엔 여기 있었다 — BE가 안 주는 값을
 *    화면이 지어내면 안 되고(§정직성), 시간대 검증도 더는 할 대상이 없다.
 */
export interface MeetingRoom {
  id: string;
  name: string;
  /** 자유 텍스트 — "3층 A동"처럼(WORKFLOW.md §10-A) */
  location: string;
}

/**
 * 회의실 추가·수정 폼 입력(`/manage/rooms`, is_admin 전용) — 화면과 서버가 같은 스키마로 검증한다.
 * ⚠️ 예약 승인 절차가 없다(WORKFLOW.md §10-A) — 만들면 바로 예약 가능한 목록에 들어간다.
 */
export interface MeetingRoomDraft {
  name: string;
  location: string;
}

export type MeetingRoomFormErrors = Partial<Record<keyof MeetingRoomDraft, string>>;

/**
 * 참석자 검색 대상 — 예약 폼의 "참석자" 피커가 쓴다.
 * ⚠️ `teamName`·`authority`는 "팀장급만"·"내 부서만" 필터(`RoomAttendeePicker`)를 위해서만
 *    쓴다 — 사원 도메인 전체 타입은 여전히 안 끌어온다(§경량 항목).
 */
export interface RoomMember {
  id: number;
  name: string;
  /** Owner는 팀이 없다(`null`, CLAUDE.md §조직 계층). */
  teamName: string | null;
  authority: Authority;
}

/** 예약 폼의 "프로젝트" select가 쓰는 경량 항목 — 프로젝트 도메인 전체 타입을 끌어오지 않는다. */
export interface RoomProjectOption {
  id: string;
  name: string;
  tag: string;
}

/**
 * 예약 폼의 "상위 팀 액션" select가 쓰는 경량 항목 — Host가 Owner가 아닐 때만 뜬다
 * (WORKFLOW.md §3-1). `projectTag`로 지금 고른 프로젝트에 속한 것만 걸러 보여준다.
 */
export interface RoomTeamActionOption {
  id: number;
  name: string;
  projectTag: string;
}

/** 회의 안건 대주제/소주제 한 쌍 — 자유 입력 텍스트다(고정 enum 아님, WORKFLOW.md §3-1). */
export interface MeetingTopicInput {
  main: string;
  sub: string;
}

/**
 * 주간 캘린더 한 칸에 그려지는 예약 건. react-big-calendar의 start/end 접근자가 이 필드명을 그대로 쓴다.
 * ⚠️ 막대 색은 여기 없다 — `projectTag`를 화면에서 `pickPaletteColor`에 넘겨 그때 뽑는다
 *    (프로젝트 태그·아바타와 같은 팔레트, CLAUDE.md §디자인 토큰: 하드코딩 금지).
 * ⚠️ 프로젝트 태그는 **항상 있다**(WORKFLOW.md §3-1 확정 — 프로젝트 없는 회의는 없다).
 */
export interface RoomReservation {
  id: string;
  title: string;
  start: Date;
  end: Date;
  roomId: string;
  roomName: string;
  projectId: string;
  projectTag: string;
  /** 최소 1쌍 — 나머지는 폼에서 "추가/삭제"로 늘고 준다. */
  topics: MeetingTopicInput[];
  attendeeIds: number[];
  /** 담당자 — 이 예약의 시간을 바꿀 수 있는 유일한 사람(권한 ②축, CLAUDE.md §권한). */
  ownerId: number;
}

/**
 * 회의실 예약 폼 입력 — 화면과 서버가 같은 스키마(`validate.ts`)로 검증한다.
 * ⚠️ 종료 시각은 입력받지 않는다 — 예약은 **30분 한 타임 고정**이라(팀 확정,
 *    CLAUDE.md §브라우저 API) 시작 시각만 받고 길이는 서버가 계산한다.
 * ⚠️ "회의실 예약 = 회의 개설"이 한 동작이라(WORKFLOW.md §3-1) 이 드래프트가 회의 쪽 입력도
 *    같이 들고 있다 — `parentTeamActionId`는 Host가 Owner가 아닐 때만 필수다.
 */
export interface RoomReservationDraft {
  title: string;
  roomId: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:mm" — 30분 단위 슬롯의 시작 시각 */
  startTime: string;
  /** 항상 필수다(WORKFLOW.md §3-1) — "프로젝트에 안 묶인 예약"은 없다. */
  projectId: string;
  topics: MeetingTopicInput[];
  attendeeIds: number[];
  /** Host가 Leader/Member일 때만 필수 — 그 프로젝트 내 자기 팀에 하달된 팀 액션 중 하나. */
  parentTeamActionId?: number;
}

export type RoomReservationFormErrors = Partial<Record<keyof RoomReservationDraft, string>>;

/** 회의실 주간 슬롯 그리드 한 칸의 상태(`GET /api/meeting-rooms/availability`, ROOM-02). */
export type RoomSlotStatus = "AVAILABLE" | "RESERVED";

/**
 * 30분 슬롯 한 칸.
 * ⚠️ `meetingId`·`title`은 BE가 숫자로 내려주지만, UI 계약은 다른 회의실 도메인 id와 같은
 *    규칙으로 문자열로 든다(`MeetingRoom.id`·`RoomReservation.id`와 같은 관례).
 * ⚠️ 요청자가 참석자가 아닌 회의는 `title`이 `null`로 마스킹돼 온다 — 지어내지 않는다(§정직성).
 */
export interface RoomAvailabilitySlot {
  /** "HH:mm" */
  startTime: string;
  status: RoomSlotStatus;
  meetingId: string | null;
  title: string | null;
}

/** 하루치 슬롯 — 월~금 중 하루. */
export interface RoomDayAvailability {
  /** "YYYY-MM-DD" */
  date: string;
  slots: RoomAvailabilitySlot[];
}

/**
 * 회의실 하나의 주간(월~금) 슬롯 그리드 — 축이 "회의실 하나 × 요일"이다(2026-08-10 전환,
 * 기존 "하루 × 전체 회의실"은 폐기). `meetingRoom`은 이 응답 전용 경량 사본이라 `location`이
 * 없다(BE가 이 엔드포인트에서 안 내려준다) — 회의실 관리 화면의 `MeetingRoom`과 헷갈리지 않도록
 * `location`은 빈 문자열로 채운다.
 */
export interface RoomWeekAvailability {
  /** "YYYY-MM-DD" — 이 주의 월요일 */
  weekStart: string;
  slotMinutes: number;
  meetingRoom: MeetingRoom;
  days: RoomDayAvailability[];
}

/**
 * 캘린더에 그려지는 예약 막대 한 칸 — 주간 그리드(연속 RESERVED 슬롯 병합)와 방금 만든 예약이
 * 함께 이 모양으로 합쳐져 `WeeklyRoomCalendar`에 올라간다.
 * ⚠️ `attendeeIds`는 방금 만든 예약에만 채워진다 — 주간 그리드 API는 참석자 id를 안 내려준다
 *    (열람 권한이 따로 있어서다, ROOM-02 규칙). 없으면 아바타를 안 그린다.
 */
export interface RoomCalendarEvent {
  /**
   * React key·막대 색 계산용 — 주간 그리드 API 경로에서는 `${meetingId}-${date}` 합성값이라
   * 회의 하나를 가리키는 값이 아니다. 회의 하나를 가리켜야 하는 자리(상세 모달 열기)는
   * 반드시 아래 `meetingId`를 쓴다.
   */
  id: string;
  /** 이 예약이 실제로 가리키는 회의 id — 상세 조회 모달이 이 값으로 `getMeetingSummaryAction`을 부른다. */
  meetingId: string;
  title: string;
  start: Date;
  end: Date;
  attendeeIds?: number[];
  /** 방금 만든 예약에만 채워진다 — 주간 그리드 API는 프로젝트 태그를 안 내려준다(막대 색 계산용). */
  projectTag?: string;
}
