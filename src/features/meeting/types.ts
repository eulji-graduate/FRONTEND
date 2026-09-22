/**
 * 회의(Meeting) — 격리막의 UI 계약(CLAUDE.md §Mock 격리막).
 * ⚠️ **최소 스캐폴딩이다.** `/app/meeting`(목록·상세·캡처·AI 리뷰)은 별도 이슈다 — 지금은
 *    회의실 예약이 만드는 레코드 하나만 담는다(WORKFLOW.md §3-1: "회의실 예약 = 회의 개설"이
 *    하나의 동작이라, 예약만 저장하고 회의를 안 만들면 스펙과 어긋난다).
 */

import type { Authority } from "@/constants/authority";
import type { AiSummaryStatus } from "@/constants/meeting";

import type { MeetingTopicInput } from "../rooms/types";

/** 회의 안건 대주제/소주제 한 쌍 — 자유 입력 텍스트다(고정 enum 아님, WORKFLOW.md §3-1). */
export interface MeetingTopic {
  main: string;
  sub: string;
}

interface MeetingCommon {
  title: string;
  /**
   * ⚠️ 비대면 회의(`isOnline`)는 WORKFLOW.md §3-1-A 확정대로 실제 일정이 없다("`startAt`·
   *    `endAt`은 사용자가 입력하지 않고 DB에도 저장하지 않는다") — 여기서는 **제출 시각**을
   *    담아 목록 정렬 키로만 쓴다(그 문서도 "시간 없는 회의를 어디에 둘지는 BE가 정한다"고
   *    남겨 둔 채라 FE 임시값이다). 화면은 `isOnline`이면 이 값을 절대 읽지 않는다
   *    (`schedule`이 빈 문자열로 비워진다) — 지어낸 일정이 화면에 보이는 일은 없다.
   */
  start: Date;
  end: Date;
  /** ⚠️ 비대면 회의(`isOnline`)는 회의실이 없다 — `null`이다(이슈 #473). */
  roomId: string | null;
  /** ⚠️ 비대면 회의는 `null`이다 — `roomId`와 같은 이유. */
  roomName: string | null;
  /** ⚠️ 프로젝트 태그는 항상 필수다(WORKFLOW.md §3-1) — 프로젝트에 안 묶인 회의는 없다. */
  projectId: number;
  projectTag: string;
  /** 최소 1쌍(대주제+소주제) — 나머지는 "추가/삭제"로 늘고 준다. */
  topics: [MeetingTopic, ...MeetingTopic[]];
  attendeeIds: number[];
  /** 개설자 — 회의 조작 권한의 기준(권한 ②축, `lib/permission.ts`의 `canOperateMeeting`). */
  hostId: number;
  /** 이 회의를 만든 예약 — 회의실 예약이 만든 회의라야 있다. 비대면 회의는 예약 자체가 없어
   *  `null`이다(이슈 #473 — "회의실·시간 없이 예약"). */
  roomReservationId: string | null;
  /**
   * 비대면(원격) 회의인가(이슈 #473). `true`면 회의실·시간이 없고, 제출 즉시 완료 처리된다
   * (캡처 화면을 거치지 않는다) — 대면 회의(`false`)와 상태 흐름 자체가 다르다.
   */
  isOnline: boolean;
  /**
   * 첨부한 녹음 파일의 원래 이름 — **목에서만 쓰는 겉치레 값이다.** BE에 파일을 실제로
   * 올리는 자리가 없어(이슈 #473, BE API 미확정) 바이트를 저장하지 않는다 — 파일명만
   * 기억해 화면에 "첨부했다"는 사실만 보여준다(§정직한 목업: 실제 업로드인 척하지 않는다).
   * 첨부 안 했으면 `null`이다.
   */
  recordingFileName: string | null;
}

/**
 * Owner가 개설 = 프로젝트 회의(WORKFLOW.md §2·§3-1). "상위 팀 액션" 개념 자체가 없다 —
 * `hostTeamId`·`parentTeamActionId`는 아예 못 넣는다(타입으로 막는다).
 */
interface OwnerHostedMeeting extends MeetingCommon {
  hostAuthority: Extract<Authority, "OWNER">;
  hostTeamId?: undefined;
  parentTeamActionId?: undefined;
}

/**
 * Leader/Member가 개설 = 팀 액션 회의(WORKFLOW.md §5). 개설자의 소속 팀(`hostTeamId`)과
 * 상위 팀 액션(`parentTeamActionId`)이 **둘 다 필수**다 — 하나만 있는 회의는 만들 수 없다.
 */
interface TeamActionHostedMeeting extends MeetingCommon {
  hostAuthority: Extract<Authority, "LEADER" | "MEMBER">;
  hostTeamId: number;
  parentTeamActionId: number;
}

/** 회의 생성 입력 — id·createdAt은 서버(mock 스토어)가 채운다. */
export type MeetingDraft = OwnerHostedMeeting | TeamActionHostedMeeting;

/**
 * 회의 한 건 — `MeetingDraft`에 서버가 채우는 것들을 더한다.
 *
 * ⚠️ **`endedAt`은 상태를 저장하는 유일한 자리다.** 예정·진행중은 지금 시각과 `start`·`end`로
 *    계산하면 되지만(§도메인 상수: 파생값은 계산한다), **완료는 계산할 수 없다** —
 *    끝나는 시각이 지났다고 완료가 아니라 Host가 [회의 종료 및 제출]을 눌러야 완료다
 *    (WORKFLOW §3-3, 그래서 되돌릴 수도 없다). 안 누르고 끝난 회의는 시간이 지나도 완료가 아니다.
 * ⚠️ 예약이 만들 때는 늘 `null`이다 — 방금 잡은 회의가 끝나 있을 리 없다.
 */
