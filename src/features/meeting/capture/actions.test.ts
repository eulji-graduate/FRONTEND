/**
 * CAP-09 진행 중 캡처 조회(`getActiveCaptureAction`) 실서버 분기 회귀 테스트.
 *
 * ⚠️ **화면이 죽으면 안 되는 값이 셋이다.**
 *   - `data: null`(진행 중 없음) → 오류로 올리지 않고 그대로 null
 *   - 정상 응답 → captureSessionId 같은 안 쓰는 필드는 계약에서 뺀다
 *   - 예외(권한 없음 등) → 던지지 않고 `{ok:false, error}`로 감싸 화면이 무시할 수 있게
 */

jest.mock("@/mocks/config", () => ({ isMock: false }));
jest.mock("@/features/auth/session", () => ({ requireAccessToken: jest.fn() }));
jest.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    code?: string;
    constructor(status: number, message: string, code?: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
  serverApi: jest.fn(),
  toUserMessage: (error: unknown) =>
    error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
}));

import { requireAccessToken } from "@/features/auth/session";
import { ApiError, serverApi } from "@/lib/api";

import {
  completeCaptureUploadAction,
  getActiveCaptureAction,
  getPartsUploadStatusAction,
  startCaptureSessionAction,
} from "./actions";

const serverApiMock = serverApi as unknown as jest.Mock;
const requireAccessTokenMock = requireAccessToken as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  requireAccessTokenMock.mockResolvedValue("token");
});

describe("getActiveCaptureAction — CAP-09", () => {
  it("진행 중 캡처가 없으면(data:null) 오류가 아니라 그대로 null을 돌려준다", async () => {
    serverApiMock.mockResolvedValueOnce(null);

    const result = await getActiveCaptureAction();

    expect(result).toEqual({ ok: true, data: null });
  });

  it("진행 중 캡처가 있으면 안 쓰는 captureSessionId를 뺀 계약으로 옮긴다", async () => {
    serverApiMock.mockResolvedValueOnce({
      meetingId: 91,
      captureSessionId: 1204, // 계약에서 뺀다
      segmentSeq: 3,
      lastSeq: 42,
      recorderPersonId: 7,
      canTakeover: false,
      elapsedMs: 12_345,
    });

    const result = await getActiveCaptureAction();

    expect(result).toEqual({
      ok: true,
      data: {
        meetingId: 91,
        segmentSeq: 3,
        lastSeq: 42,
        recorderPersonId: 7,
        canTakeover: false,
        elapsedMs: 12_345,
      },
    });
  });

  it("녹음자 하트비트가 끊긴 상태(canTakeover:true, recorderPersonId:null)도 그대로 옮긴다", async () => {
    serverApiMock.mockResolvedValueOnce({
      meetingId: 91,
      captureSessionId: null,
      segmentSeq: 0,
      lastSeq: 0,
      recorderPersonId: null,
      canTakeover: true,
      elapsedMs: 0,
    });

    const result = await getActiveCaptureAction();

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      meetingId: 91,
      segmentSeq: 0,
      lastSeq: 0,
      recorderPersonId: null,
      canTakeover: true,
      elapsedMs: 0,
    });
  });

  /*
    ⚠️ 던지지 않고 값으로 돌려준다 — 훅이 알림/화면 오류로 올리지 않고 조용히 무시하므로
       (복구 안내가 없더라도 나머지 캡처 흐름은 돌아야 한다), 여기서 예외가 새면 훅 마운트
       효과 안에서 unhandled rejection이 된다.
  */
  it("예외는 던지지 않고 {ok:false}로 감싼다", async () => {
    serverApiMock.mockRejectedValueOnce(new ApiError(403, "이 회의 참석자가 아닙니다"));

    const result = await getActiveCaptureAction();

    expect(result.ok).toBe(false);
    expect(result.error).toBe("이 회의 참석자가 아닙니다");
  });
});

/*
  ⚠️ 회귀 방지(#616) — 이미 등록된 조각(409 CAP-005)을 실패로 돌려주면 `upload.ts`가 같은
     조각을 3회 재시도해 `Duplicate entry` 소음을 남겼다. 멱등이라 성공으로 흘려보내야 한다.
*/
describe("completeCaptureUploadAction — CAP-07 멱등 처리", () => {
  const body = { segmentSeq: 0, s3Key: "recordings/x", sizeBytes: 100 };

  it("정상 완료면 ok:true", async () => {
    serverApiMock.mockResolvedValueOnce(undefined);

    const result = await completeCaptureUploadAction(1, 18, body);

    expect(result).toEqual({ ok: true });
  });

  it("이미 등록됨(409 CAP-005)은 실패가 아니라 성공으로 취급한다 — 재시도 금지", async () => {
    serverApiMock.mockRejectedValueOnce(new ApiError(409, "이미 등록된 조각입니다", "CAP-005"));

    const result = await completeCaptureUploadAction(1, 18, body);

    expect(result).toEqual({ ok: true });
  });

  it("그 외 에러는 {ok:false}로 감싼다", async () => {
    serverApiMock.mockRejectedValueOnce(new ApiError(500, "서버 오류"));

    const result = await completeCaptureUploadAction(1, 18, body);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("서버 오류");
  });
});

