import { tokenizeForStreaming } from "./tokenize-for-streaming";

/**
 * 스트리밍 조각 나눔.
 *
 * ⚠️ **강조·링크·코드는 통째로 한 조각**이라야 별표·백틱이 열린 채로 깜빡이지 않는다.
 *    회귀 방지용으로 삼중 백틱 코드 블록도 한 덩어리로 유지되는지 함께 검사한다.
 */
describe("tokenizeForStreaming", () => {
  it("굵은 강조는 한 조각으로 나온다", () => {
    const chunks = tokenizeForStreaming("가 **중요** 나");
    expect(chunks).toContain("**중요**");
  });

  it("링크는 한 조각으로 나온다", () => {
    const chunks = tokenizeForStreaming("가 [요금제](/plans) 나");
    expect(chunks).toContain("[요금제](/plans)");
  });

  /*
    ⚠️ 삼중 백틱 코드 블록이 인라인 `…`로 오인돼 여러 조각으로 쪼개지면
       스트리밍 도중 여는 백틱만 보인 채 한 틱 깜빡인다 — 코드 블록은
       원자 청크로 보장돼야 한다 (PR #462 리뷰).
  */
  it("삼중 백틱 코드 블록은 한 조각으로 나온다", () => {
    const source = "설명\n\n```ts\nconst x = 1;\nconst y = 2;\n```\n\n끝";
    const chunks = tokenizeForStreaming(source);
    expect(chunks).toContain("```ts\nconst x = 1;\nconst y = 2;\n```");
  });

  it("삼중 백틱 블록이 인라인 코드 뒤에 와도 통째로 유지된다", () => {
    const source = "인라인 `foo` 다음 ```js\na\n``` 끝";
    const chunks = tokenizeForStreaming(source);
    expect(chunks).toContain("`foo`");
    expect(chunks).toContain("```js\na\n```");
  });

  /*
    ⚠️ 평문은 **한 글자씩** 나와야 한다(2026-08-19). 낱말째로 흘리면 한글 낱말이 2~4자라
       글이 덩어리로 튀어 "띠디딕"거린다 — 낱말 단위로 되돌아가는 회귀를 잠근다.
  */
  it("평문은 한 글자씩 쪼갠다", () => {
    expect(tokenizeForStreaming("가나 다")).toEqual(["가", "나", " ", "다"]);
  });

  /*
    ⚠️ 문단 나눔은 쪼개면 안 된다 — `\n` 하나만 먼저 도착하면 한 문단이던 글이 다음
       프레임에 두 문단으로 갈리며 아래 글이 통째로 밀려 내려간다(가장 크게 튀는 자리).
  */
  it("문단 나눔은 한 조각으로 유지된다", () => {
    expect(tokenizeForStreaming("가\n\n나")).toEqual(["가", "\n\n", "나"]);
  });

  /* ⚠️ 이모지는 서로게이트 쌍이라 반으로 자르면 깨진 글자가 한 프레임 보인다 */
  it("이모지를 반으로 자르지 않는다", () => {
    expect(tokenizeForStreaming("가🎉나")).toEqual(["가", "🎉", "나"]);
  });
});
