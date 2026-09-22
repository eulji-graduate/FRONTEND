jest.mock("../actions", () => ({ savePositionsAction: jest.fn() }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AUTHORITY } from "@/constants/domain";

import { savePositionsAction } from "../actions";
import type { Position } from "../types";
import { CompanyPositionCard } from "./company-position-card";

/**
 * 직급 카드 — **저장이 막혔을 때 화면이 무엇을 하는가**를 지킨다.
 *
 * ⚠️ 팀 체계 카드와 같은 상태 기계다(`company-team-card.test.tsx`). 둘이 같은 자리에서
 *    다르게 굴면 기업 설정 안에서 카드마다 딴 말을 하게 된다.
 */

const saveMock = savePositionsAction as unknown as jest.Mock;

const POSITIONS: Position[] = [
  { id: "p1", name: "팀장", role: AUTHORITY.LEADER },
  { id: "p2", name: "사원", role: AUTHORITY.MEMBER },
];

function renderCard() {
  return render(<CompanyPositionCard initial={POSITIONS} />);
}

/** 뭔가 바꿔야 [저장]이 열린다 — 직급 한 줄을 더한다 */
async function addPositionAndSave(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText(/새 직급 이름/), "대리{Enter}");
  await user.click(screen.getByRole("button", { name: "저장" }));
}

beforeEach(() => {
  saveMock.mockReset();
});

describe("저장 실패 문구", () => {
  it("서버가 막으면 그 사유를 저장 줄에 남긴다", async () => {
    const user = userEvent.setup();
    saveMock.mockResolvedValue({ isSuccess: false, message: "이미 있는 직급명입니다" });
    renderCard();

    await addPositionAndSave(user);

    expect(await screen.findByText("이미 있는 직급명입니다")).toBeInTheDocument();
  });

  /*
    ⚠️ **전송 자체가 거부되는 경우**다(적대적 리뷰 2026-08-12). 액션은 BE 실패를 값으로
       돌려주지만, 브라우저에서 Next 서버까지 가는 길이 끊기면(배포·재시작·네트워크)
       `await`가 던진다 — 안 잡으면 화면이 통째로 `error.tsx`로 넘어가 **방금 짠 직급 목록을
       잃는다.** 이 테스트가 없던 동안에는 그 방어를 통째로 지워도 전부 초록이었다.
  */
  it("전송이 거부돼도 화면이 죽지 않고 그 자리에 남는다", async () => {
    const user = userEvent.setup();
    saveMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderCard();

    await addPositionAndSave(user);

    expect(
      await screen.findByText("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."),
    ).toBeInTheDocument();
    // 방금 더한 줄이 살아 있어야 다시 누를 수 있다
    expect(screen.getByText("대리")).toBeInTheDocument();
  });
});
