jest.mock("@/mocks/config", () => ({ isMock: false }));
jest.mock("@/features/auth/session", () => ({ requireAccessToken: jest.fn() }));
jest.mock("@/lib/api", () => ({ serverApi: jest.fn() }));

import { PROJECT_STATUS } from "@/constants/project";
import { requireAccessToken } from "@/features/auth/session";
import { serverApi } from "@/lib/api";

import { getStorageOverview } from "./server";

/**
 * 저장소 현황 조회 — 실서버 연동(2026-08-14 BE PR #494).
 *
 * ⚠️ BE `StorageOverviewResponse`가 이 화면의 UI 계약과 필드명을 그대로 맞췄다고
 *    명시했지만, 매퍼를 거치는지·`serverApi`가 봉투를 벗기는지는 실행으로 잠가 둔다 —
 *    "이름이 같다"와 "실제로 그대로 통과한다"는 다른 확인이다.
 */
describe("getStorageOverview — 실서버", () => {
  const requireAccessTokenMock = requireAccessToken as unknown as jest.Mock;
  const serverApiMock = serverApi as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    requireAccessTokenMock.mockResolvedValue("token");
  });

  it("저장소 엔드포인트를 한 번 불러 그대로 옮긴다", async () => {
    serverApiMock.mockResolvedValueOnce({
      voiceGb: 34.9,
      sttGb: 6.8,
      projects: [
        {
          tag: "product-v2",
          name: "제품 v2.0",
          meetingCount: 24,
          voiceGb: 9.1,
          sttGb: 1.4,
          lastRecordedAt: "2026-08-07",
          status: PROJECT_STATUS.IN_PROGRESS,
        },
      ],
    });

    const overview = await getStorageOverview();

    expect(serverApiMock.mock.calls[0][0]).toBe("/api/companies/me/storage");
    expect(overview).toEqual({
      voiceGb: 34.9,
      sttGb: 6.8,
      projects: [
        {
          tag: "product-v2",
          name: "제품 v2.0",
          meetingCount: 24,
          voiceGb: 9.1,
          sttGb: 1.4,
          lastRecordedAt: "2026-08-07",
          status: PROJECT_STATUS.IN_PROGRESS,
        },
      ],
    });
  });

  /* ⚠️ 빈 회사는 에러가 아니라 0.0GB·빈 배열이다(BE PR #494 본문 — "그 외 도메인 예외는 없다") */
  it("녹음이 하나도 없는 회사는 0GB·빈 목록이다", async () => {
    serverApiMock.mockResolvedValueOnce({ voiceGb: 0, sttGb: 0, projects: [] });

    const overview = await getStorageOverview();

    expect(overview).toEqual({ voiceGb: 0, sttGb: 0, projects: [] });
  });

  /*
    ⚠️ **`projects`가 `[]`가 아니라 필드째 빠지거나 `null`로 올 수도 있다**(2026-08-14
       재발견 — `team.roles`·조직도 `members`에서 실제로 겪은 것과 같은 종류의 위험이다).
       BE가 진짜 빈 리스트를 `[]`로 직렬화한다는 보장은 이 코드만 보고는 확신할 수 없다 —
       `.map()`이 죽는 대신 빈 배열로 접힌다.
  */
  it("projects 필드가 없거나 null이어도 죽지 않고 빈 배열이다", async () => {
    serverApiMock.mockResolvedValueOnce({ voiceGb: 0, sttGb: 0, projects: undefined });
    expect((await getStorageOverview()).projects).toEqual([]);

    serverApiMock.mockResolvedValueOnce({ voiceGb: 0, sttGb: 0, projects: null });
    expect((await getStorageOverview()).projects).toEqual([]);
  });

  /*
    ⚠️ **실패는 그대로 던진다 — 삼키지 않는다.** 이 함수는 일부러 try/catch가 없다
       (BE 403은 화면 가드가 이미 걸러서 이 함수까지 안 온다고 보고, 여기서 또 잡아
       조용히 목 값으로 대신하면 실제 사용자에게 옛 값을 보여주는 거짓 화면이 된다).
       나중에 "UX 개선" 명목으로 try/catch를 씌워도 이 테스트가 잡는다.
  */
  it("serverApi가 실패하면 삼키지 않고 그대로 던진다", async () => {
    const boom = new Error("500");
    serverApiMock.mockRejectedValueOnce(boom);

    await expect(getStorageOverview()).rejects.toBe(boom);
  });
});
