import { act, renderHook } from "@testing-library/react";

import { useStreamedMarkdown } from "./use-streamed-markdown";

/**
 * 답이 흐르는 연출.
 *
 * ⚠️ 재는 건 **"프레임마다 얼마씩 나아가는가"** 하나다(2026-08-19). 낱말째로 뜨면 한글
 *    낱말이 2~4자라 글이 덩어리로 튀어 "띠디딕"거렸다 — 프레임당 한 글자 안팎이어야
 *    흐르는 것처럼 읽힌다.
 * ⚠️ `requestAnimationFrame`은 jsdom에 있지만 실제로 프레임을 돌리지 않는다 — 프레임을
 *    직접 밀어 줘야 해서 콜백을 붙잡아 두고 시각을 우리가 정한다.
 */

const FRAME_MS = 1000 / 60;

/** 붙잡아 둔 rAF 콜백을 한 프레임씩 밀어 준다 — `now`는 우리가 준 값이 그대로 들어간다. */
function installManualFrames() {
  let pending: FrameRequestCallback | null = null;
  let handle = 0;

  jest.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    pending = callback;
    return ++handle;
  });
  jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
    pending = null;
  });

  return {
    /** `count` 프레임만큼 진행시키고, 매 프레임 뒤의 상태를 읽을 수 있게 한다. */
    advance(count: number, onFrame?: (frameIndex: number) => void) {
      for (let index = 1; index <= count; index += 1) {
        const callback = pending;
        if (!callback) return;
        pending = null;
        act(() => callback(index * FRAME_MS));
        onFrame?.(index);
      }
    },
  };
}

describe("useStreamedMarkdown", () => {
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /*
    ⚠️ 이 테스트가 회귀를 잡는 자리다 — 낱말 단위로 되돌아가면 프레임당 증가폭이
       2~4자로 뛰어 여기서 걸린다.
  */
  it("한 프레임에 한 글자 안팎으로 나아간다", () => {
    const frames = installManualFrames();
    const { result } = renderHook(() => useStreamedMarkdown("가나다라마바사아자차카타파하"));

    const lengths: number[] = [];
    frames.advance(12, () => lengths.push(result.current.text.length));

    const deltas = lengths.slice(1).map((length, index) => length - lengths[index]!);
    expect(Math.max(...deltas)).toBeLessThanOrEqual(1);
    expect(lengths.at(-1)).toBeGreaterThan(0);
  });

  it("다 흐르면 원문 그대로가 되고 isStreaming이 꺼진다", () => {
    const content = "요금제는 **하나**입니다";
    const frames = installManualFrames();
    const { result } = renderHook(() => useStreamedMarkdown(content));

    /* 넉넉히 밀어 끝까지 보낸다 — 다 흘렀으면 rAF를 더 안 걸어서 그 뒤 프레임은 그냥 멈춘다 */
    frames.advance(200);

    expect(result.current.text).toBe(content);
    expect(result.current.isStreaming).toBe(false);
  });

  /*
    ⚠️ **강조는 열린 채로 보이지 않는다**(`tokenize-for-streaming`의 원자 청크) — 한 글자씩
       흘리게 바뀌면서 이 보장이 더 중요해졌다. 흐르는 매 프레임에 `**`가 짝을 잃지 않는지 본다.
  */
  it("흐르는 동안 강조 별표가 짝을 잃지 않는다", () => {
    const frames = installManualFrames();
    const { result } = renderHook(() => useStreamedMarkdown("가 **중요** 나"));

    frames.advance(40, () => {
      const asterisks = result.current.text.match(/\*/g)?.length ?? 0;
      expect(asterisks % 4).toBe(0);
    });
  });

  it("모션을 줄여 달라는 사람에게는 처음부터 다 보여준다", () => {
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useStreamedMarkdown("가나다라마바사"));

    expect(result.current.text).toBe("가나다라마바사");
    expect(result.current.isStreaming).toBe(false);
  });
});
