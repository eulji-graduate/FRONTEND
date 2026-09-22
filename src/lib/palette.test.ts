/**
 * 팔레트 역매핑 회귀 — BE가 저장한 HEX와 화면의 팔레트 이름을 이어 붙이는 유일한 지점.
 *
 * ⚠️ 여기 세 케이스가 있다:
 *   ① 알려진 HEX(대소문자 무시)를 팔레트 이름으로 되돌린다.
 *   ② 모르는 HEX·빈 문자열은 `slate`로 떨어뜨린다(임의로 지어내지 않는다 · §정직성).
 *   ③ `hexFromTagName` ↔ `tagNameFromHex` 왕복이 손실 없다(생성 폼이 저장한 값이 되돌아온다).
 */
import { hexFromTagName, TAG_NAMES, tagNameFromHex } from "./palette";

describe("tagNameFromHex — BE 저장 HEX → 팔레트 이름", () => {
  it.each([
    ["#0D9488", "teal"],
    ["#9333EA", "purple"],
    ["#DB2777", "pink"],
  ] as const)("알려진 대문자 HEX %s → %s", (hex, expected) => {
    expect(tagNameFromHex(hex)).toBe(expected);
  });

  it("소문자 HEX도 같은 이름으로 되돌린다 — BE 검증도 대소문자 무시다", () => {
    expect(tagNameFromHex("#0d9488")).toBe("teal");
    expect(tagNameFromHex("#db2777")).toBe("pink");
  });

  it("팔레트 밖 HEX는 slate로 떨어뜨린다 — 임의로 지어내지 않는다", () => {
    /*
      ⚠️ 구 데이터·수기 입력으로 팔레트 밖 HEX가 올 수 있다. 이때 화면은 회색 칩이 되지만
         런타임 예외는 안 난다 — 서버 컴포넌트 렌더가 죽는 것보다 낫다.
    */
    expect(tagNameFromHex("#123456")).toBe("slate");
  });

  it('빈 문자열은 slate로 떨어뜨린다 — 매퍼가 `?? ""`로 접기 때문', () => {
    expect(tagNameFromHex("")).toBe("slate");
  });
});

describe("hexFromTagName ↔ tagNameFromHex 왕복", () => {
  /*
    ⚠️ 생성 폼(`hexFromTagName`)이 저장한 값이 조회(`tagNameFromHex`)에서 그대로 되돌아와야
       사용자가 고른 색이 화면에 유지된다 — 이 왕복이 깨지면 저장은 되는데 목록만 무색이 된다.
  */
  it.each(TAG_NAMES)("팔레트 이름 %s은 왕복해도 같은 이름이다", (name) => {
    expect(tagNameFromHex(hexFromTagName(name))).toBe(name);
  });
});