describe("getPartsUploadStatusAction — CAP-08", () => {
  it("BE 6필드 응답을 화면 계약 2필드(lastSeq·missingCount)로 접는다", async () => {
    // [확인] BE PartUploadStatusResponse — segmentSeq·lastSeq·missingSeqs·blocksFormed·resumeFromSeq·gapMs
    serverApiMock.mockResolvedValueOnce({
      segmentSeq: 1,
      lastSeq: 8,
      missingSeqs: [3, 5],
      blocksFormed: 2,
      resumeFromSeq: 9,
      gapMs: 0,
    });

    const result = await getPartsUploadStatusAction(42);

    // resumeFromSeq 등 안 쓰는 필드가 계약에 새면 화면이 재개 로직을 만들고 싶어진다 — 계약은 안내용 2필드뿐
    expect(result).toEqual({ ok: true, data: { lastSeq: 8, missingCount: 2 } });
    expect(serverApiMock).toHaveBeenCalledWith(
      "/api/meetings/42/parts/status",
      expect.objectContaining({ accessToken: "token" }),
    );
  });

  it("예외(녹음자 아님 등)는 던지지 않고 {ok:false}로 감싼다 — 복구 안내가 얇아질 뿐 화면은 산다", async () => {
    serverApiMock.mockRejectedValueOnce(new Error("현재 녹음자가 아닙니다"));

    const result = await getPartsUploadStatusAction(42);

    expect(result).toEqual({ ok: false, error: "현재 녹음자가 아닙니다" });
  });
});

/*
  ⚠️ **PAUSED 세션 재접속(CS-002)은 CAP-03으로 넘긴다**(#605 회귀 방지). [녹음 이어하기]가
     늘 CAP-01(start)만 불러 새로고침 후 일시정지 세션을 못 살리던 버그다.
*/
describe("startCaptureSessionAction — CAP-01, PAUSED 재접속(#605)", () => {
  it("정상 시작이면 그대로 성공한다", async () => {
    serverApiMock.mockResolvedValueOnce({
      captureSessionId: 5,
      status: "ACTIVE",
      isPaused: false,
      startedBy: 1,
      startedAtEpochMs: 1000,
      roster: [],
    });

    const result = await startCaptureSessionAction(3);

    expect(result.ok).toBe(true);
    expect(serverApiMock).toHaveBeenCalledTimes(1);
  });

  it("CS-002(이미 있음)면 CAP-03(재개)으로 넘어가고, 성공하면 ok:true다", async () => {
    serverApiMock
      .mockRejectedValueOnce(new ApiError(409, "이미 진행 중인 캡처가 있습니다", "CS-002"))
      .mockResolvedValueOnce(undefined); // 재개(CAP-03) 응답
    // ⚠️ `startedAtEpochMs`는 재개 응답에 없어 `Date.now()`로 채운다(actions.ts 주석 참고) —
    //    고정해 두지 않으면 그 대체값이 없어지거나 undefined가 돼도 `ok`만 보는 이 테스트는
    //    통과한다(코드래빗 지적, PR #638). 다른 테스트에 새는 걸 막으려 끝나면 되돌린다.
    const dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    const result = await startCaptureSessionAction(3);

    expect(result.ok).toBe(true);
    expect(result.data?.startedAtEpochMs).toBe(1_700_000_000_000);
    expect(serverApiMock).toHaveBeenCalledTimes(2);
    expect(serverApiMock.mock.calls[1][0]).toBe("/api/meetings/3/capture-session/resume");

    dateNowSpy.mockRestore();
  });

  it("CS-002 뒤 재개마저 실패하면 그 실패 사유를 그대로 전달한다", async () => {
    serverApiMock
      .mockRejectedValueOnce(new ApiError(409, "이미 진행 중인 캡처가 있습니다", "CS-002"))
      .mockRejectedValueOnce(new ApiError(500, "재개에 실패했습니다"));

    const result = await startCaptureSessionAction(3);

    expect(result).toEqual({ ok: false, error: "재개에 실패했습니다" });
  });

  it("CS-002가 아닌 다른 에러는 재개를 시도하지 않는다", async () => {
    serverApiMock.mockRejectedValueOnce(new ApiError(403, "권한이 없습니다"));

    const result = await startCaptureSessionAction(3);

    expect(result).toEqual({ ok: false, error: "권한이 없습니다" });
    expect(serverApiMock).toHaveBeenCalledTimes(1);
  });
});
