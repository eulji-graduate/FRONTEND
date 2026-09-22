/**
 * `confirmSubscriptionAction` — **2026-08-14 이 도메인은 항상 더미다**(`actions.ts` 주석
 * 참고). BE를 부르지 않는지, 권한 없으면 그 전에 막는지만 잠근다.
 */
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/features/shell/viewer", () => ({ getViewer: jest.fn() }));

import { revalidatePath } from "next/cache";

import { AUTHORITY } from "@/constants/authority";
import { getViewer } from "@/features/shell/viewer";

import { confirmSubscriptionAction } from "./actions";

const getViewerMock = getViewer as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  getViewerMock.mockResolvedValue({ id: 1, role: AUTHORITY.OWNER });
});

describe("confirmSubscriptionAction", () => {
  it("항상 성공하고, 구독을 읽는 화면 둘 다 갱신한다", async () => {
    const result = await confirmSubscriptionAction();

    expect(result).toEqual({ isSuccess: true });
    expect(revalidatePath).toHaveBeenCalledWith("/manage/billing");
    expect(revalidatePath).toHaveBeenCalledWith("/subscription");
  });

  it("구독 관리 권한이 없으면 막는다 — 성공으로 새지 않는다", async () => {
    getViewerMock.mockResolvedValue({ id: 4, role: AUTHORITY.MEMBER });

    const result = await confirmSubscriptionAction();

    expect(result.isSuccess).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("세션을 못 읽으면 권한 없음으로 본다 — 던지지 않는다", async () => {
    getViewerMock.mockRejectedValue(new Error("no session"));

    const result = await confirmSubscriptionAction();

    expect(result.isSuccess).toBe(false);
  });
});
