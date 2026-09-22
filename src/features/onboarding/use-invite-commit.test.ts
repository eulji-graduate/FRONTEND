import { act, renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";

import { AUTHORITY } from "@/constants/domain";

import type { DepartmentNode, Invite, Position } from "./types";
import { useInviteCommit } from "./use-invite-commit";

const commitOnboardingAction = jest.fn();
jest.mock("./actions", () => ({
  commitOnboardingAction: (...args: unknown[]) => commitOnboardingAction(...args),
}));

const replaceMock = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

const DEPARTMENTS: DepartmentNode[] = [{ id: "d1", name: "개발팀", children: [] }];
const POSITIONS: Position[] = [{ id: "p1", name: "팀장", role: AUTHORITY.LEADER }];
const INVITE: Invite = {
  id: "i1",
  name: "",
  email: "user1@example.com",
  departmentId: "d1",
  roleId: "__leader-role__",
  positionId: "p1",
  isAdmin: false,
  isSent: false,
};

function setup() {
  return renderHook(() =>
    useInviteCommit({
      invites: [INVITE],
      sendable: [INVITE],
      departments: DEPARTMENTS,
      positions: POSITIONS,
      markSent: jest.fn(),
    }),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useInviteCommit — 실패했을 때 버튼을 되살린다", () => {
  it("서버가 실패로 답하면 그 사유를 그대로 남긴다", async () => {
    commitOnboardingAction.mockResolvedValue({
      ok: false,
      error: "서버 내부 오류가 발생했습니다. (Z-003 · 8f21c0)",
      issuedEmails: [],
      skipped: [],
    });

    const { result } = setup();
    await act(async () => result.current.commit());

    await waitFor(() => expect(result.current.isCommitting).toBe(false));
    /* ⚠️ 꼬리표는 `toUserMessage`가 이미 문장에 넣어 준다 — 화면이 따로 나르지 않는다 */
    expect(result.current.error).toBe("서버 내부 오류가 발생했습니다. (Z-003 · 8f21c0)");
  });

  /*
    ⚠️ **이게 [등록 중]에 굳던 자리다**(2026-08-12). 액션은 BE 실패를 `{ok:false}`로 돌려주지만,
       브라우저에서 Next 서버까지 가는 길이 끊기면 `await` 자체가 던진다 — 그때 실패 분기를
       못 타서 버튼이 영영 잠긴 채로 남았다. `serverApi`의 타임아웃은 이 구간을 못 지킨다.
  */
  it("액션 호출 자체가 던져도 잠기지 않는다 — 굳으면 새로고침 말고는 길이 없다", async () => {
    commitOnboardingAction.mockRejectedValue(new TypeError("Failed to fetch"));

    const { result } = setup();
    await act(async () => result.current.commit());

    await waitFor(() => expect(result.current.isCommitting).toBe(false));
    expect(result.current.error).toBe("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  });
});

/**
 * `alreadyOnboarded` — 2026-08-14 프로덕션 사고. 1차 시도가 응답만 못 받고 서버에서는
 * 이미 성공한 뒤 재시도하면 BE가 `AU-035`를 돌려준다 — 이걸 오류로 세우지 않고
 * 결제 단계로 그냥 넘기는지 잠근다.
 */
describe("useInviteCommit — 이미 온보딩이 끝난 회사(AU-035)", () => {
  it("오류를 세우지 않고 결제 단계로 넘긴다", async () => {
    commitOnboardingAction.mockResolvedValue({
      ok: false,
      alreadyOnboarded: true,
      issuedEmails: [],
      skipped: [],
    });

    const { result } = setup();
    act(() => result.current.setConfirmOpen(true));
    await act(async () => result.current.commit());

    await waitFor(() => expect(result.current.isCommitting).toBe(false));
    expect(result.current.error).toBeNull();
    // ⚠️ 확인 창을 닫는다 — 성공한 것처럼 다음 화면으로 넘어간다
    expect(result.current.isConfirmOpen).toBe(false);
    expect(toast.success).toHaveBeenCalledWith("이미 등록된 회사입니다");
    expect(replaceMock).toHaveBeenCalledWith("/onboarding/payment");
  });
});
