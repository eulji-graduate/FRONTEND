/**
 * 지연 판정 회귀 — 팀 확정 규칙(진행중 && 마감 경과, WORKFLOW.md §7)에 못박는다.
 *
 * ⚠️ 이 규칙이 세 곳(FE `isDelayed`·보드 `isCardDelayed`·BE `ActionSummaryResponse`)에서
 *    같아야 한다. 조건을 `status !== DONE`으로 넓히면 여기서 먼저 실패한다.
 */
import { ACTION_STATUS, isDelayed, isPastDue } from "./action";

/* 오늘: 2026-08-16 오전 9시(KST 오전 9시 → 자정 경계 회귀에 필요) */
const TODAY = new Date("2026-08-16T09:00:00");

describe("isPastDue — 로컬 자정 기준", () => {
  it("어제 마감은 지났다", () => {
    expect(isPastDue("2026-08-15", TODAY)).toBe(true);
  });

  it("오늘 마감은 아직 지나지 않았다 — KST 오전 9시에도 false", () => {
    /*
      ⚠️ 이 케이스가 자정 경계 회귀의 핵심이다. `new Date("2026-08-16")`(UTC 자정)로 파싱하면
         KST +9 환경에서 오전 9시 이후 true가 되어 '오늘 마감'이 지연으로 뜬다.
    */
    expect(isPastDue("2026-08-16", TODAY)).toBe(false);
  });

  it("내일 마감은 지나지 않았다", () => {
    expect(isPastDue("2026-08-17", TODAY)).toBe(false);
  });
});

describe("isDelayed — 진행중 한정(팀 확정 · BE와 같은 규칙)", () => {
  it("진행중 + 어제 마감이면 지연이다", () => {
    expect(isDelayed({ status: ACTION_STATUS.IN_PROGRESS, dueDate: "2026-08-15" }, TODAY)).toBe(
      true,
    );
  });

  it("진행중 + 오늘 마감은 지연이 아니다(KST 자정 경계 회귀)", () => {
    expect(isDelayed({ status: ACTION_STATUS.IN_PROGRESS, dueDate: "2026-08-16" }, TODAY)).toBe(
      false,
    );
  });

  it("할일 + 어제 마감은 지연이 아니다 — 확정 규칙 변경의 핵심", () => {
    /*
      ⚠️ 예전 규칙(`status !== DONE`)에서는 true였다. 여기가 릴리즈 노트 대상 화면들(내 액션
         목록·팀 액션 목록·마이페이지 대시보드·팀 액션 상세 타임라인·인수인계 액션 목록·
         팀장 인수인계 액션 목록·사원 상세 담당 액션 카드)에서 배지가 사라지는 이유다.
    */
    expect(isDelayed({ status: ACTION_STATUS.TODO, dueDate: "2026-08-15" }, TODAY)).toBe(false);
  });

  it("완료 + 어제 마감은 지연이 아니다", () => {
    expect(isDelayed({ status: ACTION_STATUS.DONE, dueDate: "2026-08-15" }, TODAY)).toBe(false);
  });

  it("today 기본값은 현재 시각이다 — 인자 안 주면 new Date() 사용", () => {
    /* 미래 마감은 어느 시점에서 봐도 지연이 아니다 — 기본값 사용을 확인하는 안전한 회귀. */
    expect(isDelayed({ status: ACTION_STATUS.IN_PROGRESS, dueDate: "2099-12-31" })).toBe(false);
  });
});
