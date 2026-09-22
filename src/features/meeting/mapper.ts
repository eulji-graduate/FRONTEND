/**
 * BE shape → UI 계약(§Mock 격리막). 컴포넌트는 이 파일을 모른다 — `server.ts`만 쓴다.
 * [확인] D도메인 REST API 명세(2026-08-12) 대조.
 */

import { format } from "date-fns";

import type { DashboardMeeting } from "@/components/common/dashboard-meeting-item";
import {
  AI_SUMMARY_STATUS,
  type AiSummaryStatus,
  isMeetingStatus,
  MEETING_STATUS,
} from "@/constants/meeting";

import { formatClockTime, formatMeetingSchedule } from "./lib";
import type {
  CaptureAttendee,
  MeetingAgenda,
  MeetingCaptureInfo,
  MeetingContentPending,
  MeetingDetail,
  MeetingListItem,
  MeetingOutput,
  ScriptChunk,
} from "./view-types";

/** Owner 개설 회의의 소속 라벨(WORKFLOW §2) — 옛 문구 "프로젝트 공통"은 폐기됐다 */
export const OWNER_ORIGIN_LABEL = "Owner 개설";

/**
 * 팀 개설 회의의 소속 라벨 — 실서버는 **영구히 이 일반 문구**다.
 *
 * ⚠️ 원래 계약(§view-types)은 "상위 팀 액션 이름"인데, BE 모델에 회의→상위 팀 액션 연결이
 *    없어 **영구 제공 불가**다(BE PR #461 F2/F5 회신 — 목록·상세 모두 `teamId`까지만 준다).
 *    목 경로는 목 데이터에 그 연결이 있어 이름을 채우지만, 실서버는 팀 액션 회의라는
 *    사실까지만 말한다 — 없는 이름을 지어내지 않는다(§정직성).
 */
export const TEAM_ORIGIN_LABEL = "팀 액션 회의";

/**
 * `teamId` → 소속 라벨.
 *
 * [확인] BE PR #461 F2/F5 회신(2026-08-13) — **`teamId`가 판정의 정본**이다.
 *   `teamId === null` = Owner 개설(회사 직속), 숫자 = 팀 개설.
 * ⚠️ 응답의 `originLabel`("OWNER"/"TEAM")은 같은 판정의 **코드값**이라 안 읽는다
 *    (`MeetingListQueryService.originLabel` — `teamId`에서 파생). 코드값을 화면에 그대로
 *    내보내지 않고(§도메인 상수: 코드엔 영문, 화면엔 한글) 여기서 라벨을 만든다.
 * ⚠️ **BE #461 배포 전 응답에는 이 필드가 없다 — 없으면 지금처럼 비운다**(`undefined` ≠ `null`.
 *    `null`은 "Owner 개설"이라는 값이고, `undefined`는 "아직 안 준다"다 — 뭉치면 미배포
 *    서버의 모든 회의가 Owner 개설로 읽힌다).
 */
function originLabelFromTeamId(teamId: number | null | undefined): string {
  if (teamId === undefined) return "";
  return teamId === null ? OWNER_ORIGIN_LABEL : TEAM_ORIGIN_LABEL;
}

/**
 * BE `MeetingSummaryStatus` → 화면 상수(`AI_SUMMARY_STATUS`) — 어휘가 달라 여기서 흡수한다.
 *
 * [확인] BE PR #461 `MeetingListQueryService.resolveSummaryStatus`(2026-08-13):
 *   목록은 `NONE`(안 끝남)·`STALLED`(중단)·`null`(끝났지만 A가 안 갈라 줘서 모름)만 실제로
 *   보낸다. `PROCESSING`·`DONE`은 enum에 있지만 A가 구분값을 주기 전까지 미사용이다.
 *
 * - `NONE` → `null` — 화면 계약도 "안 끝난 회의는 `null`"이라 뜻이 같다(§view-types).
 * - `PROCESSING` → `SUMMARIZING`, `STALLED`·`FAILED` → `FAILED` — 이름만 다르고 뜻이 같다.
 *   ⚠️ **`FAILED`는 목록에 지금 안 온다** — BE가 실패를 `STALLED`로 접어 보내기 때문이다.
 *      그래도 `case`를 미리 두는 건 그 접기를 푸는 날 **조용히 갈리지 않게** 하려는 것이다
 *      (상세(MEET-04)는 이미 `FAILED`를 그대로 보낸다).
 * - `DONE` → `REVIEWED` — 요약(초안)이 끝나 Host가 검토할 차례라는 뜻이 같다.
 *   ⚠️ BE `DONE`은 확정 전·후(`REVIEWED`/`DISTRIBUTED`)를 아직 안 가른다 — 구분값이
 *      생기면 여기서 갈라야 확정 끝난 회의에 [액션 검토]가 계속 뜨는 일을 막는다.
 * - 모르는 값·`null`·미배포(`undefined`) → `null` — 지어내지 않는다(§정직성).
 */
function toAiSummaryStatus(be: string | null | undefined): AiSummaryStatus | null {
  switch (be) {
    case "PROCESSING":
      return AI_SUMMARY_STATUS.SUMMARIZING;
    case "DONE":
      return AI_SUMMARY_STATUS.REVIEWED;
    case "STALLED":
    case "FAILED":
      return AI_SUMMARY_STATUS.FAILED;
    default:
      /*
        ⚠️ `WAITING_TRANSCRIPT`도 여기로 떨어진다(의도). 받아쓰기가 아직 도는 중이라 분석
           시작 전인 회의인데, 이 값을 무엇으로 보여줄지는 팀 결정 대기다. 지금 매핑을 바꿔도
           화면은 안 바뀐다 — `meetingCardAffordanceOf`가 `REVIEWED`만 본다(status.ts).
      */
      return null;
  }
}

/**
 * `GET /api/meetings/upcoming`(MEET-03, 구현 완료) 목록 원소.
 * ⚠️ `project`엔 `name`·`color`도 오지만 이 위젯이 안 쓴다 — 안 쓰는 필드는 안 적는다
 *    (`BeMeetingDetail`과 같은 원칙).
 * ⚠️ 개설자(host) 이름·소속 라벨은 이 계약에 없다 — `isHost`(보는 사람이 host인가)뿐이라
 *    "누가 개설했는가"는 여기서 못 구한다(§mapper `toDashboardMeeting` 참고).
 * ⚠️ **상위 팀 액션도 없다.** 기다리면 오는 값이 아니라 **요청해야 오는 값**이다 —
 *    자세한 사정은 `toDashboardMeeting`의 `originLabel` 주석에 한 곳으로 모아 적었다.
 */
export interface BeUpcomingMeeting {
  meetingId: number;
  title: string;
  status: string;
  startAt: string;
  endAt: string;
  attendeeCount: number;
  isHost: boolean;
  entryAvailable: boolean;
  meetingRoom: { meetingRoomId: number; name: string };
  project: { projectId: number; tag: string };
}

export interface BeUpcomingMeetingsResponse {
  meetings: BeUpcomingMeeting[];
}

