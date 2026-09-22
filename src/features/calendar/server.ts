import "server-only";

import { endOfMonth, format, startOfMonth } from "date-fns";

import { requireAccessToken } from "@/features/auth/session";
import { serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { isMock } from "@/mocks/config";

import { type BeCalendarItem, toPersonalCalendarEvent } from "./mapper";
import { listMockEvents } from "./mock/events";
import type { PersonalCalendarEvent } from "./types";

/**
 * 개인 캘린더 — 그 달에 속한 항목만 걸러 내려준다. **격리막**(CLAUDE.md).
 * ⚠️ `event.start`가 속한 달만 보지 않고 **그 달과 겹치는지**(start~end 구간)로 본다 —
 *    지금은 항목이 전부 하루짜리라 차이가 없지만, 여러 날에 걸치는 항목이 생기면
 *    시작일이 지난달이어도 이번 달에 걸쳐 있으면 보여야 한다. mock 필터만 그렇고, 실서버는
 *    `GET /api/calendar?month=`가 이미 그 달 기준으로 걸러 내려준다([확인] BE PL 가이드).
 * 연동할 때 고칠 곳은 이 파일과 매퍼뿐이고 컴포넌트는 건드리지 않는다.
 */
export async function getMonthEvents(month: Date): Promise<PersonalCalendarEvent[]> {
  if (isMock) {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    return listMockEvents().filter((event) => event.start <= monthEnd && event.end >= monthStart);
  }

  const accessToken = await requireAccessToken();
  const items = await serverApi<BeCalendarItem[]>(ep.calendar(format(month, "yyyy-MM")), {
    accessToken,
  });

  return items.map((item, index) => toPersonalCalendarEvent(item, index));
}
