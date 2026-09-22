/**
 * 워크벤치 공지 — 격리막의 UI 계약(CLAUDE.md §Mock 격리막).
 * 컴포넌트는 이 타입만 알고, 목/실서버 분기는 `server.ts`가 끝낸다.
 */

/**
 * 공지 한 건(본문 포함). 목록은 본문을 뺀 요약만 쓴다.
 *
 * ⚠️ **`isRead`가 없다**(2026-08-16 폐지 — NOTI-01·02 응답에 읽음 여부가 없어 실서버에서는
 *    늘 `false`만 나가는 값이었다. 목에서만 진짜처럼 보였을 뿐이라 §정직성에 어긋났다).
 *    "공지에 새 게 있다"는 이제 사이드바 점 하나로만 알린다 — 그 점은 종 드롭다운
 *    (`NotificationBell`)의 안 읽은 `NOTICE_CREATED` 알림 수에서 나온다.
 */
export interface Notice {
  id: string;
  title: string;
  body: string;
  /** "YYYY-MM-DD" — 표시는 공용 `formatDate`(lib/date.ts)로 "8월 3일(월)" 꼴로 바꾼다 */
  publishedAt: string;
}

/** 목록 한 줄 — 본문은 상세에서만 필요하므로 뺀다. */
export type NoticeSummary = Omit<Notice, "body">;

/** 공지 작성·수정 폼 입력 — 화면과 서버가 **같은 스키마**로 검증한다(규칙이 두 벌이 되면 어긋난다). */
export interface NoticeDraft {
  title: string;
  body: string;
}

/** 칸별 검증 오류 — 비어 있으면 통과. */
export type NoticeFormErrors = Partial<Record<keyof NoticeDraft, string>>;