/**
 * 대시보드 "참석 회의" 위젯(`DashboardMeetingItem`)이 받는 모양으로 바꾼다.
 * ⚠️ `originLabel`을 안 채운다 — 이 계약엔 개설자 소속(Owner 개설/팀명)도, 팀 액션 회의의
 *    상위 팀 액션 이름도 없다. 없는 값을 지어내지 않는다(§정직성) — 화면은 그 값이 없으면
 *    라벨을 그냥 안 그린다(`hostLabel`과 같은 선택 필드로 취급).
 *
 * ⚠️ **"곧 온다"고 적어 두지 않는다**(2026-08-13 정정). 예전 주석은 "아직 없다"로 읽혀
 *    기다리면 오는 값처럼 보였는데, **아무도 요청하지 않으면 영영 안 온다.** 지금 확인한 사실은
 *    이렇다([확인] BE 실코드 대조, 2026-08-13):
 *      · 링크 자체는 **BE 모델에 있다** — `meeting.related_action_id`(action FK,
 *        `V3.1.1`·`V3.1.2` 마이그레이션), 도메인 `Meeting.relatedActionId`. 예약할 때
 *        정책 검증까지 한다(`MeetingService.validateRelatedActionPolicy` — OWNER는 못 넣고,
 *        그 외 역할은 반드시 넣는다).
 *      · 그런데 **어떤 응답 DTO에도 안 실린다** — `MeetingDetailResponse`·
 *        `MeetingListResponse`·`UpcomingMeetingListResponse` 셋 다 `relatedActionId`도
 *        `teamId`도 host `role`도 없다.
 *    ⇒ 그러니 이건 "모델에 없어서 못 준다"가 아니라 **"모델엔 있는데 안 내보낸다"**이고,
 *      막힌 곳은 응답 DTO 하나다. 필요해지면 그 필드를 실어 달라고 요청하면 된다.
 * ⚠️ (팀 협의 기록에는 "회의↔액션 링크가 모델에 없어 영구 제공 불가"로 남아 있는데, 위
 *    실코드와 어긋난다 — **코드가 맞다**(§연동 검증). 고치기 전에 담당자에게 한 번 확인한다.)
 * ⚠️ `entryAvailable`·`isHost`는 지금 이 위젯에 [입장] 버튼이 없어(WORKFLOW.md §3-2, 목록
 *    화면의 카드에만 있음) 쓰지 않는다 — 화면에 없는 기능을 새로 만들지 않는다(§명세).
 */
export function toDashboardMeeting(be: BeUpcomingMeeting): DashboardMeeting {
  if (!isMeetingStatus(be.status)) {
    throw new Error(`알 수 없는 회의 상태입니다: ${be.status}`);
  }

  return {
    id: String(be.meetingId),
    title: be.title,
    projectTag: be.project.tag,
    status: be.status,
    room: be.meetingRoom.name,
    scheduledAt: be.startAt,
    attendeeCount: be.attendeeCount,
  };
}

/**
 * `GET /api/meetings/dashboard`(MEET-17, 구현 완료) 목록 원소.
 * [확인] `meeting/presentation/api/response/DashboardMeetingListResponse.java`(2026-08-13).
 *
 * ⚠️ 위의 MEET-03과 **모양이 다르다.** 이쪽은 대시보드 카드가 그리는 그대로 평평하게 오고
 *    (`projectTag`·`room`), 라벨 2단(`originLabel`·`hostLabel`)도 서버가 이미 정해서 준다.
 * ⚠️ **둘 다 `null`로 올 수 있다.** `scope=team`의 `originLabel`은 명세에 정의가 없어 BE가
 *    비워 두고, `hostLabel`("(팀장)" 표기)은 팀 배치 조회 계약이 붙기 전까지 항상 `null`이다
 *    (BE `DashboardMeetingQueryService` 클래스 주석) — 없으면 화면이 배지를 안 그린다.
 */
export interface BeDashboardMeeting {
  meetingId: number;
  title: string;
  projectTag: string;
  status: string;
  room: string;
  scheduledAt: string;
  attendeeCount: number;
  originLabel: string | null;
  hostLabel: string | null;
}

/**
 * 대시보드 "최근 회의" 위젯 한 줄로 바꾼다.
 *
 * ⚠️ `null`은 **키째로 뺀다**(`?? undefined`가 아니라 조건부 전개). `DashboardMeeting`의 두
 *    라벨은 선택 필드라 값이 없으면 배지를 안 그리는데, `null`을 그대로 실으면 타입이 안 맞는다.
 */
export function toDashboardMeetingCard(be: BeDashboardMeeting): DashboardMeeting {
  if (!isMeetingStatus(be.status)) {
    throw new Error(`알 수 없는 회의 상태입니다: ${be.status}`);
  }

  return {
    id: String(be.meetingId),
    title: be.title,
    projectTag: be.projectTag,
    status: be.status,
    room: be.room,
    scheduledAt: be.scheduledAt,
    attendeeCount: be.attendeeCount,
    ...(be.originLabel === null ? {} : { originLabel: be.originLabel }),
    ...(be.hostLabel === null ? {} : { hostLabel: be.hostLabel }),
  };
}

/** 응답 봉투 안쪽 — 결과가 없어도 `meetings`는 빈 배열로 온다(BE가 `List.copyOf`로 보장). */
export function parseDashboardMeetings(raw: unknown): BeDashboardMeeting[] {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("대시보드 최근 회의 응답이 약속한 모양이 아닙니다.");
  }
  const meetings = (raw as { meetings?: unknown }).meetings;
  if (!Array.isArray(meetings) || !meetings.every(isBeDashboardMeeting)) {
    throw new Error("대시보드 최근 회의 응답이 약속한 모양이 아닙니다.");
  }
  return meetings;
}

function isBeDashboardMeeting(value: unknown): value is BeDashboardMeeting {
  if (typeof value !== "object" || value === null) return false;
  const meeting = value as Partial<BeDashboardMeeting>;

  return (
    typeof meeting.meetingId === "number" &&
    typeof meeting.title === "string" &&
    typeof meeting.projectTag === "string" &&
    typeof meeting.status === "string" &&
    typeof meeting.room === "string" &&
    typeof meeting.scheduledAt === "string" &&
    typeof meeting.attendeeCount === "number" &&
    (meeting.originLabel === null || typeof meeting.originLabel === "string") &&
    (meeting.hostLabel === null || typeof meeting.hostLabel === "string")
  );
}

/**
 * `PUT /api/meetings/{meetingId}/attendees`(MEET-09, 구현 완료) 요청·응답.
 * ⚠️ 응답에 참석자 명단이 실제로 온다 — 예전엔 "계약에 응답 shape이 없다"고 가정하고 방금
 *    보낸 값을 그대로 echo했는데, 명세가 확정되면서 서버가 돌려준 명단(호스트 자동 포함·중복
 *    제거가 이미 반영된 값)을 그대로 쓰는 쪽이 더 정확하다.
 */
export interface BeUpdateAttendeesResponse {
  meetingId: number;
  attendees: { memberId: number; name: string; teamName: string | null }[];
}

export function attendeeIdsFrom(response: BeUpdateAttendeesResponse): number[] {
  return response.attendees.map((attendee) => attendee.memberId);
}

