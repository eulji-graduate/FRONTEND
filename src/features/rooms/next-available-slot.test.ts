import { getNextAvailableSlot } from "./next-available-slot";

describe("getNextAvailableSlot", () => {
  it("30분 단위가 아니면 다음 30분 경계로 올린다", () => {
    const slot = getNextAvailableSlot(new Date("2026-08-11T10:12:00"));
    expect(slot).toEqual(new Date("2026-08-11T10:30:00"));
  });

  it("이미 30분 경계면 그대로 둔다", () => {
    const slot = getNextAvailableSlot(new Date("2026-08-11T10:30:00"));
    expect(slot).toEqual(new Date("2026-08-11T10:30:00"));
  });

  /* ⚠️ 회의실 운영시간 개념이 없어져서(2026-08-15, BE PR #523) 심야 시각도 그대로 반올림만 한다. */
  it("운영 시간 밖(새벽)이어도 밀어내지 않고 그대로 30분 단위로 올린다", () => {
    const slot = getNextAvailableSlot(new Date("2026-08-11T02:10:00"));
    expect(slot).toEqual(new Date("2026-08-11T02:30:00"));
  });
});
