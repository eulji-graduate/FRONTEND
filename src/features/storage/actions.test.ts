jest.mock("@/mocks/config", () => ({ isMock: false }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/features/auth/session", () => ({ requireAccessToken: jest.fn() }));
jest.mock("@/features/shell/viewer", () => ({ getViewer: jest.fn() }));
jest.mock("./server", () => ({ getStorageOverview: jest.fn() }));
jest.mock("@/lib/api", () => {
  class ApiError extends Error {
    constructor(
      readonly status: number,
      message: string,
      readonly code?: string,
    ) {
      super(message);
    }
  }
  return {
    ApiError,
    serverApi: jest.fn(),
    toUserMessage: (error: unknown) =>
      error instanceof ApiError ? error.message : "서버에 연결하지 못했습니다.",
  };
});

import { revalidatePath } from "next/cache";

import { AUTHORITY } from "@/constants/authority";
import { PROJECT_STATUS } from "@/constants/project";
import { requireAccessToken } from "@/features/auth/session";
import { getViewer } from "@/features/shell/viewer";
import { ApiError, serverApi } from "@/lib/api";

import { deleteRecordingsAction } from "./actions";
import { getStorageOverview } from "./server";

const serverApiMock = serverApi as unknown as jest.Mock;
const getViewerMock = getViewer as unknown as jest.Mock;
const overviewMock = getStorageOverview as unknown as jest.Mock;

function project(tag: string, status: string) {
  return {
    tag,
    name: tag,
    meetingCount: 3,
    voiceGb: 1.2,
    sttGb: 0.3,
    lastRecordedAt: "2026-08-01",
    status,
  };
}

/* 저장소 삭제 — 실서버 연결(#26, BE `DELETE /api/companies/me/storage/projects/{tag}`) */
describe("deleteRecordingsAction — 실서버", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAccessToken as unknown as jest.Mock).mockResolvedValue("token");
    getViewerMock.mockResolvedValue({ id: 1, role: AUTHORITY.OWNER, isAdmin: false });
    overviewMock.mockResolvedValue({
      voiceGb: 2.4,
      sttGb: 0.6,
      projects: [
        project("done-project", PROJECT_STATUS.DONE),
        project("live", PROJECT_STATUS.IN_PROGRESS),
      ],
    });
  });

  it("끝난 프로젝트는 BE DELETE를 부르고 화면을 다시 읽는다", async () => {
    serverApiMock.mockResolvedValueOnce(undefined);

    const result = await deleteRecordingsAction("done-project");

    expect(result).toEqual({ isSuccess: true });
    expect(serverApiMock).toHaveBeenCalledWith("/api/companies/me/storage/projects/done-project", {
      method: "DELETE",
      accessToken: "token",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/manage/storage");
  });

  it("처리 중(409)이면 BE 문구를 그대로 보여 주고 다시 읽지 않는다", async () => {
    serverApiMock.mockRejectedValueOnce(
      new ApiError(
        409,
        "녹음 또는 분석 처리 중인 프로젝트는 저장소를 삭제할 수 없습니다.",
        "MT-011",
      ),
    );

    const result = await deleteRecordingsAction("done-project");

    expect(result).toEqual({
      isSuccess: false,
      message: "녹음 또는 분석 처리 중인 프로젝트는 저장소를 삭제할 수 없습니다.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("BE 영어 문구(MT-010)는 우리 문장으로 바꾼다", async () => {
    serverApiMock.mockRejectedValueOnce(
      new ApiError(409, "Storage can be cleared only for a completed (DONE) project.", "MT-010"),
    );

    const result = await deleteRecordingsAction("done-project");

    expect(result.message).toBe("끝난 프로젝트만 삭제할 수 있습니다");
  });

  it("진행 중인 프로젝트는 BE까지 가지 않고 막는다", async () => {
    const result = await deleteRecordingsAction("live");

    expect(result.isSuccess).toBe(false);
    expect(serverApiMock).not.toHaveBeenCalled();
  });

  it("권한이 없으면 BE까지 가지 않는다", async () => {
    getViewerMock.mockResolvedValue({ id: 5, role: AUTHORITY.MEMBER, isAdmin: false });

    const result = await deleteRecordingsAction("done-project");

    expect(result).toEqual({ isSuccess: false, message: "녹음을 지울 권한이 없습니다" });
    expect(serverApiMock).not.toHaveBeenCalled();
  });
});