/**
 * `GET /api/meetings`(MEET-02, 구현 완료) 목록 한 행.
 * [확인] `meeting/presentation/api/response/MeetingListResponse.java`(2026-08-13).
 *
 * ⚠️ **카드가 실제로 쓰는 필드만 적는다**(`BeMeetingDetail`과 같은 원칙). 응답에는
 *    `actionCount`·`entryAvailable`·`durationMinutes`·`attendees[]`·`project.name`도 오지만
 *    목록 카드가 그리지 않는다 — 적어 두면 화면이 의존하는 값처럼 읽힌다.
 * ⚠️ **`isHost`가 이 연동의 핵심이다.** 보는 사람이 개설자인지 알 방법이 없어 두 탭
 *    (내가 개설한 / 참여해야 할)이 막혀 있었다(백엔드 요청 §10-A → `isHost`로 도착).
 * ⚠️ **`teamId`·`summaryStatus`·`agendaPreview`는 BE PR #461(3차 F 회신)이 더한 확장 필드다.**
 *    전부 선택(`?`)으로 둔다 — **BE #461 배포 전 응답에는 이 필드들이 없다. 없으면 지금처럼
 *    비운다**(FE #432가 먼저 머지돼도 파서가 응답을 거절하지 않는다).
 * ⚠️ 응답에는 `originLabel`("OWNER"/"TEAM")도 오지만 안 읽는다 — `teamId`에서 파생된 코드값이라
 *    화면 라벨은 `originLabelFromTeamId`가 만든다(안 쓰는 필드는 안 적는다).
 */
export interface BeMeetingListItem {
  meetingId: number;
  title: string;
  /** `SCHEDULED` · `IN_PROGRESS` · `DONE` · `CANCELED` (BE `MeetingStatus`) */
  status: string;
  /**
   * `2026-08-14T10:00:00` — 오프셋이 없다(`BeMeetingDetail.startAt`의 경고가 그대로 적용된다).
   * ⚠️ **비대면 회의는 `null`이다**(MEET-18 — WORKFLOW.md §3-1-A: 사용자가 입력하지 않고
   *    DB에도 저장하지 않는다). 상세(`BeMeetingDetail.startAt`)와 같은 계약이다.
   */
  startAt: string | null;
  endAt: string | null;
  attendeeCount: number;
  /** 보는 사람이 이 회의의 개설자인가 — 탭을 가르는 값이다 */
  isHost: boolean;
  /** **`null` = Owner 개설**(F2/F5 회신), 숫자 = 개설 팀 — `originLabelFromTeamId` 참고 */
  teamId?: number | null;
  /**
   * 요약 진행 신호(BE `MeetingSummaryStatus`) — 목록은 실제로 `NONE`·`STALLED`·`null`만 온다
   * (`toAiSummaryStatus` 참고).
   */
  summaryStatus?: string | null;
  /** 안건 첫 줄 — 안건이 하나도 없는 회의는 `null`이다(BE `indexAgendaPreviews`) */
  agendaPreview?: { mainTopic: string | null; firstSubTopic: string | null } | null;
  /**
   * ⚠️ **비대면 회의는 `null`이다**(MEET-18 — 회의실 예약 자체가 없다). 목록 카드가
   *    온라인 회의인지 가르는 **유일한 신호**이기도 하다 — 응답에 `isOnline` 필드는 없다
   *    (상세 `toMeetingDetailView`의 판정과 같은 방식).
   */
  meetingRoom: { meetingRoomId: number; name: string } | null;
  project: { projectId: number; tag: string };
}

/**
 * 목록 응답에서 회의 배열만 꺼낸다 — **`page`는 안 쓴다.**
 *
 * ⚠️ 응답에는 `page{page,size,totalElements,totalPages}`가 함께 오지만 이 화면엔 아직 무한
 *    스크롤도 전체 건수 표기도 없다(§목록은 별도 이슈) — 안 쓰는 값을 계약에 적지 않는다.
 * ⚠️ 검사 이유는 `parseMeetingDetail`과 같다 — `serverApi<T>`는 단언일 뿐 검사가 아니다.
 */
export function parseMeetingList(raw: unknown): BeMeetingListItem[] {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("회의 목록 응답이 약속한 모양이 아닙니다.");
  }
  const meetings = (raw as { meetings?: unknown }).meetings;
  if (!Array.isArray(meetings) || !meetings.every(isBeMeetingListItem)) {
    throw new Error("회의 목록 응답이 약속한 모양이 아닙니다.");
  }
  return meetings;
}

function isBeMeetingListItem(value: unknown): value is BeMeetingListItem {
  if (typeof value !== "object" || value === null) return false;
  const meeting = value as Partial<BeMeetingListItem>;

  const basicShape =
    typeof meeting.meetingId === "number" &&
    typeof meeting.title === "string" &&
    typeof meeting.status === "string" &&
    /* ⚠️ 비대면 회의는 `null`이다(MEET-18, WORKFLOW.md §3-1-A) — 상세 가드와 같은 규칙 */
    isOptionalNullableString(meeting.startAt) &&
    isOptionalNullableString(meeting.endAt) &&
    typeof meeting.attendeeCount === "number" &&
    typeof meeting.isHost === "boolean" &&
    /*
      ⚠️ #461 확장 필드는 **없어도 통과**한다(`undefined` 허용) — BE #461 배포 전 응답에는
         이 필드들이 없다. 없으면 지금처럼 비운다(파서가 멀쩡한 응답을 거절하면 어느 쪽이
         먼저 머지되느냐에 따라 목록 전체가 죽는다).
    */
    isOptionalNullableNumber(meeting.teamId) &&
    isOptionalNullableString(meeting.summaryStatus) &&
    isOptionalAgendaPreview(meeting.agendaPreview) &&
    /* ⚠️ 비대면 회의는 `null`이다(MEET-18) — 있는데 모양이 다른 것만 거른다 */
    (meeting.meetingRoom === null || typeof meeting.meetingRoom?.name === "string") &&
    typeof meeting.project?.tag === "string";

  if (!basicShape) return false;

  /*
    ⚠️ **`startAt`·`endAt`·`meetingRoom` 세 필드는 함께 움직인다** — 대면이면 셋 다 채우고,
       비대면이면 셋 다 `null`이다(MEET-01/18, WORKFLOW.md §3-1-A). mixed 조합(예: `startAt`은
       있는데 `meetingRoom`은 `null`)이 오면 `toMeetingListItem`이 `isOnline`을 `meetingRoom`만
       보고 잘못 판정해 대면 카드의 일시를 숨기거나 비대면 카드에 빈 일시를 그린다 —
       BE 계약을 방어하는 유일한 자리라 여기서 거절한다(2026-08-16 회귀 방어).
  */
  const startNull = meeting.startAt === null || meeting.startAt === undefined;
  const endNull = meeting.endAt === null || meeting.endAt === undefined;
  const roomNull = meeting.meetingRoom === null || meeting.meetingRoom === undefined;
  const allNull = startNull && endNull && roomNull;
  const noneNull = !startNull && !endNull && !roomNull;
  return allNull || noneNull;
}

function isOptionalNullableNumber(value: unknown): value is number | null | undefined {
  return value === undefined || value === null || typeof value === "number";
}

function isOptionalNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

