import { act, renderHook } from "@testing-library/react";

import { markPasswordResetAttempt, usePasswordResetCooldown } from "./use-password-reset-cooldown";

describe("usePasswordResetCooldown", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("아무 시도가 없으면 쿨다운이 없다", () => {
    const { result } = renderHook(() => usePasswordResetCooldown());
    expect(result.current).toBe(0);
  });

  it("방금 시도를 남기면 60초 쿨다운이 시작된다", () => {
    markPasswordResetAttempt();
    const { result } = renderHook(() => usePasswordResetCooldown());
    expect(result.current).toBe(60);
  });

  it("시간이 지나면 쿨다운이 줄어들고, 60초가 지나면 0으로 풀린다", () => {
    markPasswordResetAttempt();
    const { result } = renderHook(() => usePasswordResetCooldown());

    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    // 훅 안의 setInterval(1s)이 다시 읽어 반영한다
    expect(result.current).toBeLessThanOrEqual(30);
    expect(result.current).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(31_000);
    });
    expect(result.current).toBe(0);
  });
});
