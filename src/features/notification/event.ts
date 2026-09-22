import { z } from "zod";

import { PROCESSING_STATUS, type ProcessingStatus } from "@/constants/meeting";
import { isNotificationType, NOTIFICATION_TYPE } from "@/constants/notification";

import type { BannerNotification } from "./types";

/**
 * 알림 SSE 매퍼 — **BE shape을 여기서 흡수한다**(§Mock → Live 격리막).
 *
 * BE 계약([확인] 실코드 대조 2026-08-13):
 *   · 이벤트 이름은 `notification` · `heartbeat` 둘뿐이다(`NotificationStreamRegistry`)
 *   · `notification`의 data = `NotificationEvent` 레코드 = `{ type, payload }`
 *   · `type`은 `NotificationType` enum 이름 문자열 · `payload`는 종류마다 다른 객체
 *
 * ⚠️ **`safeParse`로 받는다**(PR 체크리스트 §zod). 스트림은 바깥에서 들어오는 값이라
 *    모양이 어긋날 수 있는데, 한 줄이 깨졌다고 배너 전체를 잃으면 안 된다 — 못 읽은 줄은
 *    버리고 다음 줄을 읽는다(`use-live-captions`의 `try/catch`와 같은 태도).
 * ⚠️ **모르는 `type`은 조용히 버린다.** BE가 새 종류를 먼저 배포해도 화면이 안 터진다.
 */

/** `notification` 이벤트의 겉봉 — 속은 종류마다 다르므로 `unknown`으로 받는다. */
const notificationEnvelopeSchema = z.object({
  type: z.string(),
  payload: z.unknown(),
});

export interface NotificationEnvelope {
  type: string;
  payload: unknown;
}

/**
 * `event.data`(JSON 문자열) → 겉봉. 못 읽으면 `null`.
 * ⚠️ `JSON.parse`는 던진다 — 스트림 한 줄 때문에 구독이 끊기지 않게 여기서 잡는다.
 */
export function parseNotificationEnvelope(raw: string): NotificationEnvelope | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = notificationEnvelopeSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/*
  payload 스키마 — **화면이 실제로 쓰는 칸만** 적는다(zod는 남는 칸을 통과시킨다).

  ⚠️ 종류마다 칸이 다르다(BE 실코드):
     · MEETING_CREATED  { meetingId, title, message, startAt, endAt }
     · MEETING_REMINDER { meetingId, title, message, startAt, endAt, meetingRoomId, meetingRoomName }
     · MEETING_CANCELED { meetingId, message, startAt, canceledAt }   ← **title이 없다**
     · NOTICE_CREATED   { noticeId, title, message }
  ⚠️ 그래서 배너는 `title`을 안 쓴다 — 한 종류에만 없는 칸을 쓰면 취소 배너만 빈다.
     `message`에 이미 제목이 들어 있다(BE가 `event.title() + " 회의가 개설되었습니다."`로 만든다).
*/
const meetingPayloadSchema = z.object({
  meetingId: z.number(),
  message: z.string().min(1),
});

const noticePayloadSchema = z.object({
  noticeId: z.number(),
  message: z.string().min(1),
});

/**
 * 겉봉 → 상단 배너 한 줄. 배너로 띄울 종류가 아니거나 모양이 어긋나면 `null`.
 *
 * ⚠️ **가는 곳까지 여기서 정한다.** 컴포넌트가 `type`을 보고 주소를 조립하면 라우트가
 *    바뀔 때 화면을 고쳐야 한다(§라우트 그룹 — 링크는 `<Link>`, 주소는 한 곳에서).
 */
export function toBannerNotification(envelope: NotificationEnvelope): BannerNotification | null {
  if (!isNotificationType(envelope.type)) return null;

  if (envelope.type === NOTIFICATION_TYPE.NOTICE_CREATED) {
    const parsed = noticePayloadSchema.safeParse(envelope.payload);
    if (!parsed.success) return null;
    return {
      id: `${envelope.type}:${parsed.data.noticeId}`,
      type: envelope.type,
      message: parsed.data.message,
      href: `/app/notice/${parsed.data.noticeId}`,
    };
  }

  const parsed = meetingPayloadSchema.safeParse(envelope.payload);
  if (!parsed.success) return null;
  return {
    id: `${envelope.type}:${parsed.data.meetingId}`,
    type: envelope.type,
    message: parsed.data.message,
    /*
      ⚠️ **취소된 회의도 상세로 보낸다.** 소프트 취소라 화면이 남아 있고(`MEETING_STATUS.CANCELED`),
         "왜 취소됐는지"를 볼 자리가 거기다 — 링크를 떼면 사람이 갈 곳이 없다.
    */
    href: `/app/meeting/${parsed.data.meetingId}`,
  };
}

/* ─────────────────────── 분석 이벤트 이음매 ─────────────────────── */

/**
 * 분석 이벤트 `type` → CAP-06 상태값.
 *
 * ⚠️ **채웠다**(2026-08-13, BE 실코드 대조 — `notification/domain/model/NotificationType.java`
 *    에 `ANALYSIS_COMPLETED`·`ANALYSIS_FAILED`가 있다, BE #460). 이 한 줄이 채워진 순간
 *    스트림이 카드를 직접 움직이고, 폴링(`use-analysis-tracker`)은 보조로 내려간다 —
 *    **카드·배너 컴포넌트는 안 고쳤다.**
 * ⚠️ payload는 `{meetingId, title, message, topicCount|errorCode}`인데(트리거 클래스
 *    `AnalysisCompletedPayload`·`AnalysisFailedPayload`), 여기서 꺼내는 건 `meetingId`
 *    하나뿐이다 — 아래 `analysisPayloadSchema`가 정한다(zod가 남는 칸은 그냥 통과시킨다).
 */
export const ANALYSIS_EVENT_STATE: Readonly<Record<string, ProcessingStatus>> = {
  ANALYSIS_COMPLETED: PROCESSING_STATUS.DONE,
  ANALYSIS_FAILED: PROCESSING_STATUS.FAILED,
};

const analysisPayloadSchema = z.object({ meetingId: z.number() });

export interface AnalysisSignal {
  /**
   * ⚠️ **문자열로 내보낸다.** BE payload는 숫자지만 카드가 들고 있는 id는 화면 쪽 문자열이라
   *    (`AnalysisTracking.meetingId`), 여기서 안 맞추면 프로바이더의 "쫓던 회의가 맞나"
   *    비교가 언제나 거짓이 되어 스트림이 카드를 못 움직인다.
   */
  meetingId: string;
  status: ProcessingStatus;
}

/**
 * 겉봉 → 분석 신호. 분석 이벤트가 아니거나 모양이 어긋나면 `null`.
 *
 * ⚠️ 표를 인자로 받는 건 **테스트가 이름을 지어내지 않고도 이음매를 검사**하기 위해서다 —
 *    BE가 이름을 확정하면 기본값(`ANALYSIS_EVENT_STATE`)에만 적으면 된다.
 */
export function toAnalysisSignal(
  envelope: NotificationEnvelope,
  eventStates: Readonly<Record<string, ProcessingStatus>> = ANALYSIS_EVENT_STATE,
): AnalysisSignal | null {
  const status = eventStates[envelope.type];
  if (!status) return null;

  const parsed = analysisPayloadSchema.safeParse(envelope.payload);
  if (!parsed.success) return null;

  return { meetingId: String(parsed.data.meetingId), status };
}
