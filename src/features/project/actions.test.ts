// 서버 액션은 next 런타임 함수를 부른다 — jsdom엔 없으니 목으로 대체하고 호출만 검증한다.
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/mocks/config", () => ({ isMock: false }));
jest.mock("@/features/shell/viewer", () => ({ getViewer: jest.fn() }));
jest.mock("@/features/auth/session", () => ({ requireAccessToken: jest.fn() }));
jest.mock("@/lib/api", () => ({
  serverApi: jest.fn(),
  ApiError: class ApiError extends Error {},
  toUserMessage: jest.fn((error: unknown) => (error as Error).message),
}));

import { AUTHORITY } from "@/constants/domain";
import { requireAccessToken } from "@/features/auth/session";
import { getViewer } from "@/features/shell/viewer";
import { serverApi } from "@/lib/api";

import { deleteProjectAttachmentAction } from "./actions";

/**
 * `deleteProjectAttachmentAction` — **실서버 경로**(프로젝트 기획 탭 첨부 삭제, FE 감사 #11).
 *
 * ⚠️ BE `ProjectAttachmentController.delete`는 `hasRole('OWNER')`뿐이다(업로드·확정보다 좁다,
 *    2026-08-18 실코드 대조) — Admin이 막히는지가 이 테스트의 핵심이다.
 */

const requireAccessTokenMock = requireAccessToken as unknown as jest.Mock;
const getViewerMock = getViewer as unknown as jest.Mock;
const serverApiMock = serverApi as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  requireAccessTokenMock.mockResolvedValue("token");
});

describe("deleteProjectAttachmentAction", () => {
  it("OWNER면 DELETE를 보내고 성공한다", async () => {
    getViewerMock.mockResolvedValue({ id: 1, role: AUTHORITY.OWNER, isAdmin: false });
    serverApiMock.mockResolvedValue(undefined);

    const result = await deleteProjectAttachmentAction(10, 20);

    expect(result).toEqual({ ok: true });
    expect(serverApiMock).toHaveBeenCalledWith(
      "/api/projects/10/attachments/20",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("Admin 겸직자여도 막는다 — 삭제는 OWNER 전용이다", async () => {
    getViewerMock.mockResolvedValue({ id: 1, role: AUTHORITY.LEADER, isAdmin: true });

    const result = await deleteProjectAttachmentAction(10, 20);

    expect(result).toEqual({ ok: false, message: "첨부파일을 지울 권한이 없습니다" });
    expect(serverApiMock).not.toHaveBeenCalled();
  });

  it("서버 실패는 그대로 문장을 전달한다", async () => {
    getViewerMock.mockResolvedValue({ id: 1, role: AUTHORITY.OWNER, isAdmin: false });
    serverApiMock.mockRejectedValue(new Error("첨부파일을 찾을 수 없습니다"));

    const result = await deleteProjectAttachmentAction(10, 20);

    expect(result).toEqual({ ok: false, message: "첨부파일을 찾을 수 없습니다" });
  });
});
