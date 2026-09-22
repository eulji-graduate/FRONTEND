import { render, screen } from "@testing-library/react";

import { ACTION_STATUS } from "@/constants/domain";

import type { MyActionListItem } from "../types";
import { MyActionListItemRow } from "./my-action-list-item";

const BASE: MyActionListItem = {
  id: 1,
  title: "로그인 화면 마크업",
  description: "폼 검증까지",
  team: "개발팀",
  projectId: 10,
  projectName: "Z 워크스페이스",
  projectTag: "GOODS",
  startDate: "2999-01-01",
  /* ⚠️ 먼 미래로 둔다 — 마감이 지나면 `isDelayed`가 상태를 `지연`으로 덮어써 배지가 빨강이 된다 */
  dueDate: "2999-12-31",
  status: ACTION_STATUS.IN_PROGRESS,
};

function renderRow(status: MyActionListItem["status"]) {
  render(
    <ul>
      <MyActionListItemRow
        action={{ ...BASE, status }}
        showDivider={false}
        isFirst
        isLast={false}
      />
    </ul>,
  );
}

describe("MyActionListItemRow 상태 배지", () => {
  /**
   * ⚠️ **진행중 배지는 상태 토큰에서 색을 가져온다**(#435). `--success`와 `--status-progress`는
   *    지금 값이 같을 뿐 별개 토큰이라, 성공 토큰을 빌려 쓰면 한쪽만 조정되는 날 같은 "진행중"이
   *    화면마다 다른 색이 된다 — 눈으로는 안 보이는 회귀라 여기서 문자열로 못 박는다
   *    (`action-timeline.tsx`의 BAR_CLASS와 같은 규칙).
   */
  it("진행중은 `--status-progress`를 쓴다 — `--success`를 빌려 쓰지 않는다", () => {
    renderRow(ACTION_STATUS.IN_PROGRESS);

    const badge = screen.getByText("진행중");

    expect(badge).toHaveClass("bg-status-progress/12", "text-status-progress");
    expect(badge.className).not.toMatch(/\bbg-success\b|\btext-success\b/);
  });

  /* 나머지 상태는 무채색이다 — 진행중만 색을 갖는다(DESIGN §5) */
  it("할일은 무채색이다", () => {
    renderRow(ACTION_STATUS.TODO);

    expect(screen.getByText("할 일")).toHaveClass("bg-muted", "text-muted-foreground");
  });
});
