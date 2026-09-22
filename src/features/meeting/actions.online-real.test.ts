// 서버 액션은 next 런타임 함수를 부른다 — jsdom엔 없으니 목으로 대체하고 호출만 검증한다.
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
// 이 파일만 실서버 분기를 본다(`rooms/actions.real.test.ts`와 같은 패턴).
jest.mock("@/mocks/config", () => ({ isMock: false }));
jest.mock("@/features/auth/session", () => ({ requireAccessToken: jest.fn() }));
jest.mock("@/features/shell/viewer", () => ({
  getViewer: jest.fn(() => Promise.resolve({ id: 1, role: "OWNER" })),
}));
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
}));

import { requireAccessToken } from "@/features/auth/session";
import { ApiError, serverApi } from "@/lib/api";

import { createOnlineMeetingAction, getOnlineMeetingRecordingUploadUrlAction } from "./actions";

const requireAccessTokenMock = requireAccessToken as unknown as jest.Mock;
const serverApiMock = serverApi as unknown as jest.Mock;

const VALID_FORM = () => {
  const data = new FormData();
  data.append("title", "비대면 주간 싱크");
  data.append("projectId", "1");
  data.append("attendeeIds", "2");
  data.append("topicMain", "제품");
  data.append("topicSub", "로드맵 검토");
  // ⚠️ 2026-08-14 계약 변경 — 단일 모달이 S3 업로드까지 끝낸 뒤 이 세 값을 채워 보낸다.
  data.append("recordingS3Key", "recordings/org-1/member-1/online-pending/uuid/meeting.webm");
  data.append("recordingFileName", "meeting.webm");
  data.append("recordingContentType", "audio/webm");
  data.append("recordingSizeBytes", "12345678");
  return data;
};

/**
 * 비대면 회의 만들기(이슈 #473, MEET-18) — **실서버 분기**.
 *
 * ⚠️ 2026-08-14 팀 확정으로 BE 계약이 확정돼 더는 "아직 준비 중" 스텁이 아니다 — 이 파일은
 *    실제로 `serverApi(ep.meetingsOnline())`를 부르고, `recordingConsent`를 안 실어 보내는지,
 *    응답에서 `meetingId`를 그대로 `created.id`로 옮기는지를 본다(`rooms/actions.real.test.ts`와
 *    같은 결의 실서버 분기 테스트).
 */
