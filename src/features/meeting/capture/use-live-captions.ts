"use client";

import { useEffect, useState } from "react";

import { toLiveCaption } from "./caption-mapper";
import type { LiveCaption } from "./types";

/**
 * 다른 참석자의 자막을 받아 온다(CAP-13 SSE).
 *
 * ⚠️ **백필이 먼저다.** SSE는 구독 시점 **이후**만 내려주므로, 그 전 자막은 서버 컴포넌트가
 *    CAP-12로 읽어 `initial`로 내려준다 — 순서를 뒤집으면 늦게 들어온 사람 화면의 앞부분이
 *    통째로 빈다.
 * ⚠️ **우리 주소를 구독한다**(`/api/meetings/:id/captions/stream`). `EventSource`는 헤더를
 *    못 붙여서 BE를 직접 구독하려면 토큰을 쿼리스트링에 실어야 하는데, 그러면 주소창·프록시
 *    로그에 액세스 토큰이 남는다 — BFF가 헤더로 붙여 준다.
 * ⚠️ **`id`로 중복을 거른다.** 재연결하면 브라우저가 마지막 지점부터 다시 받는데, 그 사이
 *    백필과 겹치면 같은 말이 두 번 뜬다(§목록 — 이어 붙일 때 id로 거른다와 같은 이유).
 * ⚠️ **백필과 구독 사이의 틈은 못 메운다.** 서버가 읽은 뒤 구독이 붙기 전에 생긴 자막은
 *    어느 쪽에도 안 온다 — 그 사이(수백 ms)에 오간 말은 이 화면에 안 뜬다. 자막은 정본이
 *    아니라 실시간 표시용이라 그대로 두지만, 없는 척하지 않으려고 적어 둔다(§정직성).
 */
export function useLiveCaptions(
  meetingId: string,
  initial: LiveCaption[],
  viewerId: number,
): LiveCaption[] {
  const [captions, setCaptions] = useState<LiveCaption[]>(initial);

  useEffect(() => {
    /*
      ⚠️ `EventSource`가 없는 환경(오래된 브라우저·테스트)에서 터지지 않게 먼저 묻는다.
         자막을 못 받아도 녹음과 내 자막은 그대로 돌아야 한다.
    */
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;

    const source = new EventSource(`/api/meetings/${meetingId}/captions/stream`);

    function handleCaption(event: MessageEvent<string>) {
      /*
        ⚠️ **실제 페이로드에는 `seq`가 없다**(BE `CaptionStreamRegistry.CaptionEvent`) —
           `personId`·`name`·`startMs`·`text` 넷뿐이다. 타입이 거짓말을 하면 같은 실수가
           다시 난다.
      */
      let payload: {
        personId: number | null;
        name?: string | null;
        startMs: number;
        text: string;
      };
      try {
        payload = JSON.parse(event.data);
      } catch {
        /* 한 줄이 깨졌다고 스트림 전체를 버리지 않는다 — 다음 줄은 멀쩡할 수 있다 */
        return;
      }

      /*
        ⚠️ **내가 보낸 자막이 되돌아온 것은 여기서 버린다.** BE는 발신자를 빼지 않고 구독자
           전원에게 뿌린다(`broadcastToLocal`) — 내 STT가 만든 줄과 겹쳐 같은 말이 두 번 뜬다.
        ⚠️ **거르는 자리가 여기여야 한다.** 합치는 자리에서 걸렀더니 백필로 받은
           **내 지난 자막까지 사라졌다** — 새로고침하면 내가 한 말이 통째로 없어졌다.
      */
      if (payload.personId === viewerId) return;

      const incoming = toLiveCaption(payload);
      setCaptions((prev) =>
        prev.some((caption) => caption.id === incoming.id) ? prev : [...prev, incoming],
      );
    }

    source.addEventListener("caption", handleCaption as EventListener);

    /*
      ⚠️ `participant`·`heartbeat`는 **지금 안 쓴다.** 듣지 않는 것과 못 듣는 것은 다르니
         여기 적어 둔다 — 참가자 목록을 실시간으로 갱신할 때 `participant`를 쓰면 된다.
      ⚠️ `EventSource`는 끊기면 **알아서 다시 붙는다.** 우리가 재연결을 짜지 않는다.
    */

    return () => {
      source.removeEventListener("caption", handleCaption as EventListener);
      source.close();
    };
  }, [meetingId, viewerId]);

  return captions;
}
