/**
 * 임시 비밀번호 안내를 종 목록에 합성해 넣고 지우는 자리 — 예전 `PasswordChangeBanner`가
 * 하던 일(닫으면 이 브라우저에서 다시 안 뜬다)을 그대로 옮겼다.
 *
 * ⚠️ **닫은 기록은 `localStorage`에만 남는다.** 서버에 읽음·삭제 API가 없어서다
 *    (`types.ts`의 `NotificationItem` 주석과 같은 이유) — 실제로 비밀번호를 바꾸기 전까지
 *    `/me`는 계속 `passwordChanged: false`를 주므로, 안 남기면 새로고침마다 다시 뜬다.
 */

const DISMISSED_STORAGE_KEY_PREFIX = "z_password_banner_dismissed_";

/** 종 목록 안에서 이 항목을 가리키는 고정 id — 사원마다 하나뿐이라 회원 id로 만든다 */
export function passwordNoticeId(memberId: number): string {
  return `password-temp:${memberId}`;
}

function storageKey(memberId: number): string {
  return `${DISMISSED_STORAGE_KEY_PREFIX}${memberId}`;
}

export function isPasswordNoticeDismissed(memberId: number): boolean {
  try {
    return localStorage.getItem(storageKey(memberId)) === "1";
  } catch {
    /* 저장소가 막혀 있으면(사생활 모드 등) 이번 방문에서는 안 지운 것으로 본다 */
    return false;
  }
}

export function dismissPasswordNotice(memberId: number): void {
  try {
    localStorage.setItem(storageKey(memberId), "1");
  } catch {
    // 저장이 안 되면 이번 새로고침 전까지만 지워진 채로 남는다
  }
}
