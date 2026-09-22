import { splitByMatch } from "./match-text";

/** 검색 결과가 **왜 떴는지**를 화면이 말하게 하는 조각이라, 여기가 틀리면 글자가 사라진다 */
describe("splitByMatch", () => {
  /** 갈라 놓은 토막을 도로 이으면 원문이어야 한다 — 글자를 잃으면 안 된다 */
  const joined = (text: string, keyword: string) =>
    splitByMatch(text, keyword)
      .map((part) => part.text)
      .join("");

  it("검색어가 없으면 통째로 한 토막이다", () => {
    expect(splitByMatch("디자인팀", "  ")).toEqual([{ text: "디자인팀", isMatch: false }]);
  });

  /*
    ⚠️ 이 화면에서 실제로 헷갈렸던 경우다 — `자`로 찾으면 이름에 `자`가 없는 사람이 뜨는데,
       `디자인팀`의 `자`가 걸린 것이다. 걸린 자리를 갈라내야 화면이 그 이유를 말할 수 있다.
  */
  it("가운데가 걸리면 앞뒤와 갈라낸다", () => {
    expect(splitByMatch("디자인팀", "자")).toEqual([
      { text: "디", isMatch: false },
      { text: "자", isMatch: true },
      { text: "인팀", isMatch: false },
    ]);
  });

  it("맨 앞이 걸리면 앞 토막을 안 만든다", () => {
    expect(splitByMatch("개발팀", "개발")).toEqual([
      { text: "개발", isMatch: true },
      { text: "팀", isMatch: false },
    ]);
  });

  it("여러 번 걸리면 전부 갈라낸다", () => {
    expect(splitByMatch("팀장팀", "팀")).toEqual([
      { text: "팀", isMatch: true },
      { text: "장", isMatch: false },
      { text: "팀", isMatch: true },
    ]);
  });

  it("안 걸리면 통째로 한 토막이다", () => {
    expect(splitByMatch("김서준", "없는말")).toEqual([{ text: "김서준", isMatch: false }]);
  });

  /*
    ⚠️ 찾을 때만 소문자로 맞추고 **보여주는 건 원문 그대로**다 — 대소문자가 바뀌어 나오면
       화면이 저장된 값과 다른 말을 한다.
  */
  it("대소문자를 가리지 않되 원문 그대로 돌려준다", () => {
    expect(splitByMatch("Backend", "backend")).toEqual([{ text: "Backend", isMatch: true }]);
  });

  /*
    ⚠️ 검색어는 사람이 아무 글자나 치는 값이다. 정규식으로 짰으면 여기서 터지거나
       엉뚱한 자리가 걸렸다.
  */
  it("정규식 기호가 들어와도 글자 그대로 찾는다", () => {
    expect(splitByMatch("a(b)c", "(b)")).toEqual([
      { text: "a", isMatch: false },
      { text: "(b)", isMatch: true },
      { text: "c", isMatch: false },
    ]);
    expect(splitByMatch("김서준", ".")).toEqual([{ text: "김서준", isMatch: false }]);
  });

  it("갈라 놓은 토막을 이으면 원문이 그대로 나온다", () => {
    expect(joined("디자인팀", "자")).toBe("디자인팀");
    expect(joined("사원 · 비주얼", "주")).toBe("사원 · 비주얼");
    expect(joined("", "자")).toBe("");
  });
});
