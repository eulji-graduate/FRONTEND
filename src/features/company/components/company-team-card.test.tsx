jest.mock("../actions", () => ({ saveDepartmentsAction: jest.fn() }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

import { saveDepartmentsAction } from "../actions";
import type { DepartmentNode } from "../types";
import { CompanyTeamCard } from "./company-team-card";

/**
 * 팀 체계 카드 — **이 파일이 지키는 건 화면의 상태 기계**다.
 *
 * 저장 실패 문구가 언제 뜨고 언제 사라지는지, 사원이 딸린 팀을 건드렸을 때 무엇을 막는지.
 * 둘 다 이 브랜치에서 처음 들어간 것이고, 각각 "오류가 안 지워짐"·"지운 적 없는데 막힘" 같은
 * 막다른 길을 만들 수 있는 자리다.
 */

const saveMock = saveDepartmentsAction as unknown as jest.Mock;
const toastErrorMock = toast.error as unknown as jest.Mock;

/*
  ⚠️ **빈팀을 먼저 둔다.** 강등(Alt+→)은 "바로 위 팀의 역할로" 들어가는 조작이라, 사원이 있는
     개발팀이 첫 줄이면 강등 자체가 불가능해 막는지 못 본다.
*/
const TEAMS: DepartmentNode[] = [
  { id: "d2", name: "빈팀", children: [] },
  { id: "d1", name: "개발팀", children: [{ id: "r1", name: "프론트", children: [] }] },
];

/** 개발팀에만 사람이 있다 — 빈팀은 지울 수 있어야 한다 */
const COUNTS = { d1: 6, d2: 0 };

/*
  ⚠️ 기본은 **역할에 사람이 없다**로 둔다. 역할 삭제 자체를 보는 기존 테스트들이
     "막히지 않고 지워지는" 경로를 확인하기 때문이다 — 역할이 막히는 경로는
     `roleMemberCounts`를 따로 주는 아래 describe에서 본다.
*/
const ROLE_COUNTS = { r1: 0 };

function renderCard(roleCounts: Record<string, number> = ROLE_COUNTS) {
  return render(
    <CompanyTeamCard initial={TEAMS} memberCounts={COUNTS} roleMemberCounts={roleCounts} />,
  );
}

beforeEach(() => {
  saveMock.mockReset();
  toastErrorMock.mockReset();
});

describe("저장 실패 문구", () => {
  /*
    ⚠️ 검증 문구는 `같은 이름이 둘 있습니다 — 개발팀`처럼 **어느 줄이 문제인지** 담고 있어서
       화면에 남긴다. 그런데 남기기만 하면, 값을 고쳐 문제가 사라진 뒤에도 화면은 계속
       그렇다고 말한다 — 편집하면 저절로 사라져야 한다.
  */
  it("실패하면 저장 줄에 남고, 편집하면 사라진다", async () => {
    const user = userEvent.setup();
    saveMock.mockResolvedValue({ isSuccess: false, message: "같은 이름이 둘 있습니다" });
    renderCard();

    // 뭔가 바꿔야 [저장]이 열린다
    await user.type(screen.getByPlaceholderText(/새 팀 이름/), "영업팀{Enter}");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("같은 이름이 둘 있습니다")).toBeInTheDocument();

    // 한 글자만 더 적어도 = 값이 달라졌으니 그 문구는 더 이상 이 값에 대한 말이 아니다
    await user.type(screen.getByPlaceholderText(/새 팀 이름/), "가{Enter}");

    expect(screen.queryByText("같은 이름이 둘 있습니다")).not.toBeInTheDocument();
  });

  /*
    ⚠️ **전송 자체가 거부되는 경우**다(적대적 리뷰 2026-08-12). 액션은 BE 실패를 값으로
       돌려주지만, 브라우저에서 Next 서버까지 가는 길이 끊기면(배포·재시작·네트워크)
       `await`가 던진다 — 안 잡으면 화면이 통째로 `error.tsx`로 넘어가 **방금 편집한 팀 트리를
       잃는다.** 이 테스트가 없던 동안에는 그 방어를 통째로 지워도 933개가 전부 초록이었다.
  */
  it("전송이 거부돼도 화면이 죽지 않고 그 자리에 남는다", async () => {
    const user = userEvent.setup();
    saveMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderCard();

    await user.type(screen.getByPlaceholderText(/새 팀 이름/), "영업팀{Enter}");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(
      await screen.findByText("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."),
    ).toBeInTheDocument();
    // 편집하던 값이 그대로 살아 있어야 한다 — 다시 누르면 되는 상태다
    expect(screen.getByText("영업팀")).toBeInTheDocument();
  });

  it("성공하면 아무 문구도 남기지 않는다", async () => {
    const user = userEvent.setup();
    saveMock.mockResolvedValue({ isSuccess: true });
    renderCard();

    await user.type(screen.getByPlaceholderText(/새 팀 이름/), "영업팀{Enter}");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("사원이 딸린 팀", () => {
  /*
    ⚠️ 팀은 인수인계·액션 귀속의 단위다. 소속이 사라진 사원은 아무도 관리할 수 없다 —
       그래서 막고, **갈 곳**까지 알려 준다.
  */
  it("삭제를 누르면 지우지 않고 갈 곳을 알려 준다", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "개발팀 삭제" }));

    expect(screen.getByText(/지울 수 없습니다/)).toBeInTheDocument();
    expect(screen.getByText(/사원 6명/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "사원 관리 열기" })).toBeInTheDocument();
    // 지우는 버튼을 주지 않는다 — 확인이 아니라 막는 창이다
    expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
  });

  /*
    ⚠️ **위치 이동 손잡이를 이 화면만 껐다**(2026-08-14). 순서를 저장할 API가 없어서
       바꾸고 [저장]을 누르면 성공했다고 뜨고 실제로는 조용히 사라졌다(`canReorder`,
       `department-node.tsx` 주석) — 그래서 드래그·Alt+방향키 전부가 이 화면에서는
       사라졌다. 강등이 막히는지(사원이 딸린 팀)를 확인하던 아래 두 테스트는 그 조작을
       시작할 손잡이 자체가 없어져서 지웠다 — `blockIfStaffed`는 이 화면 전용 규칙이라
       (온보딩엔 사원이 없어 같은 개념이 없다) 다른 자리에도 없다. 손잡이를 되살릴 때
       (`canReorder: true`) 함께 되살릴 자리다.
  */
});

