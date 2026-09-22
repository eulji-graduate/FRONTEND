/**
 * BE shape → UI 계약 (§Mock 격리막). 컴포넌트는 이 파일을 모른다 — `server.ts`/`actions.ts`만 쓴다.
 * [확인] 공지 도메인 문서(NOTI-01~05) 기준 — BE 실코드는 아직 대조 전이다
 *   (§연동 검증: Swagger·구두 추측 금지, 문서와 코드가 다르면 코드가 맞다 — 구현 시 컨트롤러로 재확인).
 */

import type { Notice, NoticeDraft, NoticeSummary } from "./types";

/** `GET /api/notices`(NOTI-01) 배열 원소 — 목록엔 본문을 안 담는다(문서 규칙). */
export interface BeNoticeSummary {
  noticeId: number;
  title: string;
  createdAt: string;
}

export function toNoticeSummary(be: BeNoticeSummary): NoticeSummary {
  return {
    id: String(be.noticeId),
    title: be.title,
    publishedAt: be.createdAt,
  };
}

/**
 * `GET /api/notices/{noticeId}`(NOTI-02) 응답 — `content`가 있고, `updatedAt`은 수정 전까지
 * `null`이다(문서 규칙). 작성자는 응답에 없다 — 상세 화면에도 작성자명이 없어 안 담는다.
 */
export interface BeNotice {
  noticeId: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string | null;
}

/**
 * ⚠️ `updatedAt`은 지금 UI 계약(`Notice`)에 없는 값이다 — 상세 화면이 수정일을 안 보여준다
 *    (`notice-detail.tsx`는 `publishedAt`만 쓴다). 화면이 필요해지면 그때 `Notice`에 필드를
 *    더하고 여기서 흘려보낸다 — 지금 만들면 아무도 안 읽는 값이라 §요청한 범위만에 어긋난다.
 */
export function toNotice(be: BeNotice): Notice {
  return {
    id: String(be.noticeId),
    title: be.title,
    body: be.content,
    publishedAt: be.createdAt,
  };
}

/** `POST /api/notices`(NOTI-03) 요청 본문 — 폼 입력을 그대로 보낸다, 앞뒤 공백만 정리한다. */
export interface BeCreateNoticePayload {
  title: string;
  content: string;
}

export function toCreateNoticePayload(draft: NoticeDraft): BeCreateNoticePayload {
  return { title: draft.title.trim(), content: draft.body.trim() };
}

/** `POST /api/notices` 성공 응답 — id만 내려준다(문서 규칙, 등록 직후 목록으로 돌아가서). */
export interface BeCreateNoticeResponse {
  noticeId: number;
}

/**
 * 응답의 id와 방금 보낸 폼 입력을 합쳐 화면이 바로 쓸 수 있는 `Notice`를 만든다
 * (`toCreatedMeetingRoom`과 같은 비관적 갱신 방식).
 * ⚠️ `publishedAt`은 **서버가 실제로 찍은 값이 아니라 이 시각**이다 — 응답에 `createdAt`이
 *    없다(문서 규칙, id만 옴). 이 값은 화면에 바로 그려 쓰지 않고 `onSuccess`가 성공 신호로만
 *    쓴 뒤 `router.refresh()`로 서버 값을 다시 받아오므로 오차가 화면에 남지 않는다.
 */
export function toCreatedNotice(noticeId: number, draft: NoticeDraft): Notice {
  return {
    id: String(noticeId),
    title: draft.title.trim(),
    body: draft.body.trim(),
    publishedAt: new Date().toISOString(),
  };
}
