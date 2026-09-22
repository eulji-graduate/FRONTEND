import { readScale, writeScale } from "./scale-store";

/**
 * 저장소가 막힌 상태 — 사생활 모드·차단 설정에서 실제로 일어난다.
 *
 * ⚠️ 여기서 조용히 넘어가면 **누른 배율이 곧바로 100%로 되돌아간다.** 눌렀는데 아무 일도
 *    안 일어난 것처럼 보이는 게 이 화면에서 가장 나쁜 실패다(§정직성).
 */
describe("writeScale — 저장소가 막혔을 때", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  const block = () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("차단됨");
      },
    });
  };

  afterEach(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
  });

  it("던지지 않는다", () => {
    block();
    expect(() => writeScale(90)).not.toThrow();
  });

  it("고른 값이 **이번 세션에는 남는다** — 100%로 되돌아가지 않는다", () => {
    block();
    writeScale(90);

    expect(readScale()).toBe("90");
  });

  it("저장소가 살아 있으면 저장소 값이 우선이다", () => {
    writeScale(80);

    expect(localStorage.getItem("z:screen-scale")).toBe("80");
    expect(readScale()).toBe("80");
  });
});
