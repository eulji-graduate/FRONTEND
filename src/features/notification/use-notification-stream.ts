"use client";

import { useEffect, useRef } from "react";

import { isMock } from "@/mocks/config";

import { type NotificationEnvelope, parseNotificationEnvelope } from "./event";

/**
 * 개인 알림 SSE 구독 — **앱 전체에 연결 하나**(셸에서 한 번만 마운트한다).
 *
 * 자막 구독(`features/meeting/capture/use-live-captions.ts`)과 **같은 뼈대**다. 다른 점만 적는다.
 *
 * ⚠️ **우리 주소를 구독한다**(`/api/notifications/stream`). `EventSource`는 헤더를 못 붙여서
 *    BE를 직접 구독하려면 토큰을 쿼리스트링에 실어야 하는데, 그러면 주소창·프록시 로그에
 *    액세스 토큰이 남는다 — BFF가 헤더로 붙여 준다(§핵심 4원칙 ②).
 * ⚠️ **연결은 하나여야 한다.** 화면마다 열면 사람 하나가 탭 하나로 여러 emitter를 잡고
 *    (BE는 회원당 리스트로 들고 전부에 복사해 보낸다), 같은 알림이 배너에 여러 줄 뜬다.
 *    그래서 이 훅은 **셸의 `NotificationProvider` 한 곳에서만** 부른다.
 * ⚠️ **목에서는 안 연다.** BE가 없으니 BFF가 502를 돌려주고, `EventSource`는 그걸 재연결
 *    신호로 알아 계속 두드린다 — 개발 콘솔이 실패로 뒤덮인다(§Mock 격리막).
 * ⚠️ **끊기면 스스로 붙지만, 거절당하면 안 붙는다.** 네트워크가 튀면 브라우저가 알아서
 *    재연결한다(그건 우리가 안 짠다). 하지만 401·502처럼 **응답이 온 실패**는 브라우저가
 *    연결을 닫고 끝낸다(`readyState === CLOSED`) — 그때만 우리가 물러서며 다시 연다.
 *    간격을 안 늘리면 로그인이 풀린 채로 초당 몇 번씩 서버를 두드린다.
 */

/** 재연결 첫 대기(ms) — 배포 한 번으로 끊긴 정도는 이 안에 붙는다 */
const RECONNECT_BASE_MS = 2_000;
/** 물러설 수 있는 최대(ms) — 더 늘리면 사람이 돌아왔는데 한참 알림이 안 온다 */
const RECONNECT_MAX_MS = 60_000;

export function useNotificationStream(onEvent: (envelope: NotificationEnvelope) => void): void {
  /*
    ⚠️ 콜백을 **ref에 담는다.** 의존성에 그대로 넣으면 부모가 다시 그릴 때마다 연결을 끊고
       새로 연다 — 그 사이에 온 알림이 사라진다.
  */
  const handlerRef = useRef(onEvent);
  /* ⚠️ 갈아 끼우는 건 **효과 안**이다 — 렌더 중에 ref를 건드리면 안 된다(`react-hooks/refs`) */
  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    /*
      ⚠️ `EventSource`가 없는 환경(오래된 브라우저·테스트)에서 터지지 않게 먼저 묻는다.
         알림을 못 받아도 나머지 화면은 그대로 돌아야 한다.
    */
    if (isMock) return;
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;

    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = RECONNECT_BASE_MS;
    let closed = false;

    function handleNotification(event: MessageEvent<string>) {
      const envelope = parseNotificationEnvelope(event.data);
      /* 한 줄이 깨졌다고 스트림 전체를 버리지 않는다 — 다음 줄은 멀쩡할 수 있다 */
      if (envelope) handlerRef.current(envelope);
    }

    function open() {
      if (closed) return;
      const next = new EventSource("/api/notifications/stream");
      source = next;

      next.addEventListener("open", () => {
        /* 한 번 붙으면 물러선 만큼을 되돌린다 — 안 되돌리면 다음 끊김에 1분을 기다린다 */
        retryDelay = RECONNECT_BASE_MS;
      });
      next.addEventListener("notification", handleNotification as EventListener);
      /*
        ⚠️ `heartbeat`(20초)는 **듣지 않는다.** 연결이 살아 있게 하는 게 일이라 화면에
           그릴 것이 없다 — 듣지 않는 것과 못 듣는 것은 다르니 적어 둔다.
      */
      next.addEventListener("error", () => {
        /*
          ⚠️ `CONNECTING`이면 브라우저가 이미 다시 붙는 중이다 — 여기서 손대면 그 재시도를
             끊고 우리 타이머로 갈아타 오히려 늦어진다. **닫힌 것만** 우리가 다시 연다.
        */
        if (next.readyState !== EventSource.CLOSED) return;
        next.close();
        if (closed) return;
        retryTimer = setTimeout(open, retryDelay);
        retryDelay = Math.min(retryDelay * 2, RECONNECT_MAX_MS);
      });
    }

    open();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      source?.removeEventListener("notification", handleNotification as EventListener);
      source?.close();
    };
  }, []);
}
