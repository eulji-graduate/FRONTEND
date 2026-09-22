import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AUTHORITY } from "@/constants/domain";

import type { Position } from "../types";
import { PositionSetup } from "./position-setup";

/**
 * 직급 체계 — 화면에서 실제로 하는 조작만 검사한다.
 *
 * ⚠️ 구현이 아니라 **보이는 것**으로 찾는다(`getByRole`). 클래스나 내부 상태를 짚으면
 *    화면을 조금만 고쳐도 테스트가 깨진다.
 * ⚠️ `sessionStorage`에 이전 테스트의 임시 저장이 남으면 다음 테스트가 오염된다 — 매번 비운다.
 */
const SEED: Position[] = [
  { id: "p1", name: "사원", role: AUTHORITY.MEMBER },
  { id: "p2", name: "팀장", role: AUTHORITY.LEADER },
];

function setup(initial: Position[] = SEED) {
  return { user: userEvent.setup(), ...render(<PositionSetup initialPositions={initial} />) };
}

/*
  이 화면은 **제출을 마친 보관함이면 결제로 돌려보낸다**(`useCommittedRedirect`) — 그래서 라우터를 쓴다.
  테스트는 제출 전 상태만 다루므로 돌려보내는 일이 없다. 목은 라우터가 없다는 오류만 막는다.
*/
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace: jest.fn() }) }));

beforeEach(() => window.sessionStorage.clear());

describe("PositionSetup", () => {
  it("직급을 적고 Enter를 누르면 목록에 붙는다", async () => {
    const { user } = setup();

    await user.type(screen.getByLabelText("직급명"), "선임{Enter}");

    expect(screen.getByRole("button", { name: "선임 삭제" })).toBeInTheDocument();
  });

  // 이름 없는 직급이 생기면 목록에서 구분할 방법이 없다
  it("공백만 넣으면 추가되지 않는다", async () => {
    const { user } = setup();
    const before = screen.getAllByRole("button", { name: /삭제$/ }).length;

    await user.type(screen.getByLabelText("직급명"), "   {Enter}");

    expect(screen.getAllByRole("button", { name: /삭제$/ })).toHaveLength(before);
  });

  it("삭제를 누르면 그 직급만 사라진다", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "사원 삭제" }));

    expect(screen.queryByRole("button", { name: "사원 삭제" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "팀장 삭제" })).toBeInTheDocument();
  });

  it("이름을 비우고 나가면 되돌아온다 — 이름 없는 직급을 남기지 않는다", async () => {
    const { user } = setup();
    const input = screen.getAllByRole("textbox", { name: "직급명" })[0]!;

    await user.clear(input);
    await user.tab();

    expect(screen.getByRole("button", { name: "사원 삭제" })).toBeInTheDocument();
  });
});
