import { stepIndexFromProgress } from "./flow-steps";

/**
 * 스크롤이 단계를 넘기는 규칙 — **경계에서 어긋나면 마지막 단계가 반 칸만 보인다.**
 */
describe("stepIndexFromProgress", () => {
  it("구간을 넷으로 고르게 나눈다", () => {
    const at = (progress: number) => stepIndexFromProgress(progress, 4);

    expect([at(0), at(0.24), at(0.26), at(0.51), at(0.76)]).toEqual([0, 0, 1, 2, 3]);
  });

  /* ⚠️ 끝에서 한 칸 넘어가면 없는 단계를 가리켜 화면이 첫 단계로 튄다 */
  it("끝(1.0)에서도 마지막 단계에 머문다", () => {
    expect(stepIndexFromProgress(1, 4)).toBe(3);
  });

  /* ⚠️ 구간 위로 되올릴 때 진행도는 음수로 온다 */
  it("되올려도 첫 단계 아래로 안 내려간다", () => {
    expect(stepIndexFromProgress(-0.3, 4)).toBe(0);
  });
});
