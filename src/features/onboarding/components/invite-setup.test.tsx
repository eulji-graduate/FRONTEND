import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AUTHORITY } from "@/constants/domain";

import type { DepartmentNode, Position } from "../types";
import { InviteSetup } from "./invite-setup";

/**
 * 사원 초대 — 잘못된 주소를 걸러 내는 것이 이 화면의 일이다.
 *
 * ⚠️ 입력 중에는 잔소리하지 않는다. **뭔가 적혔는데 형식이 어긋날 때만** 알린다 —
 *    한 글자 칠 때마다 빨간 글씨가 뜨면 아무도 안 읽는다.
 */
/*
  이 화면은 **이미 발송된 목록이면 결제로 돌려보낸다** — 그래서 라우터를 쓴다.
  테스트는 발송 전 상태만 다루므로 돌려보내는 일이 없다. 목은 라우터가 없다는 오류만 막는다.
*/
const replace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: (...args: string[]) => replace(...args) }),
}));

const DEPARTMENTS: DepartmentNode[] = [
  { id: "d1", name: "개발팀", children: [{ id: "r1", name: "프론트엔드", children: [] }] },
];
const POSITIONS: Position[] = [{ id: "p1", name: "사원", role: AUTHORITY.MEMBER }];

function setup() {
  return {
    user: userEvent.setup(),
    ...render(<InviteSetup departments={DEPARTMENTS} positions={POSITIONS} />),
  };
}

beforeEach(() => {
  window.sessionStorage.clear();
  replace.mockClear();
});

describe("InviteSetup", () => {
  it("형식이 어긋난 주소는 그 자리에서 알려준다", async () => {
    const { user } = setup();

    await user.type(screen.getAllByLabelText("초대할 메일 주소")[0]!, "hyun");

    expect(screen.getByText("주소 형식이 아닙니다")).toBeInTheDocument();
  });

  it("제대로 된 주소에는 아무 말도 하지 않는다", async () => {
    const { user } = setup();

    await user.type(screen.getAllByLabelText("초대할 메일 주소")[0]!, "hyun@nova.com");

    expect(screen.queryByText("주소 형식이 아닙니다")).not.toBeInTheDocument();
  });

  // 같은 사람을 두 번 초대하면 계정이 두 개 생긴다
  it("같은 주소를 또 적으면 잡아낸다", async () => {
    const { user } = setup();

    await user.type(screen.getAllByLabelText("초대할 메일 주소")[0]!, "hyun@nova.com");
    await user.click(screen.getByRole("button", { name: "행 추가" }));

    const rows = screen.getAllByLabelText("초대할 메일 주소");
    await user.type(rows[rows.length - 1]!, "hyun@nova.com");

    /*
      ⚠️ **뒤에 온 줄에만** 표시된다. 첫 줄에도 뜨던 것을 고쳤다 — 실제로 나가는 건 첫 줄이라
         경고 2줄 : 빠지는 줄 1줄로 어긋났고, 확인 창이 `표시가 뜬 N줄`이라 말하는 이상
         그 수가 맞아야 한다. 리더 중복과 같은 규약이다(적대적 검토 #163).
      ⚠️ 문구가 `위에 같은 주소가 있습니다`라 첫 줄에 뜨면 그 자체로 틀린 말이기도 하다.
    */
    expect(screen.getAllByText("위에 같은 주소가 있습니다")).toHaveLength(1);
  });

  /*
    ⚠️ **확인 창의 `초대`는 적은 사람 수다.** 전에는 이번에 나갈 수를 적었는데, 팀·역할·직급을
       아직 안 고른 줄이 있으면 그 값이 `0`이 된다 — 사람을 둘 적어 놓고 `초대 0`을 보면
       적은 게 다 날아간 줄 안다. 실제로 몇 명에게 나가는지는 그 아래 문장이 말한다.
  */
  it("확인 창은 적은 사람 수를 적는다 — 아직 다 못 고른 줄이어도 0이 아니다", async () => {
    const { user } = setup();

    await user.type(screen.getAllByLabelText("초대할 메일 주소")[0]!, "a@nova.com");
    await user.click(screen.getByRole("button", { name: "행 추가" }));
    const rows = screen.getAllByLabelText("초대할 메일 주소");
    await user.type(rows[rows.length - 1]!, "b@nova.com");

    await user.click(screen.getByRole("button", { name: "완료" }));

    const dialog = screen.getByRole("dialog");
    // 팀·직급·초대 세 숫자 중 초대 자리
    expect(within(dialog).getByText("초대").parentElement).toHaveTextContent("2");
    // 나가는 수는 0이다 — 팀·역할·직급을 아직 안 골랐다. 문장이 그걸 말한다
    expect(within(dialog).getByText(/확인을 누르면 조직 구성이 확정됩니다/)).toBeInTheDocument();
  });
});