describe("비대면 회의 만들기(이슈 #473, MEET-18) — 실서버 분기(!isMock)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAccessTokenMock.mockResolvedValue("token");
  });

  it("성공하면 recordingConsent 없이 보내고 응답의 meetingId를 그대로 돌려준다", async () => {
    serverApiMock.mockResolvedValue({
      meetingId: 42,
      status: "DONE",
      title: "비대면 주간 싱크",
      isOnline: true,
      recordingConsent: true,
      host: { memberId: 1, name: "박대표" },
      attendees: [{ memberId: 2, name: "김서준" }],
    });

    const result = await createOnlineMeetingAction({ errors: {} }, VALID_FORM());

    expect(result.errors).toEqual({});
    expect(result.created).toEqual({ id: "42" });
    const [, init] = serverApiMock.mock.calls[0];
    expect(init.json).not.toHaveProperty("recordingConsent");
    expect(init.json).not.toHaveProperty("meetingRoomId");
    expect(init.json).not.toHaveProperty("startAt");
    expect(init.json.recording).toEqual({
      s3Key: "recordings/org-1/member-1/online-pending/uuid/meeting.webm",
      fileName: "meeting.webm",
      contentType: "audio/webm",
      sizeBytes: 12345678,
    });
  });

  it("녹음 파일 정보가 없으면 BE 호출보다 앞서 막는다", async () => {
    const data = new FormData();
    data.append("title", "비대면 주간 싱크");
    data.append("projectId", "1");
    data.append("attendeeIds", "2");
    data.append("topicMain", "제품");
    data.append("topicSub", "로드맵 검토");

    const result = await createOnlineMeetingAction({ errors: {} }, data);

    expect(result.errors.recording).toBe("녹음 파일을 첨부해 주세요");
    expect(serverApiMock).not.toHaveBeenCalled();
  });

  it.each(["CAP-015", "CAP-023", "CAP-024", "CAP-025"])(
    "%s는 recording 칸 오류로 바뀐다",
    async (code) => {
      serverApiMock.mockRejectedValue(new ApiError(400, "녹음 파일 오류", code));

      const result = await createOnlineMeetingAction({ errors: {} }, VALID_FORM());

      expect(result.errors.recording).toBe("녹음 파일 오류");
    },
  );

  it("폼 자체가 비어 있으면 그 검증 오류가 먼저 온다(BE 호출보다 앞선다)", async () => {
    const result = await createOnlineMeetingAction({ errors: {} }, new FormData());

    expect(result.errors.title).toBe("회의 제목을 입력해 주세요");
    expect(serverApiMock).not.toHaveBeenCalled();
  });

  it("PJ-001은 projectId 칸 오류로 바뀐다", async () => {
    /*
      ⚠️ 2026-08-16 정정 — 예전 이 테스트는 리터럴이 `"PROJECT_NOT_FOUND"`이고 제목도
         "MEET-01의 PJ-001과 리터럴이 다르다"였다. 그 전제(도메인 담당자 명세 2026-08-14)가
         틀렸다: `ErrorResponse.of`(BE global/exception/ErrorResponse.java:23)가 **전 도메인**에서
         `errorCode.getCode()`를 내리므로 이 엔드포인트도 실제로 오는 값은 `"PJ-001"`이다.
    */
    serverApiMock.mockRejectedValue(new ApiError(404, "존재하지 않는 프로젝트", "PJ-001"));

    const result = await createOnlineMeetingAction({ errors: {} }, VALID_FORM());

    expect(result.errors.projectId).toBe("존재하지 않는 프로젝트입니다");
  });

  it("MT-010은 attendeeIds 칸 오류로 바뀐다", async () => {
    serverApiMock.mockRejectedValue(new ApiError(400, "무언가", "MT-010"));

    const result = await createOnlineMeetingAction({ errors: {} }, VALID_FORM());

    expect(result.errors.attendeeIds).toBe("존재하지 않는 참석자가 있습니다");
  });

  it("MT-015는 topics 칸 오류로 바뀐다", async () => {
    serverApiMock.mockRejectedValue(new ApiError(400, "안건 오류", "MT-015"));

    const result = await createOnlineMeetingAction({ errors: {} }, VALID_FORM());

    expect(result.errors.topics).toBe("안건 오류");
  });

  it.each(["MT-016", "MT-018", "MT-019"])(
    "%s는 parentTeamActionId 칸 오류로 바뀐다",
    async (code) => {
      serverApiMock.mockRejectedValue(new ApiError(400, "상위 팀 액션 오류", code));

      const result = await createOnlineMeetingAction({ errors: {} }, VALID_FORM());

      expect(result.errors.parentTeamActionId).toBe("상위 팀 액션 오류");
    },
  );

  it("MT-017은 attendeeIds 칸 오류로 바뀐다 — 상위 팀 액션 오류(016·018·019) 묶음과 다른 자리다", async () => {
    /*
      ⚠️ 2026-08-16 정정 — 예전엔 MT-017이 016 묶음에 섞여 `parentTeamActionId` 칸에 붙었지만,
         뜻은 "개설자 외 참석자를 한 명 이상 선택해야 합니다"라 참석자 칸이 맞다.
         MT-010(존재하지 않는 참석자)과 같은 칸을 쓰지만 문구가 달라 사용자가 구분할 수 있다.
    */
    serverApiMock.mockRejectedValue(
      new ApiError(400, "개설자 외 참석자를 한 명 이상 선택해야 합니다", "MT-017"),
    );

    const result = await createOnlineMeetingAction({ errors: {} }, VALID_FORM());

    expect(result.errors.attendeeIds).toBe("개설자 외 참석자를 한 명 이상 선택해야 합니다");
    expect(result.errors.parentTeamActionId).toBeUndefined();
  });

  it("목록에 없는 오류 코드는 title 칸으로 떨어진다(필드 슬롯이 없는 오류의 기본 자리)", async () => {
    serverApiMock.mockRejectedValue(new ApiError(400, "알 수 없는 오류", "MT-999"));

    const result = await createOnlineMeetingAction({ errors: {} }, VALID_FORM());

    expect(result.errors.title).toBe("알 수 없는 오류");
  });
});

/**
 * 비대면 회의 녹음 업로드 URL 발급(2026-08-14 계약 변경) — 실서버 분기.
 */
describe("비대면 회의 녹음 업로드 URL 발급 — 실서버 분기(!isMock)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAccessTokenMock.mockResolvedValue("token");
  });

  it("성공하면 BE가 준 s3Key·presignedUrl을 그대로 돌려준다", async () => {
    serverApiMock.mockResolvedValue({
      s3Key: "recordings/org-1/member-10/online-pending/uuid/meeting.webm",
      presignedUrl: "https://s3.example.com/upload",
      expiresInSeconds: 900,
    });

    const result = await getOnlineMeetingRecordingUploadUrlAction({
      fileName: "meeting.webm",
      contentType: "audio/webm",
      sizeBytes: 12345678,
    });

    expect(result).toEqual({
      ok: true,
      s3Key: "recordings/org-1/member-10/online-pending/uuid/meeting.webm",
      presignedUrl: "https://s3.example.com/upload",
      contentType: "audio/webm",
    });
  });

  it("지원하지 않는 형식이면 BE 호출보다 앞서 막는다", async () => {
    const result = await getOnlineMeetingRecordingUploadUrlAction({
      fileName: "meeting.txt",
      contentType: "text/plain",
      sizeBytes: 100,
    });

    expect(result.ok).toBe(false);
    expect(serverApiMock).not.toHaveBeenCalled();
  });

  it("BE 실패(CAP-024 등)는 메시지를 그대로 돌려준다", async () => {
    serverApiMock.mockRejectedValue(new ApiError(413, "파일 용량이 너무 큽니다", "CAP-024"));

    const result = await getOnlineMeetingRecordingUploadUrlAction({
      fileName: "meeting.webm",
      contentType: "audio/webm",
      sizeBytes: 12345678,
    });

    expect(result).toEqual({ ok: false, message: "파일 용량이 너무 큽니다" });
  });
});