/* 있는데 모양이 다른 것만 거른다 — `[null]`형 오염이 카드 그릴 때 터지는 걸 막는 자리다 */
function isOptionalAgendaPreview(value: unknown): value is BeMeetingListItem["agendaPreview"] {
  if (value === undefined || value === null) return true;
  if (typeof value !== "object") return false;
  const preview = value as { mainTopic?: unknown; firstSubTopic?: unknown };
  return (
    (preview.mainTopic === null || typeof preview.mainTopic === "string") &&
    (preview.firstSubTopic === null || typeof preview.firstSubTopic === "string")
  );
}

/**
 * 목록 카드 한 장으로 바꾼다.
 *
 * BE PR #461(3차 F 회신)이 이 매퍼가 비워 두던 세 칸을 채웠다:
 * - `aiSummaryStatus` ← `summaryStatus` — Host의 완료 카드에 [액션 검토]가 다시 살아난다
 *   (`meetingCardAffordanceOf` — `review`는 `REVIEWED`일 때만). 어휘 흡수는 `toAiSummaryStatus`.
 * - `originLabel` ← `teamId` 판정(F2/F5 회신: **`null` = Owner 개설**) — `originLabelFromTeamId`.
 * - `topicSummary` ← `agendaPreview` — 목 경로와 같은 `대주제 · 소주제` 표기로 잇되,
 *   **빈 조각은 가운뎃점째 버린다**(대주제 없이 소주제만 남은 회의가 ` · 소주제`로 보이면 안 된다).
 *
 * ⚠️ **BE #461 배포 전 응답에는 이 필드들이 없다 — 없으면 지금처럼 비운다**(어느 쪽이 먼저
 *    머지돼도 안전). 카드는 빈 조각을 가운뎃점째 빼고 그린다(`meeting-card.tsx`).
 */
export function toMeetingListItem(be: BeMeetingListItem): MeetingListItem {
  if (!isMeetingStatus(be.status)) {
    throw new Error(`알 수 없는 회의 상태입니다: ${be.status}`);
  }

  return {
    id: String(be.meetingId),
    title: be.title,
    status: be.status,
    projectTag: be.project.tag,
    originLabel: originLabelFromTeamId(be.teamId),
    topicSummary: topicSummaryOf(be.agendaPreview),
    /*
      ⚠️ **비대면 회의는 셋 다 없다**(WORKFLOW.md §3-1-A). 상세 매퍼(`toMeetingDetailView`)와
         같은 규칙으로 접는다 — 카드가 `isOnline`을 보고 그 자리에 "온라인으로 진행된 회의입니다"
         한 줄로 대체한다(`meeting-card.tsx`).
    */
    schedule:
      be.startAt && be.endAt ? formatMeetingSchedule(new Date(be.startAt), new Date(be.endAt)) : "",
    roomName: be.meetingRoom?.name ?? "",
    attendeeCount: be.attendeeCount,
    isHost: be.isHost,
    aiSummaryStatus: toAiSummaryStatus(be.summaryStatus),
    /* ⚠️ 응답에 `isOnline` 필드는 없다 — 회의실이 없다는 것 자체가 신호다(상세와 같은 판정) */
    isOnline: be.meetingRoom === null,
  };
}

/** 안건 첫 줄 — 목 표기(`server.ts` `toListItem`)와 같은 `대주제 · 소주제` 조합이다 */
function topicSummaryOf(preview: BeMeetingListItem["agendaPreview"]): string {
  if (preview === undefined || preview === null) return "";
  return [preview.mainTopic, preview.firstSubTopic].filter(Boolean).join(" · ");
}

/**
 * BE shape → 화면 계약(§Mock 격리막).
 *
 * 컴포넌트는 `view-types.ts`만 안다 — BE가 필드 이름을 바꾸면 **이 파일 한 곳**을 고친다.
 *
 * [확인] BE 실코드 대조(2026-08-11, `Z-Groupware/BACKEND@4e45c54`)
 *   `meeting/presentation/api/MeetingDetailController.java` (MEET-04)
 *   `meeting/presentation/api/response/MeetingDetailResponse.java`
 */

/**
 * `GET /api/meetings/{meetingId}` 응답(MEET-04).
 *
 * ⚠️ **화면이 실제로 쓰는 필드만 적는다.** 응답에는 `createdAt`·`project.name`·`project.color`·
 *    `meetingRoom.location`도 오지만, 안 쓰는 필드를 적어 두면 그것도 화면이 의존하는 값처럼
 *    읽힌다. `recordingConsent`는 예전엔 안 쓰는 값이었지만 회의 수정 다이얼로그(#436)가
 *    수정 대상으로 받으면서 이제 실제로 읽는 필드가 됐다 — 그래서 아래로 옮겨 적었다.
 * ⚠️ **중첩이다.** 태그·회의실·개설자가 전부 객체 안에 있다 — 평평한 `projectTag`·`roomName`·
 *    `hostId`가 아니다(연동 전 우리가 가정했던 모양이 이랬다).
 */
