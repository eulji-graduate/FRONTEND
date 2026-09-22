import { render, screen } from "@testing-library/react";

import { ACTION_STATUS } from "@/constants/domain";

import type { ManagedMemberAction } from "../manage-types";
import { MemberActionList } from "./member-action-list";

/**
 * 담당 액션 카드 — **못 읽은 것과 없는 것을 가르는지**가 이 스위트의 전부다(§정직성).
 * 이 카드는 오프보딩 승인 직전에 "이 사람이 뭘 들고 있나"를 보는 자리라, 조회가 실패했는데
 * `맡고 있는 액션이 없습니다`라고 말하면 인수인계 없이 액션이 붕 뜬다.
 */

function buildAction(overrides: Partial<ManagedMemberAction> = {}): ManagedMemberAction {
  return {
    id: "1",
    title: "굿즈 시안 2차 검토",
    status: ACTION_STATUS.IN_PROGRESS,
    dueDate: "2026-08-20",
    ...overrides,
  };
}

describe("MemberActionList", () => {
  it("액션이 없으면 없다고 말한다", () => {
    render(<MemberActionList actions={{ items: [], totalCount: 0 }} />);

    expect(screen.getByText("맡고 있는 액션이 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("전체 0건")).toBeInTheDocument();
  });

  it("못 읽었으면 **다른 문장**으로 말하고 건수를 안 적는다", () => {
    render(<MemberActionList actions={null} />);

    expect(screen.getByText("담당 액션을 불러오지 못했습니다.")).toBeInTheDocument();
    expect(screen.queryByText("맡고 있는 액션이 없습니다.")).not.toBeInTheDocument();
    // ⚠️ `전체 0건`이라고 적는 순간 그게 곧 거짓말이다 — 숫자를 아예 안 그린다.
    expect(screen.queryByText(/전체 \d+건/)).not.toBeInTheDocument();
  });

  it("머리의 건수는 그려진 줄 수가 아니라 서버가 센 전체다", () => {
    render(<MemberActionList actions={{ items: [buildAction()], totalCount: 34 }} />);

    expect(screen.getByText("전체 34건")).toBeInTheDocument();
  });

  // ⚠️ 잘렸으면 잘렸다고 적는다 — 아무 말도 없으면 그게 전부인 줄 안다.
  it("전체보다 적게 그렸으면 몇 건이 더 있는지 적는다", () => {
    render(
      <MemberActionList
        actions={{ items: [buildAction(), buildAction({ id: "2" })], totalCount: 5 }}
      />,
    );

    expect(
      screen.getByText("마감이 가까운 2건만 보여줍니다. 3건이 더 있습니다."),
    ).toBeInTheDocument();
  });

  it("전부 그렸으면 잘렸다는 말을 안 붙인다", () => {
    render(<MemberActionList actions={{ items: [buildAction()], totalCount: 1 }} />);

    expect(screen.queryByText(/더 있습니다/)).not.toBeInTheDocument();
  });

  /*
    ⚠️ **지연은 저장값이 아니라 마감일에서 계산한다**(§도메인 상수). 마감이 지난 걸
       `진행중`으로 보여 주면, 승인 직전에 급한 일을 못 알아본다.
  */
  it("마감이 지난 진행중 액션은 지연으로 그린다", () => {
    render(
      <MemberActionList
        actions={{ items: [buildAction({ dueDate: "2020-01-01" })], totalCount: 1 }}
      />,
    );

    expect(screen.getByText("지연")).toBeInTheDocument();
  });
});
