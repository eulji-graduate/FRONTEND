import { ACTION_STATUS, HANDOVER_TYPE } from "@/constants/domain";

import type { BeHandoverItemResponse, BeHandoverSummaryResponse } from "./mapper";
import { toTeamHandoverAction, toTeamHandoverListItem } from "./mapper";

function beItem(patch: Partial<BeHandoverItemResponse>): BeHandoverItemResponse {
  return {
    id: 1,
    actionId: 10,
    actionTitleSnap: "타이틀",
    actionStatusSnap: ACTION_STATUS.TODO,
    projectTagSnap: "GOODS",
    actionTypeSnap: "PERSONAL",
    deadlineSnap: "2026-08-20",
    actionCreatedAtSnap: "2026-08-01T00:00:00",
    sourceMeetingId: null,
    sourceMeetingTitleSnap: null,
    contentSnap: null,
    parentActionTitleSnap: null,
    startDateSnap: null,
    reassignRequired: true,
    reassigneeId: null,
    reassigneeNameSnap: null,
    reassigneePositionSnap: null,
    reassignedAt: null,
    committedAt: null,
    rollbackStatus: null,
    ...patch,
  };
}

function beSummary(patch: Partial<BeHandoverSummaryResponse>): BeHandoverSummaryResponse {
  return {
    id: 100,
    writerMemberId: 5,
    writerName: "홍길동",
    writerPosition: "사원",
    teamId: 1,
    handoverType: HANDOVER_TYPE.VACATION,
    status: "SUBMITTED",
    leaveStartAt: null,
    leaveEndAt: null,
    lastWorkingDay: null,
    itemCount: 0,
    reassignRequiredCount: 0,
    reassignedCount: 0,
    ...patch,
  };
}

describe("toTeamHandoverAction", () => {
  it("parentActionTitleSnap·startDateSnap을 그대로 옮긴다", () => {
    const action = toTeamHandoverAction(
      beItem({ parentActionTitleSnap: "상위 팀 액션", startDateSnap: "2026-08-10" }),
    );
    expect(action.parentTeamActionName).toBe("상위 팀 액션");
    expect(action.startDate).toBe("2026-08-10");
  });

  it("값이 없으면(null) 빈 문자열로 둔다 — 지어내지 않는다", () => {
    const action = toTeamHandoverAction(beItem({}));
    expect(action.parentTeamActionName).toBe("");
    expect(action.startDate).toBe("");
  });
});

describe("toTeamHandoverListItem", () => {
  it("VACATION이고 기간이 둘 다 있으면 period를 채운다", () => {
    const item = toTeamHandoverListItem(
      beSummary({
        handoverType: HANDOVER_TYPE.VACATION,
        leaveStartAt: "2026-08-01T00:00:00",
        leaveEndAt: "2026-08-15T00:00:00",
      }),
    );
    expect(item.period).toEqual({ from: "2026-08-01", to: "2026-08-15" });
  });

  it("OFFBOARDING이면 기간이 없다(돌아오지 않는다)", () => {
    const item = toTeamHandoverListItem(
      beSummary({
        handoverType: HANDOVER_TYPE.OFFBOARDING,
        leaveStartAt: "2026-08-01T00:00:00",
        leaveEndAt: "2026-08-15T00:00:00",
      }),
    );
    expect(item.period).toBeNull();
  });

  it("handoverId는 BE id, memberId는 writerMemberId다", () => {
    const item = toTeamHandoverListItem(beSummary({ id: 42, writerMemberId: 7 }));
    expect(item.handoverId).toBe(42);
    expect(item.memberId).toBe(7);
  });
});
