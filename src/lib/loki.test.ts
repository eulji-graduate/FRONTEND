/*
  ⚠️ `loki.ts`는 `server-only`라 jsdom에서 그대로 못 읽는다 — 표식만 빈 모듈로 바꾼다.
     `next/server`의 `after()`도 요청 스코프 밖에서 부르면 던지므로 대역으로 잡아 감시한다.
*/
jest.mock("server-only", () => ({}));

const afterMock = jest.fn<void, [Promise<unknown>]>();
jest.mock("next/server", () => ({ after: (p: Promise<unknown>) => afterMock(p) }));

import { pushLokiLog } from "./loki";

describe("pushLokiLog", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    afterMock.mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("`after()`로 응답 뒤까지 살려 둔다 — 서버리스에서 잘리지 않는다", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, status: 204 } as Response),
    ) as unknown as typeof fetch;

    pushLokiLog("info", "hello");

    // dynamic import(next/server) 해소를 한 틱 기다린다
    await Promise.resolve();
    await Promise.resolve();

    expect(afterMock).toHaveBeenCalledTimes(1);
  });

  it("fetch에 `AbortSignal.timeout`을 붙여 무한 대기를 막는다", () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve({ ok: true, status: 204 } as Response),
    ) as unknown as jest.Mock;
    global.fetch = fetchMock as unknown as typeof fetch;

    pushLokiLog("info", "hello");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("HTTP 5xx는 조용히 삼키지 않고 catch로 흘려 보낸다 — 요청은 안 깬다", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 } as Response),
    ) as unknown as typeof fetch;

    expect(() => pushLokiLog("error", "boom")).not.toThrow();

    // catch 체인이 실제로 물렸는지 — after에 전달된 프라미스가 resolve로 끝나야 한다
    await Promise.resolve();
    await Promise.resolve();
    const guarded = afterMock.mock.calls[0]?.[0];
    await expect(guarded).resolves.toBeUndefined();
  });

  it("네트워크 오류도 요청을 깨지 않고 삼킨다", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("network down")),
    ) as unknown as typeof fetch;

    expect(() => pushLokiLog("error", "boom")).not.toThrow();

    await Promise.resolve();
    await Promise.resolve();
    const guarded = afterMock.mock.calls[0]?.[0];
    await expect(guarded).resolves.toBeUndefined();
  });

  it("실패 경로에서 `console.error`를 남기지 않는다 — 저장소 규칙", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 } as Response),
    ) as unknown as typeof fetch;

    pushLokiLog("error", "boom");
    await Promise.resolve();
    await Promise.resolve();
    const guarded = afterMock.mock.calls[0]?.[0];
    await guarded;

    expect(spy).not.toHaveBeenCalled();
  });
});
