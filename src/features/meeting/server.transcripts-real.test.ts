jest.mock("@/mocks/config", () => ({ isMock: false }));
jest.mock("@/features/auth/session", () => ({ requireAccessToken: jest.fn() }));
jest.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  serverApi: jest.fn(),
}));

import { AUTHORITY } from "@/constants/authority";
import { requireAccessToken } from "@/features/auth/session";
import { serverApi } from "@/lib/api";
import type { Actor } from "@/lib/permission";

import { getMeetingDetail } from "./server";

/**
 * 회의 상세 — **실서버 발화 기록(ANLZ-05) 조회**.
 *
 * ⚠️ 기존 `server.test.ts`는 `@/mocks/config`를 목으로 안 바꿔서(실제 `isMock` 값을 그대로
 *    읽는다) 이 경로(실서버 분기)는 그쪽에서 한 번도 실행되지 않는다 — 별도 파일로 잠근다.
 */

const requireAccessTokenMock = requireAccessToken as unknown as jest.Mock;
const serverApiMock = serverApi as unknown as jest.Mock;

const HOST: Actor = { id: 2, role: AUTHORITY.LEADER, teamName: "개발팀" };

function meetingDetail(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    meetingId: 100,
    title: "스프린트 회의",
    status: "DONE",
    startAt: "2026-08-14T10:00:00",
    endAt: "2026-08-14T10:30:00",
    pendingActionCount: 0,
    summaryStatus: "DONE",
    project: { projectId: 1, tag: "GOODS" },
    meetingRoom: { meetingRoomId: 1, name: "소회의실 B" },
    host: { memberId: HOST.id, name: "김서준" },
    attendees: [],
    recordingConsent: false,
    ...overrides,
  };
}

function utterance(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    transcriptId: 1,
    seq: 0,
    speakerMemberId: null,
    speakerSource: null,
    startOffsetMs: 0,
    endOffsetMs: 1_000,
    content: "발화",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  requireAccessTokenMock.mockResolvedValue("token");
});

describe("getMeetingDetail — 실서버, 발화 기록 조회", () => {
  it("끝난 회의는 발화 기록을 조회해 시각순으로 채운다", async () => {
    serverApiMock
      .mockResolvedValueOnce(meetingDetail())
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({
        utterances: [
          utterance({ transcriptId: 1, seq: 0, startOffsetMs: 0, content: "시작합니다" }),
        ],
        nextCursor: null,
      });

    const result = await getMeetingDetail("100", HOST);

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.detail.script).toEqual([{ at: "10:00", text: "시작합니다" }]);
    // GET 회의 상세 1회 + GET 산출물 1회 + GET 발화 1페이지 = 3회
    expect(serverApiMock).toHaveBeenCalledTimes(3);
  });

  /*
    ⚠️ **커서를 끝까지 이어 받는다.** "N건"이라는 화면 문구가 첫 페이지만 세면 거짓말이 된다
       (§정직성) — 두 페이지짜리 응답을 흉내 내 이어받기 자체를 확인한다.
  */
  it("nextCursor가 있으면 다음 페이지를 이어 받는다", async () => {
    serverApiMock
      .mockResolvedValueOnce(meetingDetail())
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({
        utterances: [
          utterance({ transcriptId: 1, seq: 0, startOffsetMs: 0, content: "첫 페이지" }),
        ],
        nextCursor: "page2",
      })
      .mockResolvedValueOnce({
        utterances: [
          utterance({ transcriptId: 2, seq: 1, startOffsetMs: 60_000, content: "둘째 페이지" }),
        ],
        nextCursor: null,
      });

    const result = await getMeetingDetail("100", HOST);

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.detail.script).toEqual([
      { at: "10:00", text: "첫 페이지" },
      { at: "10:01", text: "둘째 페이지" },
    ]);
    expect(serverApiMock).toHaveBeenCalledTimes(4);
    // 두 번째 발화 호출은 첫 페이지가 준 커서를 그대로 되돌려줘야 한다
    expect(serverApiMock.mock.calls[3]![0]).toContain("cursor=page2");
  });

  /*
    ⚠️ **회의가 아직 안 끝났으면 발화 기록을 안 물어본다** — 화면이 그 칸에 안내 카드만
       그리므로(§view-types `pendingReason`) 조회 자체가 헛수고다.
  */
  it("회의가 아직 안 끝났으면 발화 기록 API를 안 부른다", async () => {
    serverApiMock.mockResolvedValueOnce(meetingDetail({ status: "SCHEDULED" }));

    const result = await getMeetingDetail("100", HOST);

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.detail.script).toBeNull();
    expect(serverApiMock).toHaveBeenCalledTimes(1); // 회의 상세만
  });

  /*
    ⚠️ **커서 경계가 겹쳐도 같은 발화를 두 번 안 보여준다**(§목록·페이지네이션 — id 중복 제거).
       BE가 커서 경계에서 같은 발화를 다시 주는 결함이 나도 "N건"이 거짓말을 하면 안 된다.
  */
  it("페이지 경계에서 transcriptId가 겹치면 중복을 거른다", async () => {
    serverApiMock
      .mockResolvedValueOnce(meetingDetail())
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({
        utterances: [
          utterance({ transcriptId: 1, seq: 0, startOffsetMs: 0, content: "첫 페이지" }),
          utterance({ transcriptId: 2, seq: 1, startOffsetMs: 1_000, content: "경계 발화" }),
        ],
        nextCursor: "page2",
      })
      .mockResolvedValueOnce({
        utterances: [
          // 경계 발화(transcriptId: 2)가 다음 페이지 첫머리에도 겹쳐 온다
          utterance({ transcriptId: 2, seq: 1, startOffsetMs: 1_000, content: "경계 발화" }),
          utterance({ transcriptId: 3, seq: 2, startOffsetMs: 60_000, content: "둘째 페이지" }),
        ],
        nextCursor: null,
      });

    const result = await getMeetingDetail("100", HOST);

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.detail.script).toEqual([
      { at: "10:00", text: "첫 페이지" },
      { at: "10:00", text: "경계 발화" },
      { at: "10:01", text: "둘째 페이지" },
    ]);
  });

  /* ⚠️ 커서가 끝없이 이어지는 BE 결함이 나도 화면이 영원히 안 끝나면 안 된다 */
  it("커서가 안 끊기면 상한에서 멈춘다", async () => {
    serverApiMock.mockResolvedValueOnce(meetingDetail()).mockResolvedValueOnce([]);
    // 이후 모든 호출은 nextCursor가 있는 페이지를 계속 준다
    serverApiMock.mockResolvedValue({ utterances: [utterance()], nextCursor: "again" });

    const result = await getMeetingDetail("100", HOST);

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    // 회의 상세 1 + GET 산출물 1 + 최대 50페이지 = 52회를 넘지 않는다
    expect(serverApiMock.mock.calls.length).toBeLessThanOrEqual(52);
    expect(result.detail.script!.length).toBeGreaterThan(0);
  });
});
