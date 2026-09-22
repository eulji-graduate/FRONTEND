/**
 * 비대면 회의 생성(`POST /api/meetings/online`, MEET-18) BE shape → UI 계약(이슈 #473).
 * [확인] BE 실코드 대조 완료(2026-08-16) —
 *   `OnlineMeetingController.java` · `OnlineRecordingUploadController.java` ·
 *   `OnlineRecordingUploadUrlService.java` · `OnlineMeetingRecordingAdapter.java` ·
 *   `RecordingFilePolicy.java`.
 * ⚠️ `rooms/mapper/meetings.ts`의 `toCreateMeetingPayload`/`toSentTopics`와 같은 자리 나눔이다 —
 *    회의실·시간 필드만 없을 뿐 안건 접기 규칙은 같다.
 */

import type { MeetingTopicInput } from "../../rooms/types";
import type { OnlineMeetingDraft } from "../types";

/** `POST /api/meetings/online/recordings/upload-url` 요청 본문. */
export interface BeRecordingUploadUrlRequest {
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

/**
 * `POST /api/meetings/online/recordings/upload-url` 응답.
 *
 * ⚠️ `expiresInSeconds`는 화면에서 안 쓴다 — 만료 전에 바로 PUT하므로 카운트다운이 필요 없다.
 * ⚠️ **`fileName`은 원본이 아니라 BE가 정제한 저장용 이름이다**
 *    ([확인] `OnlineRecordingUploadUrlService.java` — `RecordingFilePolicy.sanitizeForStorageName`이
 *    영숫자·`.`·`-`·`_` 외 모든 글자를 `_`로 치환한다). `s3Key`가 이 이름으로 끝나고, MEET-18
 *    확정 단계가 `s3Key.endsWith("/" + fileName)`을 검사한다
 *    (`OnlineMeetingRecordingAdapter.java`) — 원본 이름을 그대로 보내면 한글·공백·괄호가 든 파일명이
 *    **전부 400 CAP-015**로 튕긴다. MEET-18에는 이 응답의 `fileName`을 **그대로** 실어야 한다.
 */
export interface BeRecordingUploadUrlResponse {
  s3Key: string;
  /** BE가 정제한 저장용 파일명 — MEET-18 `recording.fileName`에 이 값을 그대로 되돌려 싣는다. */
  fileName: string;
  presignedUrl: string;
  expiresInSeconds: number;
}

/**
 * `POST /api/meetings/online`(MEET-18) 요청 본문.
 * ⚠️ `recordingConsent`는 **아예 안 싣는다** — 서버가 항상 `true`로 고정한다고 팀이 확정했다
 *    (2026-08-14). 보내 봐야 서버가 무시하는 값이라, 보내는 척하면 거짓 UI다(§정직한 목업).
 * ⚠️ `relatedActionId`: `parentTeamActionId`가 같은 개념이라 그대로 싣는다 — MEET-01과 같은 이름 매핑.
 * ⚠️ `meetingRoomId`·`startAt`·`endAt`이 **아예 없다**(옵셔널이 아니라 필드 자체가 없다) — 비대면
 *    회의는 회의실·시간을 안 받는다(팀 명세).
 * ⚠️ **`recording`이 필수다**(2026-08-14 계약 변경) — 등록 버튼 한 번으로 업로드 URL 발급 →
 *    S3 PUT → 이 호출이 순서대로 이어지므로, 이 시점엔 이미 S3에 올라간 파일의 `s3Key`가 있다.
 */
export interface BeCreateOnlineMeetingPayload {
  title: string;
  projectId: number;
  relatedActionId?: number;
  attendeeMemberIds: number[];
  mainTopic: string;
  subTopics: string[];
  recording: {
    s3Key: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  };
}

/**
 * 계약이 실제로 받는 안건 모양(대주제 1개 + 소주제 여러 개)으로 좁힌다 — `rooms/mapper/meetings.ts`의
 * `toSentTopics`와 같은 규칙(§정직성: 버려진 값을 저장된 것처럼 보이면 안 된다). 회의실 예약과
 * 안건 UI가 같은 모양(`MeetingTopicInput`)을 쓰기 때문에 접는 방식도 같아야 한다.
 */
function toSentTopics(topics: MeetingTopicInput[]): { mainTopic: string; subTopics: string[] } {
  return {
    mainTopic: topics[0]?.main.trim() ?? "",
    subTopics: topics.map((topic) => topic.sub.trim()).filter((sub) => sub.length > 0),
  };
}

/**
 * ⚠️ `draft.recording`이 `null`이면 던진다 — 여기 닿기 전에 `validateOnlineMeetingDraft`가
 *    이미 막아야 정상이다(폼 조작으로 뚫려도 존재하지 않는 파일 정보를 지어내지 않는다).
 */
export function toCreateOnlineMeetingPayload(
  draft: OnlineMeetingDraft,
): BeCreateOnlineMeetingPayload {
  if (!draft.recording) throw new Error("녹음 파일 정보 없이 비대면 회의를 만들 수 없습니다");

  const { mainTopic, subTopics } = toSentTopics(draft.topics);
  return {
    title: draft.title.trim(),
    projectId: Number(draft.projectId),
    relatedActionId: draft.parentTeamActionId,
    attendeeMemberIds: draft.attendeeIds,
    mainTopic,
    subTopics,
    recording: draft.recording,
  };
}

/**
 * `POST /api/meetings/online` 성공 응답 — [확인] 도메인 담당자 문서(2026-08-14).
 * ⚠️ `status`는 실제로 항상 `"DONE"`이다 — 비대면 회의는 만들어지는 순간 이미 완료다(팀 확정,
 *    `mock/meetings.ts`의 `addMockOnlineMeeting`과 같은 규칙). `meetingRoom`·`startAt`·`endAt`은
 *    응답에 아예 없다.
 */
export interface BeCreateOnlineMeetingResponse {
  meetingId: number;
  status: "DONE";
  title: string;
  isOnline: true;
  recordingConsent: true;
  host: { memberId: number; name: string };
  attendees: { memberId: number; name: string; teamName?: string }[];
}
