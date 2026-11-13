import { isMissingRequired } from "./lib";

/* #37 — AI가 세부 내용을 비워 둔 액션도 그대로 확정할 수 있어야 한다(BE는 detail을 필수로 보지 않는다) */
describe("isMissingRequired", () => {
  it("세부 내용이 비어도 제목·마감일이 있으면 확정할 수 있다", () => {
    expect(isMissingRequired({ title: "API 문서화", dueDate: "2026-11-20" })).toBe(false);
  });

  it("제목이 비거나 공백뿐이면 막는다", () => {
    expect(isMissingRequired({ title: "   ", dueDate: "2026-11-20" })).toBe(true);
  });

  it("마감일이 비면 막는다", () => {
    expect(isMissingRequired({ title: "API 문서화", dueDate: "" })).toBe(true);
  });
});
