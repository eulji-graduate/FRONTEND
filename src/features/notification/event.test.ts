import { PROCESSING_STATUS } from "@/constants/meeting";
import { NOTIFICATION_TYPE } from "@/constants/notification";

import {
  ANALYSIS_EVENT_STATE,
  parseNotificationEnvelope,
  toAnalysisSignal,
  toBannerNotification,
} from "./event";

/** BE `NotificationEvent` 레코드가 직렬화되는 모양 그대로 */
function raw(type: string, payload: unknown): string {
  return JSON.stringify({ type, payload });
}

describe("스트림 겉봉 읽기", () => {
  it("BE가 보내는 { type, payload }를 읽는다", () => {
    expect(parseNotificationEnvelope(raw("MEETING_CREATED", { meetingId: 1 }))).toEqual({
      type: "MEETING_CREATED",
      payload: { meetingId: 1 },
    });
  });

  /* 한 줄이 깨졌다고 구독 전체를 잃으면 안 된다 */
  it("깨진 줄은 버린다", () => {
    expect(parseNotificationEnvelope("{")).toBeNull();
    expect(parseNotificationEnvelope(JSON.stringify({ payload: {} }))).toBeNull();
  });
});

describe("배너 매핑", () => {
  it.each([
    NOTIFICATION_TYPE.MEETING_CREATED,
    NOTIFICATION_TYPE.MEETING_REMINDER,
    NOTIFICATION_TYPE.MEETING_CANCELED,
  ])("회의 알림(%s)은 회의 상세로 보낸다", (type) => {
    const envelope = parseNotificationEnvelope(
      raw(type, { meetingId: 42, message: "주간 회의가 개설되었습니다." }),
    );
    expect(toBannerNotification(envelope!)).toEqual({
      id: `${type}:42`,
      type,
      message: "주간 회의가 개설되었습니다.",
      href: "/app/meeting/42",
    });
  });

  /* 취소 payload에는 title이 없다 — title을 쓰면 취소 배너만 빈다 */
  it("제목이 없는 취소 알림도 문장을 그대로 띄운다", () => {
    const envelope = parseNotificationEnvelope(
      raw(NOTIFICATION_TYPE.MEETING_CANCELED, {
        meetingId: 9,
        message: "주간 회의가 취소되었습니다.",
        startAt: "2026-08-14T10:00:00",
        canceledAt: "2026-08-13T09:00:00",
      }),
    );
    expect(toBannerNotification(envelope!)?.message).toBe("주간 회의가 취소되었습니다.");
  });

  it("공지 알림은 공지 상세로 보낸다", () => {
    const envelope = parseNotificationEnvelope(
      raw(NOTIFICATION_TYPE.NOTICE_CREATED, {
        noticeId: 3,
        title: "휴무",
        message: "휴무 공지사항이 등록되었습니다.",
      }),
    );
    expect(toBannerNotification(envelope!)?.href).toBe("/app/notice/3");
  });

  /* BE가 새 종류를 먼저 배포해도 화면이 안 터져야 한다 */
  it("모르는 종류와 모양이 어긋난 payload는 버린다", () => {
    expect(toBannerNotification({ type: "SOMETHING_NEW", payload: { meetingId: 1 } })).toBeNull();
    expect(
      toBannerNotification({ type: NOTIFICATION_TYPE.MEETING_CREATED, payload: { message: "" } }),
    ).toBeNull();
  });
});

describe("분석 이벤트 이음매", () => {
  /*
    ⚠️ 배너 4종(`NOTIFICATION_TYPE`)과 분석 신호는 **다른 표**다 — 배너 종류가 분석 신호로
       잘못 읽히면 안 된다. `ANALYSIS_EVENT_STATE`가 채워진 뒤에도(2026-08-13, BE #460)
       이 경계는 그대로 지켜야 한다.
  */
  it("배너용 4종은 분석 신호가 아니다", () => {
    for (const type of Object.values(NOTIFICATION_TYPE)) {
      expect(toAnalysisSignal({ type, payload: { meetingId: 1 } })).toBeNull();
    }
  });

  /*
    ⚠️ BE `NotificationType.ANALYSIS_COMPLETED`·`ANALYSIS_FAILED`(2026-08-13 실코드 대조,
       BE #460)를 CAP-06 상태값으로 잇는다 — 이 표가 비면 스트림이 조용히 아무것도 안
       움직이는 회귀라 값을 직접 잠근다.
  */
  it("ANALYSIS_COMPLETED·ANALYSIS_FAILED가 표에 채워져 있다", () => {
    expect(ANALYSIS_EVENT_STATE).toEqual({
      ANALYSIS_COMPLETED: PROCESSING_STATUS.DONE,
      ANALYSIS_FAILED: PROCESSING_STATUS.FAILED,
    });
  });

  it("실제 이벤트가 오면 분석 신호로 옮긴다", () => {
    expect(
      toAnalysisSignal({
        type: "ANALYSIS_COMPLETED",
        payload: {
          meetingId: 11,
          title: "스프린트 회의",
          message: "요약이 완료되었습니다",
          topicCount: 3,
        },
      }),
    ).toEqual({ meetingId: "11", status: PROCESSING_STATUS.DONE });

    expect(
      toAnalysisSignal({
        type: "ANALYSIS_FAILED",
        payload: {
          meetingId: 12,
          title: "회고",
          message: "요약이 실패했습니다",
          errorCode: "AI-001",
        },
      }),
    ).toEqual({ meetingId: "12", status: PROCESSING_STATUS.FAILED });
  });

  /*
    ⚠️ BE가 타입 이름을 확정하면 `ANALYSIS_EVENT_STATE`에 한 줄 적는 것만으로 스트림이
       카드를 움직인다 — 여기서는 이름을 지어내지 않으려고 표를 주입해 그 길만 확인한다.
  */
  it("표에 이름이 적히는 순간 스트림이 카드를 움직인다", () => {
    const table = { ANALYSIS_DONE: PROCESSING_STATUS.DONE } as const;
    /* ⚠️ BE는 숫자로 보내지만 카드가 쥔 id는 문자열이다 — 매퍼가 여기서 맞춰 준다 */
    expect(toAnalysisSignal({ type: "ANALYSIS_DONE", payload: { meetingId: 11 } }, table)).toEqual({
      meetingId: "11",
      status: PROCESSING_STATUS.DONE,
    });
    /* 어느 회의인지 모르면 카드를 못 고른다 — 조용히 남의 카드를 바꾸지 않는다 */
    expect(toAnalysisSignal({ type: "ANALYSIS_DONE", payload: {} }, table)).toBeNull();
  });
});
