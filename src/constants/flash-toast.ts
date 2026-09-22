/**
 * **화면을 옮기면서 알리는 말** — 서버 액션이 `redirect`로 다른 화면에 보낼 때 쓴다.
 *
 * ⚠️ 왜 필요한가: 토스트는 브라우저에서 띄우는데, `redirect`가 걸린 액션은 성공 상태를
 *    화면에 돌려주지 않고 서버에서 바로 다음 주소로 보낸다 — 그래서 "만들었습니다"를
 *    말할 자리가 사라진다. 주소에 열쇠 하나(`?toast=`)를 얹어 도착한 화면이 대신 말한다.
 * ⚠️ 문구는 여기 한 곳에 둔다(§도메인 상수: 라벨 하드코딩 금지).
 * ⚠️ 값은 **주소에 실린다.** 사람이 읽는 문구를 그대로 실으면 주소가 지저분해지고 URL
 *    인코딩에 걸리므로, 짧은 열쇠만 싣고 문구는 여기서 찾는다.
 */
export const FLASH_TOAST = {
  PROJECT_CREATED: "프로젝트를 만들었습니다",
  NOTICE_DELETED: "공지를 삭제했습니다",
} as const;

export type FlashToastKey = keyof typeof FLASH_TOAST;

/** 주소에 실리는 열쇠 이름 — 붙이는 쪽(액션)과 읽는 쪽(화면)이 같은 값을 본다. */
export const FLASH_TOAST_PARAM = "toast";

export function isFlashToastKey(value: string | null): value is FlashToastKey {
  /*
    ⚠️ `in`이 아니라 `hasOwn`이다 — `?toast=toString`처럼 프로토타입에 있는 이름을 실어 보내면
       `in`은 참을 돌려주고, 화면이 함수를 문구인 척 띄우려 한다(코드래빗 지적).
  */
  return value !== null && Object.hasOwn(FLASH_TOAST, value);
}
