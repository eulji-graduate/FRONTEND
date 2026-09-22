import {
  canMoveCard,
  compensateOverlayForScale,
  getBoardColumn,
  groupCardsByColumn,
  isCardDelayed,
} from "./lib";
import type { BoardCard } from "./types";

const TODAY = new Date("2026-08-06T09:00:00");

function card(overrides: Partial<BoardCard>): BoardCard {
  return {
    id: 1,
    title: "카드",
    tagLabel: "TAG",
    tagBgColor: "#fff",
    tagTextColor: "#000",
    startDate: "2026-08-01",
    dueDate: "2026-08-10",
    isDone: false,
    ...overrides,
  };
}

describe("getBoardColumn", () => {
  it("완료면 시작일과 무관하게 완료다", () => {
    expect(getBoardColumn(card({ isDone: true, startDate: "2026-08-01" }), TODAY)).toBe("DONE");
  });

  it("시작일이 오늘보다 뒤면 할 일이다", () => {
    expect(getBoardColumn(card({ startDate: "2026-08-07" }), TODAY)).toBe("TODO");
  });

  it("시작일이 오늘이거나 지났으면 진행중이다(마감이 지났어도)", () => {
    expect(getBoardColumn(card({ startDate: "2026-08-06" }), TODAY)).toBe("IN_PROGRESS");
    expect(getBoardColumn(card({ startDate: "2026-07-01", dueDate: "2026-07-15" }), TODAY)).toBe(
      "IN_PROGRESS",
    );
  });
});

describe("isCardDelayed", () => {
  it("완료면 마감이 지났어도 지연이 아니다", () => {
    expect(isCardDelayed(card({ isDone: true, dueDate: "2026-07-01" }), TODAY)).toBe(false);
  });

  it("완료가 아니고 마감이 지났으면 지연이다 — 칸 판정은 호출부(`board-view.tsx`) 몫이다", () => {
    /*
      ⚠️ 시작일이 미래(할 일 칸)이든 과거(진행중 칸)이든 `isCardDelayed`는 마감 경과만 본다.
         "진행중 칸 안의 배지"라는 확정 규칙은 호출부(`isDelayedInView`)가 `columnOf(card)`를
         함께 봐서 지운다 — `getBoardColumn`을 여기서 부르면 드래그 override를 놓친다.
    */
    expect(isCardDelayed(card({ dueDate: "2026-08-01" }), TODAY)).toBe(true);
    expect(isCardDelayed(card({ startDate: "2026-08-07", dueDate: "2026-08-01" }), TODAY)).toBe(
      true,
    );
    expect(isCardDelayed(card({ startDate: "2026-07-01", dueDate: "2026-08-01" }), TODAY)).toBe(
      true,
    );
  });

  it("마감이 안 지났으면 지연이 아니다", () => {
    expect(isCardDelayed(card({ dueDate: "2026-08-10" }), TODAY)).toBe(false);
  });

  it("오늘 마감은 지연이 아니다 — KST 자정 경계 회귀(공용 `isPastDue`)", () => {
    expect(isCardDelayed(card({ dueDate: "2026-08-06" }), TODAY)).toBe(false);
  });
});

describe("canMoveCard", () => {
  it("할 일→진행중, 진행중→완료, 완료→진행중만 허용한다", () => {
    expect(canMoveCard("TODO", "IN_PROGRESS")).toBe(true);
    expect(canMoveCard("IN_PROGRESS", "DONE")).toBe(true);
    expect(canMoveCard("DONE", "IN_PROGRESS")).toBe(true);
  });

  it("같은 칸으로의 이동은 항상 허용한다", () => {
    expect(canMoveCard("TODO", "TODO")).toBe(true);
  });

  it("할 일↔완료 직행, 진행중→할 일은 막는다", () => {
    expect(canMoveCard("TODO", "DONE")).toBe(false);
    expect(canMoveCard("DONE", "TODO")).toBe(false);
    expect(canMoveCard("IN_PROGRESS", "TODO")).toBe(false);
  });
});

describe("groupCardsByColumn", () => {
  it("카드를 칸별로 나눈다", () => {
    const groups = groupCardsByColumn(
      [
        card({ id: 1, startDate: "2026-08-07" }),
        card({ id: 2, startDate: "2026-08-01" }),
        card({ id: 3, isDone: true }),
      ],
      TODAY,
    );
    expect(groups.TODO.map((c) => c.id)).toEqual([1]);
    expect(groups.IN_PROGRESS.map((c) => c.id)).toEqual([2]);
    expect(groups.DONE.map((c) => c.id)).toEqual([3]);
  });
});

describe("compensateOverlayForScale — 배율 좌표 보정", () => {
  const rect = { top: 200, left: 400 };

  it("배율 1이면 원본 그대로다 — 배율 없는 화면은 영향이 없어야 한다", () => {
    const transform = { x: 120, y: 80, scaleX: 1, scaleY: 1 };
    expect(compensateOverlayForScale(transform, rect, 1)).toBe(transform);
  });

  it("80%에서 그려지는 자리 s×(rect+t)가 화면 기대치 rect+Δ와 일치한다", () => {
    const scale = 0.8;
    const delta = { x: 500, y: 300, scaleX: 1, scaleY: 1 };
    const t = compensateOverlayForScale(delta, rect, scale);
    // 검산: 브라우저가 실제로 그리는 자리(레이아웃 × s)가 커서 기대 자리와 같은가
    expect(scale * (rect.left + t.x)).toBeCloseTo(rect.left + delta.x);
    expect(scale * (rect.top + t.y)).toBeCloseTo(rect.top + delta.y);
  });

  it("이동량 0이어도 초기 위치 몫은 보정된다 — 집자마자 카드가 어긋나던 원인", () => {
    const t = compensateOverlayForScale({ x: 0, y: 0, scaleX: 1, scaleY: 1 }, rect, 0.75);
    expect(0.75 * (rect.left + t.x)).toBeCloseTo(rect.left);
    expect(0.75 * (rect.top + t.y)).toBeCloseTo(rect.top);
  });

  it("rect가 없으면(측정 전) 원본 그대로다 — 없는 값으로 지어내 보정하지 않는다", () => {
    const transform = { x: 10, y: 10, scaleX: 1, scaleY: 1 };
    expect(compensateOverlayForScale(transform, null, 0.8)).toBe(transform);
  });
});