describe("역할(트리 아랫단)", () => {
  /* ⚠️ 삭제 버튼은 역할에도 붙는다 — 전부 "팀"이라 부르면 무엇을 지우는지 잘못 말한다 */
  it("역할을 지울 때는 '팀'이라 부르지 않는다", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "프론트 삭제" }));

    expect(screen.getByText(/‘프론트’ 역할을 지울까요\?/)).toBeInTheDocument();
  });

  /*
    ⚠️ **BE PR #528 이후 역할도 팀과 같은 원칙을 따른다.** 사람이 있는 역할을 지우면
       그 사람은 되돌릴 명시적 재할당 없이 조용히 "역할 없음"이 된다 — 팀처럼 막고
       갈 곳(사원 관리)을 알려 준다.
  */
  it("사람이 있는 역할은 지우지 못하고, 팀이 아니라 역할이 막혔다고 말한다", async () => {
    const user = userEvent.setup();
    renderCard({ r1: 4 });

    await user.click(screen.getByRole("button", { name: "프론트 삭제" }));

    expect(screen.getByText(/‘프론트’ 역할은 지울 수 없습니다/)).toBeInTheDocument();
    expect(screen.getByText(/사원 4명이 이 역할을 쓰고 있습니다/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "사원 관리 열기" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
  });
});