export interface BeMeetingDetail {
  meetingId: number;
  title: string;
  /** `SCHEDULED` · `IN_PROGRESS` · `DONE` · `CANCELED` (BE `MeetingStatus`) */
  status: string;
  /**
   * `2026-08-14T10:00:00` — **오프셋이 없다**(BE가 KST를 그대로 찍는다).
   *
   * ⚠️ 오프셋 없는 문자열은 JS가 **그 프로세스의 시간대**로 읽는다. 우리 서버는
   *    `next.config.ts`가 `TZ=Asia/Seoul`을 박아 두어 맞아떨어진다 — 배포에서 TZ를
   *    덮어쓰면 회의 시각이 통째로 밀린다(배포 전달사항).
   * ⚠️ **비대면 회의는 `null`이다**(2026-08-15, MEET-18 — WORKFLOW.md §3-1-A. 이 필드는
   *    DB에도 안 저장된다). `MeetingDetailResponse.formatDateTime`이 `null`을 그대로 통과시킨다
   *    (BE 실코드 대조) — 여기서 문자열로만 받으면 비대면 회의 상세가 파싱 단계에서 죽는다.
   */
  startAt: string | null;
  endAt: string | null;
  /**
   * 확정 전 AI 액션 초안 건수 — 종료되지 않은 회의는 서버가 조회 없이 `0`으로 확정한다
   * (BE `MeetingDetailQueryService.resolvePendingActionCount`).
   */
  pendingActionCount: number;
  /**
   * 요약 진행 신호(BE `MeetingSummaryStatus`) — **6값이다**:
   * `NONE` · `WAITING_TRANSCRIPT` · `PROCESSING` · `DONE` · `STALLED` · `FAILED`.
   *
   * ⚠️ **상세(MEET-04)는 `null`을 안 준다**(2026-08-16 BE 실코드 대조 정정 — 예전 주석의
   *    "`null`이 정상값"은 **목록(MEET-02) 이야기**였다). `MeetingDetailQueryService`가
   *    끝나지 않은 회의는 `NONE`으로 확정하고, 끝난 회의는 A 응답을 `.orElse(NONE)`으로 닫는다.
   * ⚠️ 그래도 `| null`을 남긴다 — 미배포 서버·부분 응답 방어다. `null`을 "다 됐다"로 읽지 않는다.
   * ⚠️ **`STALLED`(중단)와 `FAILED`(실패)는 다른 값이다** — BE가 실패한 계층이 하나라도 있으면
   *    `FAILED`, 멈추기만 했으면 `STALLED`로 가른다. 화면 문구는 같지만(둘 다 "요약 못 함")
   *    안내가 다르다 — 중단은 다시 분석하면 대개 풀리고, 실패는 그렇지 않다(`isStalled` 참고).
   */
  summaryStatus: string | null;
  /**
   * 이 **회의**가 어느 팀 것인가(PR #461/#472, 2026-08-13 대조) — **`null` = Owner 개설**,
   * 숫자 = 개설 팀. ⚠️ 참석자 한 명 한 명의 소속 팀(`BeMeetingAttendee.teamId`)과는 **다른
   * 값**이다 — 이름이 같아 헷갈리기 쉽다.
   * ⚠️ 선택(`?`)이다 — **BE #461 배포 전 응답에는 이 필드가 없다. 없으면 지금처럼 비운다.**
   */
  teamId?: number | null;
  /**
   * 안건 — **대주제 하나 + 소주제 목록**이다(BE PR #461 `resolveAgenda`). 예약 때 쌍으로
   * 입력해도 BE 모델이 둘째 쌍부터의 대주제를 안 남긴다(3차 F 회신의 알려진 한계) —
   * 없는 쌍을 지어 붙이지 않고 이 모양 그대로 화면 계약(`MeetingAgenda`)에 싣는다.
   * 안건이 하나도 없으면 `null`이다.
   */
  agenda?: { mainTopic: string | null; subTopics: string[] } | null;
  project: { projectId: number; tag: string };
  /**
   * ⚠️ **비대면 회의는 `null`이다**(2026-08-15, MEET-18 — 회의실·시간대 예약 자체가 없는
   *    회의라 회의실이 없다, WORKFLOW.md §3-1-A). `MeetingDetailResponse.from`이
   *    `result.meetingRoom() == null ? null : ...`로 실제로 `null`을 보낸다(BE 실코드 대조,
   *    `AnalysisController`가 아니라 `MeetingDetailResponse.java`) — **이 화면이 온라인
   *    회의인지 판별하는 유일한 신호이기도 하다**(`toMeetingDetailView`의 `isOnline` 참고,
   *    응답에 별도 `isOnline` 필드는 없다).
   */
  meetingRoom: { meetingRoomId: number; name: string } | null;
  host: { memberId: number; name: string };
  attendees: BeMeetingAttendee[];
  /**
   * 녹음 동의 — 회의 수정(MEET-05)이 받는 6필드 중 하나(#436). 예약 화면엔 이 값을 받는
   * 입력이 없어(`rooms/mapper/meetings.ts` `toCreateMeetingPayload`) 항상 `false`로
   * 만들어지지만, 수정 다이얼로그는 지금 값을 보여주고 고칠 수 있어야 해서 여기서부터 읽는다.
   */
  recordingConsent: boolean;
}

/** BE `MeetingSummaryStatus` — 화면 상수(`AI_SUMMARY_STATUS`)와 어휘가 달라 여기서만 쓴다. */
const BE_SUMMARY_STATUS = {
  NONE: "NONE",
  WAITING_TRANSCRIPT: "WAITING_TRANSCRIPT",
  PROCESSING: "PROCESSING",
  DONE: "DONE",
  STALLED: "STALLED",
  FAILED: "FAILED",
} as const;

export interface BeMeetingAttendee {
  memberId: number;
  name: string;
  /**
   * 지금은 퇴사한 사람인가(BE MEET-04, 2026-08-17 대조) — **과거 기록의 참석자 표시용**이다.
   * 명부 조회에선 퇴사자가 완전히 빠지지만(CLAUDE.md §도메인 상수), 이 회의를 실제로 들었던
   * 사람이라는 사실은 기록으로 남아야 해서 스냅샷과 함께 "퇴사" 표시만 붙인다.
   * ⚠️ 선택(`?`)이다 — 이 필드가 배포되기 전 응답에는 없다(§461 확장 필드와 같은 패턴,
   *    `meeting/mapper.ts:306` 참고). 없으면 재직으로 본다(안전한 기본값 — 없는 걸 퇴사로
   *    단정하지 않는다).
   */
  isResigned?: boolean;
  /**
   * 이 **참석자**가 어느 팀 소속인가 — 팀 없는 대표는 `null`(PR #472, 2026-08-13 대조).
   * ⚠️ 선택(`?`)이다 — 회의 자체의 `teamId`(위 `BeMeetingDetail.teamId`)와 같은 이유로,
   *    BE #472 배포 전 응답에는 이 필드가 없다.
   */
  teamId?: number | null;
  /** 팀이 없는 사람(대표)은 `null`이다 */
  teamName: string | null;
  /** ⚠️ `position`이 아니라 `jobPosition`이다 */
  jobPosition: string | null;
}

/**
 * 응답이 우리가 읽는 모양인가 — **읽기 전에 한 번 본다**(코드래빗 지적, 2026-08-11).
 *
 * ⚠️ `serverApi<BeMeetingDetail>`는 **단언일 뿐 검사가 아니다.** 봉투 모양이 어긋나거나 BE가
 *    부분 응답을 주면 `detail.host.memberId`에서 `undefined`를 파고들어 터지는데, 그때 뜨는
 *    건 원인을 알 수 없는 `TypeError`다 — 무엇이 어긋났는지 말해 주는 편이 낫다(§정직성).
 * ⚠️ **중첩이라 더 필요하다.** 평평한 응답은 값이 빠져도 `undefined`가 화면까지 흘러갈 뿐이지만,
 *    여기서는 한 겹 안을 바로 파고들기 때문에 없으면 그 자리에서 터진다.
 * ⚠️ **화면이 실제로 읽는 것만 본다.** 안 쓰는 필드까지 검사하면 BE가 무관한 필드를 바꿀 때마다
 *    멀쩡한 화면이 막힌다.
 */
function isBeMeetingDetail(value: unknown): value is BeMeetingDetail {
  if (typeof value !== "object" || value === null) return false;
  const detail = value as Partial<BeMeetingDetail>;

  return (
    typeof detail.meetingId === "number" &&
    typeof detail.title === "string" &&
    typeof detail.status === "string" &&
    /* ⚠️ 비대면 회의는 `null`이다(MEET-18, WORKFLOW.md §3-1-A) — `BeMeetingDetail.startAt` 주석 참고 */
    isOptionalNullableString(detail.startAt) &&
    isOptionalNullableString(detail.endAt) &&
    typeof detail.pendingActionCount === "number" &&
    (detail.summaryStatus === null || typeof detail.summaryStatus === "string") &&
    /* ⚠️ #461/#472 확장 필드 — 없어도 통과한다(배포 전 응답에는 이 필드들이 없다) */
    isOptionalNullableNumber(detail.teamId) &&
    isOptionalAgenda(detail.agenda) &&
    typeof detail.project?.projectId === "number" &&
    typeof detail.project?.tag === "string" &&
    /* ⚠️ 비대면 회의는 `null`이다(MEET-18) — `BeMeetingDetail.meetingRoom` 주석 참고 */
    (detail.meetingRoom === null || typeof detail.meetingRoom?.name === "string") &&
    typeof detail.host?.memberId === "number" &&
    Array.isArray(detail.attendees) &&
    detail.attendees.every(isBeMeetingAttendee) &&
    typeof detail.recordingConsent === "boolean"
  );
}

