import type { NotificationType } from "@/constants/notification";

/**
 * 알림 UI 계약 — **화면은 이 모양만 안다**(§Mock → Live 격리막).
 *
 * BE가 실제로 무엇을 어떤 봉투에 담아 보내는지는 `event.ts`(매퍼)가 흡수한다. 스트림에
 * 분석 이벤트가 생기든 폴링으로 알아내든, 카드가 보는 것은 아래 `AnalysisTracking` 하나다 —
 * **소스가 바뀌어도 컴포넌트는 0줄 고친다.**
 */

/**
 * 상단 배너 한 줄(회의 개설·리마인더·취소·공지).
 *
 * ⚠️ **문구를 코드로 조립하지 않는다.** `message`는 BE가 만들어 보낸 한국어 문장 그대로다
 *    (`lib/api.ts` 주석과 같은 규칙) — 우리가 다시 쓰면 같은 사실을 두 곳이 말하게 된다.
 */
export interface BannerNotification {
  /**
   * 화면 목록 키.
   * ⚠️ **BE payload에 알림 id가 없다**(실코드 확인 — 저장된 알림의 id는 스트림에 안 실린다).
   *    그래서 `종류:대상id`로 만든다 — 재연결로 같은 알림이 다시 와도 한 줄로 접힌다
   *    (§목록: 이어 붙일 때 id로 중복을 거른다와 같은 이유).
   */
  id: string;
  type: NotificationType;
  /** BE가 보낸 문장 그대로 */
  message: string;
  /** 눌렀을 때 갈 곳. 대상을 모르면 `null`이고 그러면 링크가 아니라 문장만 남는다 */
  href: string | null;
}

/**
 * BE 알림이 아니라 **프론트가 직접 합성해 종 목록에 끼워 넣는** 항목의 종류.
 *
 * ⚠️ **`constants/notification.ts`의 `NOTIFICATION_TYPE`에 안 넣는다.** 그건 "BE
 *    `NotificationType` enum 그대로"가 규칙이라(그 파일 주석) — 임시 비밀번호 안내는 SSE로
 *    오지 않고 `/me` 조회값(`passwordChanged`)에서 프론트가 만들어 낸다. 종류가 다르니
 *    상수도 따로 둔다.
 */
export const LOCAL_NOTIFICATION_KIND = {
  PASSWORD_TEMP: "PASSWORD_TEMP",
} as const;
export type LocalNotificationKind =
  (typeof LOCAL_NOTIFICATION_KIND)[keyof typeof LOCAL_NOTIFICATION_KIND];

/**
 * 종 드롭다운 목록 한 줄 — `BannerNotification` + 읽음 여부.
 *
 * ⚠️ **읽음 처리는 서버 API가 없다.** 클릭하면 이 자리(리액트 쿼리 캐시)에서만 뒤집힌다 —
 *    새로고침하면 다시 안 읽음으로 보인다. BE에 읽음 엔드포인트가 생기면 그때 매핑한다.
 * ⚠️ **삭제도 서버 API가 없다.** 지우면 캐시에서만 빠진다 — 임시 비밀번호 항목만
 *    예외로, 지운 기록을 `localStorage`에 남긴다(`use-password-notice.ts`).
 */
export interface NotificationItem extends Omit<BannerNotification, "type"> {
  type: NotificationType | LocalNotificationKind;
  read: boolean;
  /** 받은 시각(epoch ms) — 목록의 "n분 전" 표시용, 브라우저에서 찍는다(BE가 안 준다) */
  receivedAt: number;
}

/**
 * 우측 하단 지속형 카드의 상태.
 *
 * ⚠️ **`NOT_STARTED`가 여기 없다.** BE의 CAP-06 값은 4개지만 사람이 봐야 하는 사실은
 *    "아직인가 · 됐나 · 깨졌나 · 모르겠나" 넷이다. 종료 직후의 `NOT_STARTED`는 사람에게는
 *    그냥 「요약 중」이다(§도메인 상수: 파생값은 상태 필드가 아니라 계산).
 * ⚠️ **`UNAVAILABLE`을 없애지 않는다.** 폴링이 계속 실패하거나 상한을 넘겼을 때 스피너를
 *    계속 돌리면 화면이 거짓말을 한다 — 못 알아냈다고 말하고 [다시 시도]를 준다(§정직성).
 */
export const ANALYSIS_CARD_STATE = {
  RUNNING: "RUNNING",
  DONE: "DONE",
  FAILED: "FAILED",
  UNAVAILABLE: "UNAVAILABLE",
} as const;
export type AnalysisCardState = (typeof ANALYSIS_CARD_STATE)[keyof typeof ANALYSIS_CARD_STATE];

/** 지금 쫓고 있는 회의 하나. 카드가 통째로 이 값을 그린다. */
export interface AnalysisTracking {
  /**
   * 화면이 쓰는 회의 id — **문자열이다**(`MeetingCaptureInfo.id`·라우트 `[meetingId]`와 같은 값).
   *
   * ⚠️ **숫자로 바꿔 들고 있으면 안 된다.** 목 회의 id는 `meeting-3`이라 `Number()`가 `NaN`이
   *    되는데, `NaN === NaN`은 거짓이라 프로바이더의 "쫓던 회의가 맞나" 비교가 전부 빗나가
   *    카드가 「요약 중」에서 영영 안 바뀐다(§정직성). 숫자가 필요한 건 BE 경로 하나뿐이라
   *    변환은 `actions.ts`(API 경계)에서 한다 — `server.ts`의 `ep.meeting(Number(id))`와 같다.
   */
  meetingId: string;
  /** 카드에 적을 회의 제목 — 목록으로 튕긴 뒤에도 무엇이 도는지 알아야 한다 */
  title: string;
  state: AnalysisCardState;
  /** 쫓기 시작한 시각(epoch ms). 상한(`ANALYSIS_POLL_MAX_MS`)을 재는 자리다 */
  startedAt: number;
  /** 몇 번째 조회인지. 목 진행과 로그에 쓴다 */
  attempt: number;
  /** 연속 실패 횟수. 성공하면 0으로 돌아간다 */
  failures: number;
}
