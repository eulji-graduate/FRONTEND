import { render, screen } from "@testing-library/react";

import type { TimelineActionInput } from "../action-timeline";
import { ActionTimeline } from "./action-timeline";

/** 2026-08-05는 수요일 — 축 계산 테스트(`action-timeline.test.ts`)와 같은 고정 오늘을 쓴다. */
const TODAY = new Date("2026-08-05T00:00:00");

function buildItem(overrides: Partial<TimelineActionInput> = {}): TimelineActionInput {
  return {
    id: "t1",
    title: "앱 개발 착수",
    tag: "GOODS",
    tagBgColor: "var(--tag-purple-bg)",
    tagTextColor: "var(--tag-purple-fg)",
    startDate: "2026-08-01",
    dueDate: "2026-08-20",
    tone: "IN_PROGRESS",
    href: "/app/projects/1/team/1",
    ...overrides,
  };
}

/*
  하위 진척 게이지(#421). ⚠️ 여기서 갈리는 건 **`null`과 `0/0`이 다른 뜻**이라는 것이다
  (BE #355) — `null`은 하위 개념 자체가 없는 줄이라 안 그리고, `0/0`은 하위가 비어 있는
  팀 액션이라 그린다. 둘을 뭉개면 "아직 안 쪼갠 팀 액션"이 화면에서 사라진다.
*/
describe("ActionTimeline — 하위 진척", () => {
  it("하위 진척 값이 있으면 3/5로 그리고 행 이름에도 실어 보낸다", () => {
    render(
      <ActionTimeline
        items={[buildItem({ childDoneCount: 3, childTotalCount: 5 })]}
        today={TODAY}
      />,
    );

    /* ⚠️ 날짜 축에도 맨숫자가 깔려 있어 `getByText("3")`은 여러 개를 문다 — 행 안에서 본다 */
    const row = screen.getByRole("link", { name: /하위 액션 5개 중 3개 완료/ });
    /* 행이 Link면 aria-label이 안쪽 글자를 덮는다 — 숫자가 이름에도 있어야 들린다(§a11y) */
    expect(row).toHaveTextContent("3/5");
  });

  it("0/0은 하위가 비어 있다는 사실이라 그대로 그린다", () => {
    render(
      <ActionTimeline
        items={[buildItem({ childDoneCount: 0, childTotalCount: 0 })]}
        today={TODAY}
      />,
    );

    const row = screen.getByRole("link", { name: /하위 액션 0개 중 0개 완료/ });
    expect(row).toHaveTextContent("0/0");
  });

  it("null은 하위 개념 자체가 없는 줄이라 아무것도 안 그린다", () => {
    render(
      <ActionTimeline
        items={[buildItem({ childDoneCount: null, childTotalCount: null })]}
        today={TODAY}
      />,
    );

    const row = screen.getByRole("link", { name: /앱 개발 착수/ });
    expect(row).not.toHaveTextContent("0/0");
    expect(screen.queryByRole("link", { name: /하위 액션/ })).not.toBeInTheDocument();
  });

  it("값을 아예 안 넘기는 화면(개인 액션·인수인계)도 조용하다", () => {
    render(<ActionTimeline items={[buildItem()]} today={TODAY} />);

    expect(screen.queryByRole("link", { name: /하위 액션/ })).not.toBeInTheDocument();
  });

  /*
    ⚠️ 상세 라우트가 없는 행(인수인계 보드·팀 액션 상세)은 `div`로 그려진다. 맨 `div`는
       암묵 역할이 `generic`이라 `aria-label`이 이름으로 안 나가서, 막대(`aria-hidden`)까지
       더하면 이 줄만 통째로 안 들렸다 — `role="group"`으로 이름을 되살린다.
  */
  it("href 없는 행도 하위 진척을 행 이름으로 전한다", () => {
    render(
      <ActionTimeline
        items={[buildItem({ href: undefined, childDoneCount: 2, childTotalCount: 4 })]}
        today={TODAY}
      />,
    );

    const row = screen.getByRole("group", { name: /하위 액션 4개 중 2개 완료/ });
    expect(row).toHaveTextContent("2/4");
    /* 이름이 살아 있으니 상태·D-day·기간도 같이 들린다(막대는 aria-hidden이다) */
    expect(row).toHaveAccessibleName(/진행중/);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
