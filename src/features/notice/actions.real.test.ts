jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
jest.mock("@/mocks/config", () => ({ isMock: false }));
jest.mock("@/features/auth/session", () => ({ requireAccessToken: jest.fn() }));
jest.mock("@/features/shell/viewer", () => ({ getViewer: jest.fn() }));
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

import { AUTHORITY } from "@/constants/authority";
import { requireAccessToken } from "@/features/auth/session";
import { getViewer } from "@/features/shell/viewer";
import { serverApi } from "@/lib/api";

import { createNoticeAction, deleteNoticeAction, updateNoticeAction } from "./actions";

/**
 * 공지 작성·수정·삭제 — **실서버 권한 판정**.
 *
 * ⚠️ `getMockActor()`(고정 OWNER)를 무조건 쓰던 버그를 고친 회귀 테스트 — 실서버에서는
 *    `getViewer()`(실제 로그인 세션)를 봐야 OWNER가 아닌 사람이 공지를 작성·수정·삭제하지
 *    못한다(`canManageNotice`는 OWNER 전용, rooms의 `actions.real.test.ts`와 같은 패턴).
 */

const requireAccessTokenMock = requireAccessToken as unknown as jest.Mock;
const getViewerMock = getViewer as unknown as jest.Mock;
const serverApiMock = serverApi as unknown as jest.Mock;

const OWNER = { id: 1, name: "대표", role: AUTHORITY.OWNER };
const MEMBER = { id: 3, name: "이하윤", role: AUTHORITY.MEMBER, teamName: "개발팀" };

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

beforeEach(() => {
  jest.clearAllMocks();
  requireAccessTokenMock.mockResolvedValue("token");
});

describe("createNoticeAction — 실서버 권한 판정", () => {
  it("OWNER 로그인 세션이면 통과한다", async () => {
    getViewerMock.mockResolvedValue(OWNER);
    serverApiMock.mockResolvedValueOnce({ noticeId: 10 });

    const result = await createNoticeAction(
      { errors: {} },
      form({ title: "공지 제목", body: "본문" }),
    );

    expect(result.errors).toEqual({});
    expect(result.notice).toBeDefined();
    expect(serverApiMock).toHaveBeenCalledTimes(1);
  });

  it("MEMBER 로그인 세션이면 BE를 부르지 않고 막는다", async () => {
    getViewerMock.mockResolvedValue(MEMBER);

    const result = await createNoticeAction(
      { errors: {} },
      form({ title: "공지 제목", body: "본문" }),
    );

    expect(result.errors.title).toBe("공지를 작성할 권한이 없습니다");
    expect(result.notice).toBeUndefined();
    expect(serverApiMock).not.toHaveBeenCalled();
  });
});

describe("updateNoticeAction — 실서버 권한 판정", () => {
  it("OWNER 로그인 세션이면 통과한다", async () => {
    getViewerMock.mockResolvedValue(OWNER);
    serverApiMock.mockResolvedValueOnce({
      noticeId: 10,
      title: "수정된 제목",
      body: "본문",
      publishedAt: "2026-08-16",
    });

    const result = await updateNoticeAction(
      { errors: {} },
      form({ id: "10", title: "수정된 제목", body: "본문" }),
    );

    expect(result.errors).toEqual({});
    expect(serverApiMock).toHaveBeenCalledTimes(1);
  });

  it("MEMBER 로그인 세션이면 BE를 부르지 않고 막는다", async () => {
    getViewerMock.mockResolvedValue(MEMBER);

    const result = await updateNoticeAction(
      { errors: {} },
      form({ id: "10", title: "수정된 제목", body: "본문" }),
    );

    expect(result.errors.title).toBe("공지를 수정할 권한이 없습니다");
    expect(serverApiMock).not.toHaveBeenCalled();
  });
});

describe("deleteNoticeAction — 실서버 권한 판정", () => {
  it("OWNER 로그인 세션이면 통과한다", async () => {
    getViewerMock.mockResolvedValue(OWNER);
    serverApiMock.mockResolvedValueOnce(null);

    await deleteNoticeAction(form({ id: "10" }));

    expect(serverApiMock).toHaveBeenCalledTimes(1);
  });

  it("MEMBER 로그인 세션이면 BE를 부르지 않고 막는다", async () => {
    getViewerMock.mockResolvedValue(MEMBER);

    await expect(deleteNoticeAction(form({ id: "10" }))).rejects.toThrow(
      "공지를 삭제할 권한이 없습니다",
    );
    expect(serverApiMock).not.toHaveBeenCalled();
  });
});
