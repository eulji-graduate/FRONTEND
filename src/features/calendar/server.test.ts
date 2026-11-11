// server.ts는 "server-only"를 import한다 — jest(기본 조건)에선 그 모듈이 던지므로 비운다.
jest.mock("server-only", () => ({}));

import { todayIso } from "@/lib/date";

import { getMonthEvents } from "./server";

describe("개인 캘린더 월 조회", () => {
  // 목 이벤트는 오늘 기준으로 옮겨진다(`mocks/rebase-date.ts`) — 오늘이 속한 달을 조회한다.
  // todo-1은 오늘, action-1은 오늘부터 3일 뒤까지라 어느 날이든 오늘이 속한 달과 겹친다.
  // (todo-2는 오늘+2일이라 월말에는 다음 달로 넘어가므로 여기서 기대하지 않는다.)
  it("그 달과 겹치는 항목만 돌려준다(픽스처: 오늘 기준 목)", async () => {
    const [year, month] = todayIso().split("-").map(Number);
    const events = await getMonthEvents(new Date(year as number, (month as number) - 1, 1));

    const ids = events.map((event) => event.id);
    expect(ids).toEqual(expect.arrayContaining(["todo-1", "action-1"]));
  });

  it("항목이 없는 달은 빈 배열이다", async () => {
    const events = await getMonthEvents(new Date(2030, 0, 1));
    expect(events).toEqual([]);
  });
});
