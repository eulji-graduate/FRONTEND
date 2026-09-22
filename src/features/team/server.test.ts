/**
 * 팀 대시보드 조회 — **회의 실패가 KPI·팀원 현황을 물고 가지 않아야 한다**(코드래빗 지적, 2026-08-13).
 *
 * ⚠️ 예전엔 셋을 같은 `Promise.all`에 실어서 회의 API 하나가 500을 뱉으면 화면이
 *    통째로 `error.tsx`로 사라졌다 — 팀장이 오는 이유는 액션 수와 팀원 현황이라
 *    곁 카드가 죽는다고 나머지까지 지울 이유가 없다. 실패 자리는 `null`로 온다(§types).
 */
jest.mock("@/mocks/config", () => ({ isMock: false }));
jest.mock("@/features/auth/session", () => ({ requireAccessToken: jest.fn() }));
jest.mock("@/lib/api", () => ({ serverApi: jest.fn() }));

import { requireAccessToken } from "@/features/auth/session";
import { serverApi } from "@/lib/api";

import { getTeamDashboardOverview } from "./server";

const requireAccessTokenMock = requireAccessToken as unknown as jest.Mock;
const serverApiMock = serverApi as unknown as jest.Mock;

const SUMMARY = {
  teamActionCount: 3,
  teamMemberActionCount: 5,
  myActionCount: 2,
  completedActionCount: 7,
};

const MEMBERS = [
  {
    memberId: 11,
    name: "김서준",
    positionName: "매니저",
    roleName: null,
    status: "ACTIVE",
    actionCount: 2,
  },
];

beforeEach(() => {
  requireAccessTokenMock.mockReset();
  serverApiMock.mockReset();
  requireAccessTokenMock.mockResolvedValue("token");
});

/**
 * `serverApi` 호출 순서는 `Promise.all`에 실린 순서(요약 → 팀원 → 회의)로 고정돼 있다.
 * 회의만 실패시키기 위해 순서로 짜맞춘다.
 */
function stubApi({ meetingsFail }: { meetingsFail: boolean }) {
  serverApiMock
    .mockResolvedValueOnce(SUMMARY)
    .mockResolvedValueOnce(MEMBERS)
    .mockImplementationOnce(() =>
      meetingsFail
        ? Promise.reject(new Error("MEET-02 down"))
        : Promise.resolve({
            meetings: [],
            page: { page: 0, size: 5, totalElements: 0, totalPages: 0 },
          }),
    );
}

describe("getTeamDashboardOverview — 회의 실패 격리", () => {
  it("회의 조회가 넘어져도 KPI·팀원 현황은 살리고 회의 자리만 null로 넘긴다", async () => {
    stubApi({ meetingsFail: true });

    const overview = await getTeamDashboardOverview({ teamId: 3, teamName: "개발팀" });

    expect(overview.teamActionCount).toBe(3);
    expect(overview.members).toHaveLength(1);
    /* ⚠️ null이 "미조회"의 표식이다 — 빈 배열로 뭉치면 화면이 "예정된 회의가 없다"고 거짓말을 한다 */
    expect(overview.meetings).toBeNull();
  });

  /*
    ⚠️ **팀이 없는 팀장은 여기까지 온다** — 화면 가드(`canAccessTeamScope`)가 LEADER만 보므로,
       `teamId`가 없으면 BE 403(`scope=team` 검증)이 떨어져 위와 같은 실패로 이어진다.
       회의 요청 자체를 안 보내고 `[]`로 답한다 — 팀이 없으면 팀 회의도 정말로 없다.
  */
  it("teamId가 없으면 회의 요청을 아예 안 보낸다 — 받을 수 없는 걸 묻지 않는다", async () => {
    /* 요약·팀원 둘만 부른다(회의는 스킵) */
    serverApiMock.mockResolvedValueOnce(SUMMARY).mockResolvedValueOnce(MEMBERS);

    const overview = await getTeamDashboardOverview({ teamId: undefined });

    expect(serverApiMock).toHaveBeenCalledTimes(2);
    expect(overview.meetings).toEqual([]);
  });
});