/**
 * 참석자 한 줄 — **배열인지만 보면 모자란다**(코드래빗 지적, 2026-08-11).
 *
 * ⚠️ `[null]`이나 모양이 다른 객체는 배열 검사를 그냥 통과하고, 나중에 명단을 그릴 때
 *    `TypeError`로 터진다 — 막을 자리는 응답을 받는 여기다.
 * ⚠️ 팀·직급은 **없을 수 있다**(팀 없는 대표). `null`은 정상이고 `undefined`나 숫자가 비정상이다.
 */
function isBeMeetingAttendee(value: unknown): value is BeMeetingAttendee {
  if (typeof value !== "object" || value === null) return false;
  const attendee = value as Partial<BeMeetingAttendee>;

  return (
    typeof attendee.memberId === "number" &&
    typeof attendee.name === "string" &&
    isOptionalNullableNumber(attendee.teamId) &&
    (attendee.teamName === null || typeof attendee.teamName === "string") &&
    (attendee.jobPosition === null || typeof attendee.jobPosition === "string")
  );
}

/* 안건 검사 — `isOptionalAgendaPreview`와 같은 원칙(없음·null은 정상, 모양이 다르면 거절) */
function isOptionalAgenda(value: unknown): value is BeMeetingDetail["agenda"] {
  if (value === undefined || value === null) return true;
  if (typeof value !== "object") return false;
  const agenda = value as { mainTopic?: unknown; subTopics?: unknown };
  return (
    (agenda.mainTopic === null || typeof agenda.mainTopic === "string") &&
    Array.isArray(agenda.subTopics) &&
    agenda.subTopics.every((sub) => typeof sub === "string")
  );
}

/**
 * 검사까지 마친 회의 상세 — 호출부는 이걸 통과한 값만 만진다.
 *
 * ⚠️ 던지는 건 **여기 한 곳**이다. 화면·`server.ts`가 각자 확인하면 조건이 갈린다(§격리막).
 */
export function parseMeetingDetail(raw: unknown): BeMeetingDetail {
  if (!isBeMeetingDetail(raw)) {
    throw new Error("회의 상세 응답이 약속한 모양이 아닙니다.");
  }
  return raw;
}

/**
 * 녹음할 수 없는 회의인가 — 이유까지는 안 가른다.
 *
 * ⚠️ **`endedAt`이 아니라 `status`로 본다.** 응답에 `endedAt`도 오지만 상태의 정본은
 *    `status`다(BE `MeetingStatus`). 캡처 세션 시작(CAP-01)도 이 상태를 보고 막는다.
 * ⚠️ `CANCELED`도 여기서 걸러야 한다 — 취소된 회의는 녹음할 자리가 아닌데, 화면 계약에는
 *    아직 취소가 없어서 "이미 끝난 회의"와 같은 자리로 보낸다. 취소 화면이 생기면 그때 가른다.
 */
export function isClosed(detail: Pick<BeMeetingDetail, "status">): boolean {
  return detail.status === "DONE" || detail.status === "CANCELED";
}

/**
 * 개설자 id만 꺼낸다 — **판정은 여기서 하지 않는다**(코드래빗 지적, 2026-08-11).
 *
 * ⚠️ 매퍼가 아는 건 "그 값이 응답 어디에 들어 있나"뿐이다. 들어갈 수 있냐 없냐는
 *    `lib/permission.ts`의 `canCaptureMeeting`이 정한다 — 권한 판정이 도메인마다
 *    흩어지면 화면과 서버가 서로 다른 기준을 쓴다(CLAUDE.md §권한).
 */
export function hostIdOf(detail: Pick<BeMeetingDetail, "host">): number {
  return detail.host.memberId;
}

/**
 * 캡처 화면이 받을 값.
 *
 * ⚠️ 시각은 **여기서 우리 표기로 굳힌다**(`8월 14일(금) 10:00 – 10:30`). 화면이 원문을 받아
 *    직접 포맷하면 목·실서버가 서로 다른 문자열을 그린다.
 * ⚠️ 소속·직급은 가운뎃점으로 잇되 **빈 조각은 버린다** — 팀이 없는 대표에게 ` · 대표`처럼
 *    앞이 빈 줄이 남으면 명단이 어긋나 보인다(목 경로와 같은 규칙).
 * ⚠️ **비대면 회의는 이 화면에 올 일이 없다**(WORKFLOW.md §3-1-A — 제출 즉시 `DONE`이라
 *    `/capture`로 갈 이유가 없다). 그래도 `parseMeetingDetail`은 공용이라 `startAt`·`meetingRoom`이
 *    `null`이어도 여기서 죽지 않게만 방어한다(빈 문자열, `BeMeetingDetail`과 같은 규칙).
 */
export function toMeetingCaptureInfo(detail: BeMeetingDetail): MeetingCaptureInfo {
  return {
    id: String(detail.meetingId),
    title: detail.title,
    projectTag: detail.project.tag,
    schedule:
      detail.startAt && detail.endAt
        ? formatMeetingSchedule(new Date(detail.startAt), new Date(detail.endAt))
        : "",
    roomName: detail.meetingRoom?.name ?? "",
    attendees: detail.attendees.map((attendee) =>
      toCaptureAttendee(attendee, detail.host.memberId),
    ),
  };
}

function toCaptureAttendee(attendee: BeMeetingAttendee, hostMemberId: number): CaptureAttendee {
  return {
    id: attendee.memberId,
    name: attendee.name,
    isResigned: attendee.isResigned ?? false,
    subtitle: [attendee.teamName, attendee.jobPosition].filter(Boolean).join(" · "),
    isHost: attendee.memberId === hostMemberId,
  };
}

/**
 * 산출물·발화 기록을 **아직 못 보여주는 이유**(§view-types `MeetingContentPending`).
 *
 * ⚠️ **순서가 있다.** 회의가 안 끝났으면 요약은 시작조차 안 했으므로 회의 상태를 먼저 본다 —
 *    목 경로(`server.ts`)와 같은 차례라야 같은 회의가 두 경로에서 다른 말을 하지 않는다.
 * ⚠️ **`summaryStatus === null`을 "다 됐다"로 읽지 않는다.** BE는 그 값을 "끝났지만
 *    `PROCESSING`인지 `DONE`인지 모른다"는 뜻으로 준다(BE enum 주석) — 모르는 걸 완료로
 *    바꿔 읽으면 화면이 "하달된 액션이 없습니다"라고 **단정**한다(§정직성).
 * ⚠️ 단 **확정 대기 건수가 있으면 요약은 끝난 것**이다 — 초안이 나왔다는 증거라서, 그때는
 *    "요약 중"이 아니라 검토 대기 안내를 띄운다(`actionsSectionStateOf`).
 */