export type Meeting = MeetingDraft & {
  id: string;
  createdAt: string;
  /** 종료를 누른 시각(ISO). 안 눌렀으면 `null` */
  endedAt: string | null;
  /**
   * 취소한 시각(ISO, MEET-06). 취소 안 했으면 `null`.
   *
   * ⚠️ **시작 전 회의만 취소할 수 있다** — 종료(`endedAt`)와 취소(`canceledAt`)는 동시에 채워질
   *    수 없다(`meetingStatusOf`가 취소를 먼저 본다). 물리 삭제하지 않는다 — 인수인계서가
   *    출처 회의를 나중에 다시 열람해야 한다(BE `V3.3.3`과 같은 이유).
   */
  canceledAt: string | null;
  /**
   * 종료 뒤 서버가 돌리는 AI 분석이 어디까지 갔는지.
   *
   * ⚠️ **회의 상태와 다른 축이다.** 종료를 누르면 회의는 곧바로 완료지만 요약·액션 추출은
   *    그때부터 몇 분 걸린다(WORKFLOW §3-3 4·5) — 이 값을 안 두면 아직 아무 산출물도 없는
   *    회의가 "완료 카드"로 열려 빈 회의록을 보게 된다(§정직성).
   * ⚠️ **프론트가 분석을 부르지 않는다.** 서버가 종료 처리 안에서 큐에 걸고 실패해도 재시도한다 —
   *    화면은 `/processing-status`를 폴링해 **읽기만** 한다.
   * ⚠️ 안 끝난 회의는 `null`이다 — 시작도 안 한 일에 대기라고 적으면 상태가 하나 늘어난다.
   */
  aiSummaryStatus: AiSummaryStatus | null;
  /**
   * 녹음 동의(MEET-05) — 개설 시점엔 이 값을 받는 입력이 없어 항상 `false`로 만들어진다
   * (`addMockMeeting`·`addMockOnlineMeeting`) — 회의 수정 다이얼로그(#436)가 유일하게
   * 이 값을 바꾼다(`updateMockMeeting`). `MeetingDraft`가 아니라 여기 두는 이유도 같다 —
   * 만들 때는 아무도 이 값을 넣어 보내지 않는다.
   */
  recordingConsent: boolean;
};

/**
 * 비대면 회의 녹음 파일 — S3에 직접 올린 결과(이슈 #473, 2026-08-14 계약 변경). 바이트는
 * 여기 없다 — presigned URL 발급(`getOnlineMeetingRecordingUploadUrlAction`)과 브라우저의
 * S3 PUT이 끝난 뒤 그 결과(`s3Key` 등)만 담아 `POST /api/meetings/online` 요청에 싣는다.
 */
export interface OnlineMeetingRecordingInfo {
  s3Key: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

/**
 * 비대면 회의 만들기 폼 입력(이슈 #473) — `RoomReservationDraft`와 같은 필드를 쓰되
 * **회의실·시간대가 없다**(`roomId`·`date`·`startTime` 없음). 제출하면 그 자리에서 완료
 * 처리되므로 잡을 시간 자체가 없다.
 * ⚠️ `topics`는 `rooms/types.ts`의 `MeetingTopicInput`을 그대로 쓴다 — 회의 주제 입력은
 *    대면·비대면이 같은 모양이라 타입을 새로 만들지 않는다(교차 도메인 재사용은
 *    `rooms/mock/reservations.ts`가 `features/meeting`을 참조하는 것과 같은 전례다).
 * ⚠️ **`recording`이 필수다**(2026-08-14 계약 변경 — 단일 모달로 바뀌며 녹음 제출이 선택
 *    단계에서 등록 자체의 일부가 됐다). `null`은 "아직 파일을 안 올렸다"는 뜻으로 폼 조립
 *    단계에서만 잠깐 거친다 — `validateOnlineMeetingDraft`가 이 상태를 막는다.
 */
export interface OnlineMeetingDraft {
  title: string;
  /** 항상 필수다(WORKFLOW.md §3-1과 같은 규칙) — 프로젝트에 안 묶인 회의는 없다. */
  projectId: string;
  topics: MeetingTopicInput[];
  attendeeIds: number[];
  /** Host가 Leader/Member일 때만 필수 — `RoomReservationDraft`와 같은 규칙. */
  parentTeamActionId?: number;
  recording: OnlineMeetingRecordingInfo | null;
}

export type OnlineMeetingFormErrors = Partial<Record<keyof OnlineMeetingDraft, string>>;

/**
 * 회의 수정(MEET-05) 폼 입력(#436) — `RoomReservationDraft`와 닮았지만 **참석자·안건·상위
 * 팀 액션이 없다.** BE가 수정으로 받는 6필드(`title`·`projectId`·`meetingRoomId`·`startAt`·
 * `endAt`·`recordingConsent`) 중 시간·회의실은 예약과 같은 슬롯 피커로 고치므로 `date`·
 * `startTime`·`roomId` 모양을 그대로 따른다(`rooms/types.ts`의 `RoomReservationDraft`와 같은 이름).
 */
export interface MeetingEditDraft {
  title: string;
  roomId: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:mm" — 30분 단위 슬롯의 시작 시각 */
  startTime: string;
  projectId: string;
  recordingConsent: boolean;
}

export type MeetingEditFormErrors = Partial<
  Record<Exclude<keyof MeetingEditDraft, "recordingConsent">, string>
>;
