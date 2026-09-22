import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

import { NOTICE_TARGET } from "@/constants/domain";

import { NoticeComposeCard } from "./notice-compose-card";

// 서버 액션은 격리막 너머다 — 여기선 카드의 발행 흐름만 본다(액션 자체는 actions.test.ts에서).
const publishNoticeAction = jest.fn();
jest.mock("../actions", () => ({
  publishNoticeAction: (input: unknown) => publishNoticeAction(input),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

/**
 * 발행은 **묻고 나서** 나간다 — 버튼을 눌러도 바로 안 보내고 확인창이 먼저 뜬다.
 * 카드의 `발행`과 창의 `발행`이 이름이 같아, 창 안쪽(`dialog`)에서 다시 찾는다.
 */
async function confirmPublish(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "발행" }));
}

function setup() {
  // 기본 대상은 "전체 기업"이라 companies는 쓰이지 않는다(특정 기업 검색용) — 빈 목록으로 충분하다.
  return { user: userEvent.setup(), ...render(<NoticeComposeCard companies={[]} />) };
}

beforeEach(() => {
  publishNoticeAction.mockReset();
  jest.mocked(toast.success).mockClear();
  jest.mocked(toast.error).mockClear();
});

describe("NoticeComposeCard", () => {
  const publishButton = () => screen.getByRole("button", { name: "발행" });

  // ⚠️ 제목·내용이 다 차기 전엔 발행 버튼이 눌리지 않는다(클라이언트 가드).
  it("제목·내용이 비면 발행 버튼이 잠겨 있다", () => {
    setup();

    expect(publishButton()).toBeDisabled();
  });

  it("제목만 적어도 아직 잠겨 있다", async () => {
    const { user } = setup();

    await user.type(screen.getByLabelText("제목"), "점검 안내");

    expect(publishButton()).toBeDisabled();
  });

  it("제목·내용이 차면 발행할 수 있고, 발행하면 성공 안내가 뜬다", async () => {
    publishNoticeAction.mockResolvedValue({ success: true });
    const { user } = setup();

    await user.type(screen.getByLabelText("제목"), "점검 안내");
    await user.type(screen.getByLabelText("내용"), "오늘 밤 점검이 있습니다");

    const button = publishButton();
    expect(button).toBeEnabled();

    await user.click(button);

    // 아직 안 나갔다 — 확인창이 먼저다
    expect(publishNoticeAction).not.toHaveBeenCalled();
    await confirmPublish(user);

    expect(publishNoticeAction).toHaveBeenCalledWith({
      title: "점검 안내",
      content: "오늘 밤 점검이 있습니다",
      target: NOTICE_TARGET.ALL,
    });
    expect(await screen.findByText("공지를 발행했습니다")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith("공지를 발행했습니다");
  });

  // 발행이 실패하면 성공 안내를 띄우지 않는다 — 조용히 성공한 척하지 않는다(§정직성).
  it("발행이 실패하면 성공 안내 대신 실패를 알린다", async () => {
    publishNoticeAction.mockResolvedValue({ success: false });
    const { user } = setup();

    await user.type(screen.getByLabelText("제목"), "점검 안내");
    await user.type(screen.getByLabelText("내용"), "내용");
    await user.click(publishButton());
    await confirmPublish(user);

    await waitFor(() => expect(publishNoticeAction).toHaveBeenCalled());
    expect(screen.queryByText("공지를 발행했습니다")).not.toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
    // ⚠️ 실패를 조용히 넘기지 않는다 — 눌렀는데 아무 말이 없으면 됐는지 알 수 없다
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("공지를 발행하지 못했습니다"));
  });

  // 확인창을 닫으면 안 나간다 — 확인이 진짜 관문인지 본다
  it("확인창에서 취소하면 발행하지 않는다", async () => {
    publishNoticeAction.mockResolvedValue({ success: true });
    const { user } = setup();

    await user.type(screen.getByLabelText("제목"), "점검 안내");
    await user.type(screen.getByLabelText("내용"), "내용");
    await user.click(publishButton());

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "취소" }));

    expect(publishNoticeAction).not.toHaveBeenCalled();
  });
});
