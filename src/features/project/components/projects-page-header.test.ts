import { backHrefOf } from "./projects-page-header";

/**
 * 뒤로가기 목적지 — **한 칸 위**다.
 *
 * ⚠️ 전에는 어디서든 목록으로 보냈다. 팀 액션 상세에서 뒤로를 누르면 방금 보던 프로젝트가
 *    아니라 목록으로 튀어, 그 프로젝트를 다시 찾아 들어가야 했다.
 */
describe("backHrefOf", () => {
  it("프로젝트 상세에서는 목록으로 간다", () => {
    expect(backHrefOf("/app/projects/3")).toBe("/app/projects");
  });

  it("생성 화면에서도 목록으로 간다", () => {
    expect(backHrefOf("/app/projects/new")).toBe("/app/projects");
  });

  /* ⚠️ 깊이가 둘이면 되돌아가는 것도 두 번이어야 한다 */
  it("팀 액션 상세에서는 그 프로젝트로 간다 — 목록이 아니다", () => {
    expect(backHrefOf("/app/projects/3/team/7")).toBe("/app/projects/3");
  });

  it("모르는 모양이면 목록으로 떨어뜨린다", () => {
    expect(backHrefOf("/app/projects")).toBe("/app/projects");
  });
});
