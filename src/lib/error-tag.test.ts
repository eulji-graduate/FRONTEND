import { splitErrorTag } from "./error-tag";

describe("splitErrorTag", () => {
  /*
    ⚠️ 붙이는 건 `toUserMessage` 한 곳이고, 가르는 건 **그리는 자리**다 — 화면마다 배선하지 않고도
       꼬리표를 흐린 줄로 내려보낼 수 있다.
  */
  it("우리가 붙인 꼬리표를 도로 떼어 낸다", () => {
    expect(splitErrorTag("서버 내부 오류가 발생했습니다. (Z-003 · 271d9bab)")).toEqual({
      text: "서버 내부 오류가 발생했습니다.",
      tag: "Z-003 · 271d9bab",
    });
  });

  it("추적 번호 없이 코드만 온 경우도 뗀다", () => {
    expect(splitErrorTag("서버 내부 오류가 발생했습니다. (Z-003)").tag).toBe("Z-003");
  });

  /* ⚠️ BE 문장이 괄호로 끝나도 건드리지 않는다 — 우리가 만든 모양이 아니다 */
  it("남의 괄호는 손대지 않는다", () => {
    expect(splitErrorTag("이미 있는 부서 이름입니다 (개발팀)")).toEqual({
      text: "이미 있는 부서 이름입니다 (개발팀)",
      tag: null,
    });
  });

  it("꼬리표가 없으면 문장을 그대로 준다", () => {
    expect(splitErrorTag("기업 코드를 입력해 주세요")).toEqual({
      text: "기업 코드를 입력해 주세요",
      tag: null,
    });
  });
});
