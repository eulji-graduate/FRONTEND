// server.ts는 "server-only"를 import한다 — jest(기본 조건)에선 그 모듈이 던지므로 비운다.
jest.mock("server-only", () => ({}));

import { getMonthEvents } from "./server";

describe("개인 캘린더 월 조회", () => {
  it("그 달과 겹치는 항목만 돌려준다(픽스처: 8월 5·7일 항목)", async () => {
    const events = await getMonthEvents(new Date(2026, 7, 1));

    const ids = events.map((event) => event.id);
    expect(ids).toEqual(expect.arrayContaining(["todo-1", "action-1", "todo-2"]));
  });

  it("항목이 없는 달은 빈 배열이다", async () => {
    const events = await getMonthEvents(new Date(2030, 0, 1));
    expect(events).toEqual([]);
  });
});
