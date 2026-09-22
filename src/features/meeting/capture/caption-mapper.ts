import { formatRecordedTime } from "./phase";
import type { LiveCaption } from "./types";

/**
 * BE 자막 → 화면 자막.
 *
 * ⚠️ **서버·클라이언트 양쪽이 쓴다.** 백필(CAP-12)은 서버 컴포넌트가, 실시간(CAP-13)은
 *    브라우저가 부른다 — 두 경로가 **같은 매퍼**를 써야 백필과 실시간 줄의 모양이 같다.
 *    그래서 `server-only`가 딸린 `server.ts`가 아니라 여기 있다.
 * ⚠️ **`id`를 `seq`로 만들 수 없다.** 두 경로가 주는 값이 다르다 —
 *    백필(CAP-12 `CaptionsResponse.CaptionItem`)에는 `seq`가 있는데
 *    **실시간(CAP-13 `CaptionStreamRegistry.CaptionEvent`)에는 없다**(`personId`·`name`·
 *    `startMs`·`text`뿐이다). `seq`로 만들면 실시간 줄이 전부 `...-undefined`가 되어
 *    **사람마다 첫 줄만 남고 나머지가 조용히 버려진다.**
 *    그래서 **(사람, 시작 ms)** 로 만든다 — 자막 한 조각의 자연키라 백필과 실시간이 같은
 *    id를 만들고, 재연결로 겹쳐 와도 중복이 걸러진다.
 * ⚠️ **`seq`는 그대로 실어 보낸다.** 서버로 보낼 다음 번호를 정할 때 쓴다(§use-capture) —
 *    실시간 줄에는 없으므로 `undefined`다.
 */
export function toLiveCaption(caption: {
  seq?: number;
  personId: number | null;
  name?: string | null;
  startMs: number;
  text: string;
}): LiveCaption {
  return {
    id: `caption-${caption.personId ?? "unknown"}-ms-${caption.startMs}`,
    at: formatRecordedTime(caption.startMs),
    atMs: caption.startMs,
    text: caption.text,
    personId: caption.personId,
    /* ⚠️ **서버가 준 이름을 버리지 않는다.** 명단에 없는 사람도 서버는 이름을 안다 */
    speakerName: caption.name?.trim() ? caption.name : null,
    seq: caption.seq,
  };
}