export function meetingPendingReasonOf(
  detail: Pick<BeMeetingDetail, "status" | "summaryStatus" | "pendingActionCount">,
): MeetingContentPending | null {
  if (detail.status === MEETING_STATUS.CANCELED) return "CANCELED";
  if (detail.status === MEETING_STATUS.SCHEDULED) return "SCHEDULED";
  if (detail.status === MEETING_STATUS.IN_PROGRESS) return "IN_PROGRESS";

  /*
    ⚠️ **`STALLED`와 `FAILED`를 같이 본다**(2026-08-16). 둘은 원인이 다르지만(멈춤 vs 계층 실패)
       "요약이 안 끝났고 기다려도 안 온다"는 화면에서 할 말이 같다. 예전엔 `STALLED`만 봐서
       `FAILED`가 아래 마지막 줄로 떨어져 **끝나지 않는 「요약 중」**으로 보였다.
       원인 구분은 `isStalled`가 따로 들고 간다(상세 화면이 그걸로 안내를 가른다).
  */
  if (
    detail.summaryStatus === BE_SUMMARY_STATUS.STALLED ||
    detail.summaryStatus === BE_SUMMARY_STATUS.FAILED
  ) {
    return "FAILED";
  }
  /*
    ⚠️ **확정 대기 건수를 상태값보다 먼저 본다**(2026-08-13, 코드래빗 지적). 예전엔
       `summaryStatus === null`일 때만 이 규칙을 걸어서, 초안이 이미 나왔는데 상태가
       `PROCESSING`이면 화면이 검토 대기 대신 **"요약 중"**을 말했다 — 윗 주석대로 초안은
       요약이 끝났다는 증거라 어떤 상태값보다 강한 신호다.
    ⚠️ 중단·실패(`STALLED`·`FAILED`)만 그 앞에 둔다 — 뒤 계층이 깨진 회의는 [다시 분석]부터
       안내해야 한다.
  */
  if (detail.pendingActionCount > 0) return null;
  if (detail.summaryStatus === BE_SUMMARY_STATUS.DONE) return null;
  /*
    ⚠️ 여기 떨어지는 값은 `NONE`·`WAITING_TRANSCRIPT`, 그리고 모르는 값이다.
       `NONE`은 **계약 위반이 아니라 정상**이다(2026-08-16 BE 실코드 대조 정정) — 자막이
       0건이라 분석이 아예 안 돈 회의다(BE `MeetingSummaryQueryPort.SummaryStatus.NONE`
       javadoc: "「실패」가 아니다"). `WAITING_TRANSCRIPT`는 받아쓰기가 아직 도는 중이라
       분석 시작 전인 회의다.
    ⚠️ **끝난 회의의 이 둘을 무엇이라 쓸지는 팀 결정 대기다.** 결정 전까지 둘 다 "요약 중"으로
       둔다 — 「실패」로 쓰면 정상적으로 아무 일도 없었던 회의를 사고로 보여주고, 새 문구를
       지어 넣으면 결정이 나는 날 `MeetingContentPending`·`PENDING_MESSAGE`를 다시 고쳐야 한다.
  */
  return "SUMMARIZING";
}

/**
 * 회의 상세 화면이 받을 값 — **권한 판정은 여기서 하지 않는다**(`hostIdOf`와 같은 이유).
 * 개설자인지는 `lib/permission.ts`의 `canOperateMeeting`이 정하고 결과만 `isHost`로 받는다.
 *
 * BE PR #461(3차 F 회신)이 비워 두던 칸 중 **소속 라벨·안건·산출물 머리말**을 채웠다:
 *    - `originLabel` ← `teamId` 판정(F2/F5 회신: **`null` = Owner 개설**) — `originLabelFromTeamId`.
 *    - `agenda` ← `agenda`(대주제 하나 + 소주제 목록 — `BeMeetingDetail.agenda` 주석 참고).
 *    - `outputKindLabel` ← `teamId` 판정 — WORKFLOW 원 규칙(Owner 회의=팀 액션, 팀 회의=개인
 *      액션, §view-types 주석)과 같은 축이라 `teamId`만으로 가를 수 있다. 단 **미배포
 *      (`undefined`)면 상위어 `액션` 그대로**다 — 모르는 걸 둘 중 하나로 찍지 않는다.
 *
 * ⚠️ **여전히 비는 칸**(§정직성 — 지어내지 않는다):
 *    - `parentTeamActionHref`: 상위 팀 액션 id가 **모델에 없어 영구 제공 불가**다(#461 회신).
 *      `teamId`는 팀이지 팀 액션이 아니라 링크를 못 만든다.
 *    - `outputs`: 다른 API(`GET /api/meetings/{id}/actions`)가 줄 값이라 이 연동 범위 밖이다.
 *      **빈 배열이 아니라 `null`이다** — 빈 배열로 두면 화면이 "하달된 액션이 없습니다"라고
 *      **안 물어본 것을 단정한다**.
 * ⚠️ **`script`는 여기서 안 채운다 — 다른 API다.** 발화 기록(ANLZ-05,
 *    `GET /api/meetings/{id}/transcripts`)은 이 함수가 받는 `BeMeetingDetail`에 없다.
 *    이 함수는 늘 `null`을 주고, 회의가 끝났으면(`pendingReason===null`) `server.ts`의
 *    `getLiveMeetingDetail`이 따로 조회해 덮어쓴다(`toScriptChunks`) — outputs와 같은 이유로
 *    비워 두지만, 그쪽과 달리 이 연동의 실제 범위 **안**이라 곧바로 채워진다.
 */
export function toMeetingDetailView(
  be: BeMeetingDetail,
  options: { isHost: boolean },
): MeetingDetail {
  return {
    id: String(be.meetingId),
    title: be.title,
    projectId: be.project.projectId,
    projectTag: be.project.tag,
    originLabel: originLabelFromTeamId(be.teamId),
    parentTeamActionHref: null,
    agenda: toMeetingAgenda(be.agenda),
    schedule:
      be.startAt && be.endAt ? formatMeetingSchedule(new Date(be.startAt), new Date(be.endAt)) : "",
    roomName: be.meetingRoom?.name ?? "",
    attendees: be.attendees.map((attendee) => ({
      id: attendee.memberId,
      name: attendee.name,
      isResigned: attendee.isResigned ?? false,
    })),
    outputKindLabel: outputKindLabelOf(be.teamId),
    outputs: null,
    script: null,
    pendingReason: meetingPendingReasonOf(be),
    pendingActionCount: be.pendingActionCount,
    /*
      ⚠️ **`FAILED`를 여기 넣지 않는다**(2026-08-16). `pendingReason`은 둘을 함께 "FAILED"로
         접지만(화면에서 할 말이 같아서), 이 값은 **원인을 가르는 자리**다 —
         `STALLED`는 "서버 문제로 멈춤(다시 분석하면 대개 풀린다)"이고 `FAILED`는 "계층이
         실제로 실패"다. 넓히면 실패한 회의에 "다시 분석하면 됩니다"라는 거짓 안내가 붙는다.
    */
    isStalled: be.summaryStatus === BE_SUMMARY_STATUS.STALLED,
    isHost: options.isHost,
    /*
     * ⚠️ **`meetingRoom`이 이제 실제 신호다**(2026-08-15, MEET-18 배포 확인). 응답에 별도
     *    `isOnline` 필드는 없다 — 회의실이 없다는 것 자체가 비대면 회의라는 뜻이라
     *    (`BeMeetingDetail.meetingRoom` 주석) 이 값 하나로 가른다.
     */
    isOnline: be.meetingRoom === null,
    recordingConsent: be.recordingConsent,
    editableSlot: toEditableSlot(be),
  };
}

