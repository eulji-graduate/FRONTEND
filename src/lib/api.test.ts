/*
  ⚠️ `api.ts`는 `server-only`라 jsdom에서 그대로 못 읽는다 — 그 표식만 빈 모듈로 바꾼다.
     검사 대상은 서버 자원을 안 만지는 두 순수 함수(`toUserMessage`·`toErrorTag`)다.
*/
jest.mock("server-only", () => ({}));
jest.mock("./loki", () => ({ pushLokiLog: jest.fn() }));

import { ApiError, serverApi, toErrorTag, toUserMessage } from "./api";
import { splitErrorTag } from "./error-tag";
import { pushLokiLog } from "./loki";

describe("toUserMessage", () => {
  it("BE가 준 문장을 그대로 쓴다 — 코드로 문구를 조립하지 않는다", () => {
    expect(toUserMessage(new ApiError(409, "이미 있는 부서 이름입니다.", "AU-016"))).toBe(
      "이미 있는 부서 이름입니다.",
    );
  });

  /*
    ⚠️ **5xx만 꼬리표를 달고 나온다**(2026-08-12). 화면마다 배선하면 14곳을 건드리고 새 화면이
       생길 때마다 잊는다 — 문장을 만드는 이 한 곳에서 붙이면 어디서 띄우든 따라온다.
  */
  it("사람이 어쩔 수 없는 실패(5xx)에는 꼬리표가 따라붙는다", () => {
    expect(
      toUserMessage(new ApiError(500, "서버 내부 오류가 발생했습니다.", "Z-003", "8f21c0")),
    ).toBe("서버 내부 오류가 발생했습니다. (Z-003 · 8f21c0)");
  });

  /*
    ⚠️ **기다리다 끊긴 것과 못 붙은 것을 가른다**(2026-08-12). 배포에서 서버가 답을 안 해
       버튼이 [등록 중]에서 굳었는데, 그때 사람이 할 일은 "다시 눌러 보기"가 아니라
       "잠시 뒤"다 — 두 경우에 같은 말을 하면 헛되이 다시 누른다(§정직성).
  */
  it("시간이 넘긴 것은 못 붙은 것과 다르게 말한다", () => {
    const timeout = new DOMException("The operation timed out.", "TimeoutError");

    expect(toUserMessage(timeout)).toBe("서버가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.");
    expect(toUserMessage(new TypeError("fetch failed"))).toBe(
      "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  });
});

describe("toErrorTag", () => {
  it("코드와 추적 번호를 이어 붙인다 — 백엔드가 로그를 찾을 열쇠다", () => {
    expect(toErrorTag(new ApiError(500, "서버 내부 오류가 발생했습니다.", "Z-003", "8f21c0"))).toBe(
      "Z-003 · 8f21c0",
    );
  });

  /*
    ⚠️ **UUID를 통째로 붙이지 않는다**(2026-08-12). BE가 주는 값은 36자라, 그대로 실으면
       오류 한 줄이 두 줄로 넘어가 정작 읽어야 할 문장이 뒤로 밀린다 — 앞 8자면 로그에서
       찾기에 충분하다(git 짧은 해시와 같은 이유).
  */
  it("추적 번호가 길면 앞 8자만 싣는다", () => {
    const uuid = "271d9bab-c5ca-4a2a-80a1-2d0e8a19cc94";

    expect(toErrorTag(new ApiError(500, "서버 내부 오류가 발생했습니다.", "Z-003", uuid))).toBe(
      "Z-003 · 271d9bab",
    );
  });

  it("한쪽만 와도 그 한쪽을 준다", () => {
    expect(toErrorTag(new ApiError(500, "서버 내부 오류가 발생했습니다.", "Z-003"))).toBe("Z-003");
  });

  /*
    ⚠️ **4xx에는 안 붙인다.** 사람이 고칠 수 있는 실패라 문장이 이미 할 일을 말한다 —
       `이미 있는 부서 이름입니다`에 `AU-016`을 붙여 봐야 화면만 기술적으로 보인다.
  */
  it("사람이 고칠 수 있는 실패(4xx)에는 안 붙는다", () => {
    expect(
      toErrorTag(new ApiError(409, "이미 있는 부서 이름입니다.", "AU-016", "8f21c0")),
    ).toBeNull();
  });

  /* ⚠️ 없으면 `null`이다 — 화면이 `오류 코드 ` 뒤에 빈칸만 그리면 안 된다 */
  it("BE가 준 실패가 아니거나 단서가 없으면 아무것도 안 준다", () => {
    expect(toErrorTag(new ApiError(500, "서버 내부 오류가 발생했습니다."))).toBeNull();
    expect(toErrorTag(new TypeError("fetch failed"))).toBeNull();
  });
});

/**
 * `serverApi` 계약 — **무기한 대기를 막는 자리**라 문구 함수보다 이쪽이 더 중요하다(코드래빗 지적).
 *
 * ⚠️ `fetch`를 대역으로 세운다. 진짜 네트워크를 태우면 테스트가 BE 사정에 따라 흔들린다.
 * ⚠️ 대역은 **신호를 존중해야** 한다 — 실제 `fetch`처럼 `signal`이 끊기면 그 이유로 거절한다.
 *    안 그러면 타임아웃을 걸어 두고도 통과하는 가짜 초록불이 된다.
 */
describe("serverApi", () => {
  const originalFetch = global.fetch;

  function mockJson(status: number, body: unknown) {
    return jest.fn(() =>
      Promise.resolve({
        ok: status < 400,
        status,
        text: () => Promise.resolve(JSON.stringify(body)),
      }),
    );
  }

  /**
   * 신호가 끊길 때까지 답하지 않는 서버.
   * ⚠️ **이미 끊긴 신호도 본다.** 진짜 `fetch`는 그 자리에서 바로 거절하는데, 이벤트만
   *    기다리면 영영 안 온다 — 대역이 실제와 다르면 통과가 거짓말이 된다.
   */
  function mockNeverAnswers() {
    return jest.fn((_url: string, init: { signal?: AbortSignal }) => {
      const signal = init.signal;
      if (signal?.aborted) return Promise.reject(signal.reason);
      return new Promise((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(signal.reason));
      });
    });
  }

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("성공 봉투에서 `data`만 꺼내 준다 — 부르는 쪽은 봉투를 모른다", async () => {
    global.fetch = mockJson(200, { httpStatus: 200, message: "ok", data: { id: 7 } }) as never;

    await expect(serverApi<{ id: number }>("/api/x")).resolves.toEqual({ id: 7 });
    expect(pushLokiLog).not.toHaveBeenCalled();
  });

  it("실패 봉투의 `errorCode`·`traceId`를 그대로 들고 온다 — 로그를 찾을 열쇠다", async () => {
    global.fetch = mockJson(500, {
      errorCode: "Z-003",
      message: "서버 내부 오류가 발생했습니다.",
      traceId: "8f21c0",
    }) as never;

    await expect(serverApi("/api/x")).rejects.toMatchObject({
      status: 500,
      code: "Z-003",
      traceId: "8f21c0",
    });
  });

  it("5xx는 Loki에 status·code·traceId를 남기고 같은 ApiError를 던진다", async () => {
    global.fetch = mockJson(500, {
      errorCode: "Z-003",
      message: "서버 내부 오류가 발생했습니다.",
      traceId: "8f21c0",
    }) as never;

    const error = await serverApi("/api/x").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 500, code: "Z-003", traceId: "8f21c0" });
    expect(pushLokiLog).toHaveBeenCalledWith(
      "error",
      expect.stringContaining("/api/x"),
      expect.objectContaining({ status: 500, code: "Z-003", traceId: "8f21c0" }),
    );
  });

  it("4xx는 Loki를 남기지 않지만 여전히 ApiError를 던진다", async () => {
    global.fetch = mockJson(409, {
      errorCode: "AU-016",
      message: "이미 있는 부서 이름입니다.",
    }) as never;

    const error = await serverApi("/api/x").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect(pushLokiLog).not.toHaveBeenCalled();
  });

  it("본문이 빈 5xx도 원래 상태 코드를 지키며 Loki에 남긴다", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 503, text: () => Promise.resolve("") }),
    ) as never;

    const error = await serverApi("/api/x").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(503);
    expect(pushLokiLog).toHaveBeenCalledWith(
      "error",
      expect.stringContaining("/api/x"),
      expect.objectContaining({ status: 503 }),
    );
  });

  it("본문이 JSON이 아닌 5xx도 상태 코드를 지키며 Loki에 남긴다", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 502,
        text: () => Promise.resolve("<html>bad gateway</html>"),
      }),
    ) as never;

    const error = await serverApi("/api/x").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
    expect(pushLokiLog).toHaveBeenCalledWith(
      "error",
      expect.stringContaining("/api/x"),
      expect.objectContaining({ status: 502 }),
    );
  });

  it("Loki 전송 실패가 원래 에러 전파를 막지 않는다", async () => {
    (pushLokiLog as jest.Mock).mockImplementation(() => {
      throw new Error("loki down");
    });
    global.fetch = mockJson(500, {
      errorCode: "Z-003",
      message: "서버 내부 오류가 발생했습니다.",
    }) as never;

    await expect(serverApi("/api/x")).rejects.toMatchObject({ status: 500, code: "Z-003" });
  });

  it("답이 없으면 기다리다 끊는다 — 서버 액션이 영영 안 끝나면 화면이 굳는다", async () => {
    global.fetch = mockNeverAnswers() as never;

    const error = await serverApi("/api/x", { timeoutMs: 10 }).catch((e: unknown) => e);

    expect((error as DOMException).name).toBe("TimeoutError");
    expect(toUserMessage(error)).toBe("서버가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.");
  });

  /*
    ⚠️ **기본값 자체를 잰다.** 전에는 `signal`이 `AbortSignal`인지만 봤는데, `serverApi`는 어떤
       경우에도 신호를 넣으므로 그 단언은 **"끊기는 신호"가 아니라 "신호 객체"** 만 확인했다 —
       기본값을 4시간으로 바꿔도 통과했다(적대적 리뷰 2026-08-12). 굳는 화면을 막으려고 넣은
       값인데 정작 그 값이 사라져도 초록불이면, 이 테스트는 없느니만 못하다.
    ⚠️ 반대 방향도 같이 막는다 — 1.5초 같은 오타로 **멀쩡한 요청을 끊는 회귀**도 잡아야 한다.
  */
  it("아무 말이 없어도 15초에 끊는다 — 그 전에는 기다리고, 넘기면 끊는다", async () => {
    jest.useFakeTimers();
    global.fetch = mockNeverAnswers() as never;

    let settled = false;
    void serverApi("/api/x").catch(() => {
      settled = true;
    });

    await jest.advanceTimersByTimeAsync(14_000);
    expect(settled).toBe(false);

    await jest.advanceTimersByTimeAsync(2_000);
    expect(settled).toBe(true);

    jest.useRealTimers();
  });

  it("부르는 쪽 신호도 살아 있다 — 타임아웃이 그것을 덮어쓰지 않는다", async () => {
    global.fetch = mockNeverAnswers() as never;
    const controller = new AbortController();
    controller.abort(new DOMException("사용자가 취소했습니다.", "AbortError"));

    const error = await serverApi("/api/x", { signal: controller.signal }).catch((e: unknown) => e);

    expect((error as DOMException).name).toBe("AbortError");
  });
});

