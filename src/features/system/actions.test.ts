// 서버 액션은 next 런타임 함수를 부른다 — jsdom엔 없으니 목으로 대체하고 호출만 검증한다.
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { COMPANY_STATUS, NOTICE_TARGET } from "@/constants/domain";

import {
  approveCompanyAction,
  publishNoticeAction,
  rejectCompanyAction,
  retryPipelineAction,
  sendUnpaidNoticeAction,
  suspendCompanyAction,
  unsuspendCompanyAction,
} from "./actions";
import { findMockPendingApproval } from "./mock/approvals";
import { findMockCompany, setMockCompanyStatus } from "./mock/companies";

const redirectMock = redirect as unknown as jest.Mock;
const revalidatePathMock = revalidatePath as unknown as jest.Mock;

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
};

beforeEach(() => {
  redirectMock.mockClear();
  revalidatePathMock.mockClear();
});

describe("기업 승인·반려", () => {
  // ⚠️ 목 배열을 실제로 지운다 — 테스트마다 다른 id를 써서 서로 간섭하지 않게 한다.
  // ⚠️ 무한 스크롤 목록이라 페이지를 옮기지 않는다 — `redirect` 대신 `revalidatePath` +
  //    `{ success }` 반환으로 끝난다(호출부가 로컬 상태에서 행을 지운다).
  it("승인하면 대기 목록에서 빠지고 성공을 돌려준다", async () => {
    expect(findMockPendingApproval("2")).not.toBeNull();

    const result = await approveCompanyAction("2");

    expect(findMockPendingApproval("2")).toBeNull();
    expect(result).toEqual({ success: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/system/approval");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("반려도 대기 목록에서 지운다", async () => {
    expect(findMockPendingApproval("3")).not.toBeNull();

    const result = await rejectCompanyAction("3");

    expect(findMockPendingApproval("3")).toBeNull();
    expect(result).toEqual({ success: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/system/approval");
  });

  it("없는 id면 실패로 돌려준다", async () => {
    expect(await approveCompanyAction("존재하지-않음")).toEqual({ success: false });
    expect(await rejectCompanyAction("존재하지-않음")).toEqual({ success: false });
  });
});

describe("기업 정지·정지 해제", () => {
  // 상세 화면에 머무는 흐름 — redirect 없이 revalidatePath로 새로고침한다.
  afterEach(() => setMockCompanyStatus("2", COMPANY_STATUS.ACTIVE));

  it("정지하면 상태가 SUSPENDED로 바뀌고 해당 경로를 재검증한다", async () => {
    await suspendCompanyAction(form({ companyId: "2", path: "/system/companies/2" }));

    expect(findMockCompany("2")?.status).toBe(COMPANY_STATUS.SUSPENDED);
    expect(revalidatePathMock).toHaveBeenCalledWith("/system/companies/2");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("정지 해제하면 상태가 ACTIVE로 돌아온다", async () => {
    setMockCompanyStatus("2", COMPANY_STATUS.SUSPENDED);

    await unsuspendCompanyAction(form({ companyId: "2" }));

    expect(findMockCompany("2")?.status).toBe(COMPANY_STATUS.ACTIVE);
    expect(revalidatePathMock).toHaveBeenCalledWith("/system/companies");
  });
});

describe("미납 안내 발송", () => {
  it("있는 기업이면 오너 이메일과 함께 성공한다", async () => {
    const result = await sendUnpaidNoticeAction("1");

    expect(result).toEqual({ success: true, ownerEmail: findMockCompany("1")?.ownerEmail });
  });

  it("없는 기업이면 실패로 돌려준다", async () => {
    expect(await sendUnpaidNoticeAction("존재하지-않음")).toEqual({ success: false });
  });
});

describe("파이프라인 재처리", () => {
  it("실패 목록에 있는 회의는 재처리 성공", async () => {
    expect(await retryPipelineAction("MTG-2025-0721-03")).toEqual({ success: true });
  });

  it("실패 목록에 없는 회의는 성공하지 않는다", async () => {
    expect(await retryPipelineAction("MTG-없음")).toEqual({ success: false });
  });
});

describe("공지 발행", () => {
  // ⚠️ 화면 가드는 UX일 뿐 — 서버에서도 빈 값을 한 번 더 막는다(CLAUDE.md §권한).
  it("제목·내용이 차 있으면 발행 성공", async () => {
    const result = await publishNoticeAction({
      title: "점검 안내",
      content: "내용",
      target: NOTICE_TARGET.ALL,
    });

    expect(result).toEqual({ success: true });
  });

  it("제목이 공백뿐이면 막는다", async () => {
    const result = await publishNoticeAction({
      title: "   ",
      content: "내용",
      target: NOTICE_TARGET.ALL,
    });

    expect(result).toEqual({ success: false });
  });

  it("내용이 비면 막는다", async () => {
    const result = await publishNoticeAction({
      title: "제목",
      content: "",
      target: NOTICE_TARGET.UNPAID,
    });

    expect(result).toEqual({ success: false });
  });

  // ⚠️ "특정 기업" 대상인데 고른 곳이 없으면 발송 대상이 없다 — 서버에서도 막는다.
  it("특정 기업 대상인데 고른 기업이 없으면 막는다", async () => {
    const result = await publishNoticeAction({
      title: "제목",
      content: "내용",
      target: NOTICE_TARGET.SPECIFIC,
      companyIds: [],
    });

    expect(result).toEqual({ success: false });
  });

  it("특정 기업을 골랐으면 발행 성공", async () => {
    const result = await publishNoticeAction({
      title: "제목",
      content: "내용",
      target: NOTICE_TARGET.SPECIFIC,
      companyIds: ["1", "2"],
    });

    expect(result).toEqual({ success: true });
  });
});