/**
 * 회의 수정 다이얼로그의 슬롯 피커 초기값(#436) — `startAt`·`meetingRoom`을 피커가 그대로
 * 받는 형식(`YYYY-MM-DD`·`HH:mm`·문자열 id)으로 바꾼다. 둘 중 하나라도 없으면(비대면 회의)
 * `null`이다 — `MeetingDetail.editableSlot` 주석 참고.
 */
function toEditableSlot(
  be: Pick<BeMeetingDetail, "startAt" | "meetingRoom">,
): MeetingDetail["editableSlot"] {
  if (!be.startAt || !be.meetingRoom) return null;
  const start = new Date(be.startAt);
  return {
    date: format(start, "yyyy-MM-dd"),
    startTime: format(start, "HH:mm"),
    meetingRoomId: String(be.meetingRoom.meetingRoomId),
  };
}

/**
 * 산출물 머리말 — Owner 회의는 팀 액션을, 팀 회의는 개인 액션을 하달한다(WORKFLOW §2·§5,
 * 목 경로 `outputsOf`와 같은 판정). **BE #461 배포 전(`undefined`)엔 상위어 `액션`이다.**
 */
function outputKindLabelOf(teamId: number | null | undefined): string {
  if (teamId === undefined) return "액션";
  return teamId === null ? "팀 액션" : "개인 액션";
}

/**
 * 회의별 액션 조회(FR-AC-09, `GET /api/meetings/{id}/actions`) 한 줄 → 산출물 카드 한 줄.
 *
 * ⚠️ **BE `MeetingActionItem` 경로는 회의 상세 화면 내부 조회라 `projectTag`·`projectName`·
 *    `sourceMeetingTitle`을 일부러 비워 준다**(BE `ActionSummaryResponse` 주석). 우리 화면도
 *    회의 안이라 그 값이 없어도 산출물 카드 그리기에 지장이 없다.
 * ⚠️ TEAM 액션은 `assigneeName`이 null · PERSONAL 액션은 `teamName`이 null로 온다 —
 *    화면 계약(`MeetingOutput.assignee`)은 non-null 문자열이라 정본 문구로 접는다
 *    (§정직성 · 목 경로 `outputsOf`의 "담당자 미정"과 같은 자리).
 * ⚠️ **`href`는 BE `actionType`으로 가른다.** TEAM은 팀 액션 상세(프로젝트 하위), PERSONAL은
 *    개인 액션 상세로 가는 게 목 경로와 같다.
 */
type BeMeetingActionSummary = {
  id: number;
  actionType: "TEAM" | "PERSONAL";
  title: string;
  status: MeetingOutput["status"];
  dueDate: string;
  assigneeName: string | null;
  teamName: string | null;
  projectId: number;
};

export function toMeetingOutput(be: BeMeetingActionSummary): MeetingOutput {
  const isTeam = be.actionType === "TEAM";
  return {
    id: be.id,
    name: be.title,
    assignee: isTeam ? (be.teamName ?? "부서 미정") : (be.assigneeName ?? "담당자 미정"),
    status: be.status,
    dueDate: be.dueDate,
    href: isTeam ? `/app/projects/${be.projectId}/team/${be.id}` : `/app/actions/${be.id}`,
  };
}

/** BE 안건 → 화면 계약 — 이름만 옮긴다. `null`(안건 없음·미배포)은 그대로 `null`이다. */
function toMeetingAgenda(agenda: BeMeetingDetail["agenda"]): MeetingAgenda | null {
  if (agenda === undefined || agenda === null) return null;
  return { main: agenda.mainTopic, subs: agenda.subTopics };
}

/**
 * 발화 기록(ANLZ-05) — `GET /api/meetings/{id}/transcripts`.
 *
 * ⚠️ **화자를 안 싣는다.** BE는 `speakerMemberId`·`speakerSource`도 주지만(오귀속 대비 근거),
 *    화면 계약(`ScriptChunk`)은 시각·본문뿐이다 — 자막은 "화자 없는 청크"라는 게 팀이 정한
 *    표시 방식이다(화자 귀속 단순화 작업과 같은 결). 근거가 필요해지면 그때 칸을 늘린다.
 * ⚠️ `speakerMemberId === null`은 **정상**이다(BE 주석 — 판정 포기, 오류가 아니다). 화면이
 *    안 쓰는 값이라 여기서 걸러 낼 것도 없다.
 */
export interface BeUtterance {
  transcriptId: number;
  seq: number;
  speakerMemberId: number | null;
  speakerSource: string | null;
  startOffsetMs: number | null;
  endOffsetMs: number | null;
  content: string;
}

export interface BeTranscriptsResponse {
  utterances: BeUtterance[];
  nextCursor: string | null;
}

/**
 * 응답이 읽는 모양인가 — `parseMeetingDetail`과 같은 이유로 여기서도 한 번 본다(§정직성).
 * ⚠️ **화면이 쓰는 것만 본다.** `content`·`startOffsetMs`만 있으면 `at`·`text`를 만들 수
 *    있다 — `speakerMemberId`·`speakerSource`는 화면이 안 쓰므로 모양을 안 따진다.
 */
function isBeUtterance(value: unknown): value is BeUtterance {
  if (typeof value !== "object" || value === null) return false;
  const utterance = value as Partial<BeUtterance>;
  return (
    typeof utterance.transcriptId === "number" &&
    typeof utterance.content === "string" &&
    (utterance.startOffsetMs === null || typeof utterance.startOffsetMs === "number")
  );
}

function isBeTranscriptsResponse(value: unknown): value is BeTranscriptsResponse {
  if (typeof value !== "object" || value === null) return false;
  const response = value as Partial<BeTranscriptsResponse>;
  return (
    Array.isArray(response.utterances) &&
    response.utterances.every(isBeUtterance) &&
    (response.nextCursor === null ||
      response.nextCursor === undefined ||
      typeof response.nextCursor === "string")
  );
}

/** 검사까지 마친 발화 페이지 — 호출부는 이걸 통과한 값만 만진다(§정직성, `parseMeetingDetail`과 같은 자리). */
export function parseTranscriptsResponse(raw: unknown): BeTranscriptsResponse {
  if (!isBeTranscriptsResponse(raw)) {
    throw new Error("발화 기록 응답이 약속한 모양이 아닙니다.");
  }
  return { utterances: raw.utterances, nextCursor: raw.nextCursor ?? null };
}

/**
 * BE 발화 → 화면 청크. **시각은 회의 시작 시각 + 오프셋**이다 — `startOffsetMs`가 없으면
 * (화자 귀속과 무관한 결측) 회의 시작 시각으로 표시한다(0으로 둔다).
 *
 * ⚠️ **회의 로컬(한국) 시간대로 찍는다** — `formatClockTime`이 회의 시작 시각과 같은
 *    `TIME_PART`를 쓴다(`lib.ts`). 시계가 갈리면 "10:04에 한 말"이 회의 시작(10:00)보다
 *    이르게 보일 수 있다.
 */
export function toScriptChunks(meetingStart: Date, utterances: BeUtterance[]): ScriptChunk[] {
  return utterances
    .slice()
    .sort((a, b) => a.seq - b.seq)
    .map((utterance) => ({
      at: formatClockTime(new Date(meetingStart.getTime() + (utterance.startOffsetMs ?? 0))),
      text: utterance.content,
    }));
}
