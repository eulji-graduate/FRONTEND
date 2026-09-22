import { getAccessToken } from "@/features/auth/session";
import { serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { isMock } from "@/mocks/config";

import { toLiveCaption } from "./caption-mapper";
import type { LiveCaption } from "./types";

/**
 * 자막 백필(CAP-12) — **구독 전 자막을 먼저 채운다.**
 *
 * ⚠️ **SSE만으로는 앞부분이 빈다.** CAP-13은 구독 시점 **이후**만 내려준다(BE 주석) —
 *    회의 중간에 들어온 사람은 그 전에 오간 말을 영영 못 본다. 그래서 이걸 먼저 부른다.
 * ⚠️ **서버 컴포넌트에서 부른다**(§핵심 4원칙 ①). 캡처 화면은 `ssr:false`로 그려지지만,
 *    그건 **그리는 시점**의 얘기다 — 값은 서버가 읽어 props로 내려준다.
 * ⚠️ 실패해도 **화면을 막지 않는다.** 자막 백필은 보조다. 못 채우면 지금부터의 자막만
 *    보이면 된다 — 회의를 못 하게 만들 이유가 아니다.
 */
export async function getMeetingCaptions(meetingId: string): Promise<LiveCaption[]> {
  if (isMock) return [];

  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const response = await serverApi<{
      captions: { seq: number; personId: number | null; startMs: number; text: string }[];
    }>(ep.captions(Number(meetingId)), { accessToken });

    return response.captions.map((caption) => toLiveCaption(caption));
  } catch {
    return [];
  }
}