/**
 * **붙인 것을 도로 가를 수 있는가** — 두 규칙이 한 벌인지 재는 자리(적대적 리뷰 2026-08-12).
 *
 * ⚠️ 손으로 쓴 문자열을 `splitErrorTag`에 넣는 테스트는 이 어긋남을 못 잡는다. 실제로 붙이는
 *    쪽이 만든 문장을 그대로 되먹여야, 규칙이 갈리는 순간 여기서 빨간불이 난다 —
 *    갈리면 꼬리표가 빨간 문장 안에 박힌 채 아무도 눈치채지 못한다.
 */
describe("꼬리표 왕복", () => {
  it.each([
    ["UUID를 준 5xx", "Z-003", "271d9bab-c5ca-4a2a-80a1-2d0e8a19cc94"],
    ["짧은 추적 번호", "Z-003", "8f21c0"],
    ["대문자로 준 추적 번호", "Z-003", "271D9BAB"],
    ["코드 없이 번호만", undefined, "271d9bab-c5ca"],
    ["번호 없이 코드만", "MT-001", undefined],
  ])("%s — 붙인 꼬리표를 화면이 도로 가른다", (_label, code, traceId) => {
    const error = new ApiError(500, "서버 내부 오류가 발생했습니다.", code, traceId);

    const message = toUserMessage(error);
    expect(splitErrorTag(message)).toEqual({
      text: "서버 내부 오류가 발생했습니다.",
      tag: toErrorTag(error),
    });
  });

  /* ⚠️ 4xx엔 애초에 안 붙는다 — 문장이 그대로 나오고, 가를 것도 없다 */
  it("사람이 고칠 수 있는 실패는 문장만 나온다", () => {
    const error = new ApiError(409, "이미 있는 부서 이름입니다.", "AU-016", "271d9bab");

    expect(splitErrorTag(toUserMessage(error))).toEqual({
      text: "이미 있는 부서 이름입니다.",
      tag: null,
    });
  });
});
