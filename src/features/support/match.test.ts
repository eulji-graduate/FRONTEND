import { FAQ_ENTRIES } from "./faq-entries";
import { findFaqCandidates } from "./match";

/**
 * 도움말 검색.
 *
 * ⚠️ 사람이 실제로 칠 법한 말로 검사한다 — 대표 질문을 그대로 붙여 넣는 사람은 없다.
 * ⚠️ **하나만 걸리는지 여럿이 걸리는지**가 화면 동작을 가른다. 하나면 바로 답하고,
 *    여럿이면 되묻는다 — 그래서 개수까지 확인한다.
 */
describe("findFaqCandidates", () => {
  it.each([
    ["기업 코드 어디서 받아요?", "company-code"],
    ["기업코드가 뭔데", "company-code"],
    ["비밀번호 까먹었어요", "password"],
    ["사파리에서 써도 되나요", "browser"],
    ["다크모드 있나요", "dark-mode"],
    ["약관 보고 싶어요", "legal"],
    ["회의 녹음되나요", "capture"],
  ])("'%s' → 첫 후보가 %s", (input, expected) => {
    expect(findFaqCandidates(input)[0]?.id).toBe(expected);
  });

  /*
    ⚠️ **새 용어로도 찾아져야 한다.** 화면이 `팀`이라 가르쳐 놓고 `팀`으로 물으면 못 찾으면
       안 된다 — 점수가 키워드 **길이의 합**이고 문턱이 2라, 한 글자 `팀`은 혼자서 절대
       문턱을 못 넘는다(`match.ts`). 두 글자 이상으로 넣어야 걸린다(적대적 검토 #163).
    ⚠️ **옛말도 남긴다.** 용어가 바뀐 걸 모르는 사람이 `부서`로 묻는다 — 빼면 그 사람이 못 찾는다.
  */
  it.each([
    ["팀 체계는 어떻게 만드나요", "org-structure"],
    ["팀과 직급이 궁금해요", "org-structure"],
    ["부서와 직급은 어떻게 구성되나요", "org-structure"],
  ])("'%s' → 조직 구성 항목을 찾는다", (input, expected) => {
    expect(findFaqCandidates(input).map((row) => row.id)).toContain(expected);
  });

  /*
    ⚠️ **`역할`은 이제 애매한 말이라 되물어야 한다.** 용어가 갈리면서 두 가지를 가리키게 됐다 —
       권한(Owner·Leader·Member)이거나, 팀 안에서 맡는 일(프론트엔드·백엔드)이다.
       한쪽으로 몰아 답하면 절반은 틀린 답을 받는다. 후보가 여럿이면 화면이 되묻는다
       (`support-widget`) — 그러라고 둘 다 남긴 것이지 키워드가 겹쳐서 방치한 게 아니다.
    ⚠️ 검색어에서 `역할`을 빼면 이 되묻기가 사라지고 늘 권한 쪽으로 답한다. 빼지 않는다.
  */
  it.each(["역할", "역할이 뭐예요", "팀장 직급"])(
    "'%s'는 후보를 좁히지 않고 되묻게 둔다 — 뜻이 둘이다",
    (input) => {
      const ids = findFaqCandidates(input).map((row) => row.id);

      expect(ids).toContain("roles");
      expect(ids).toContain("org-structure");
    },
  );

  it("모르는 질문은 후보가 없다 — 억지로 답하지 않는다", () => {
    expect(findFaqCandidates("오늘 점심 뭐 먹지")).toHaveLength(0);
    expect(findFaqCandidates("주차장 있나요")).toHaveLength(0);
  });

  /*
    ⚠️ 팀이 안 정한 것도 **항목으로 받는다.** 그냥 못 찾은 척 넘기면 사람이 같은 걸 또 묻는다 —
       "아직 정해지지 않았다"고 말해 주는 게 답이다(§정직성).
  */
  it.each([
    ["환불 규정 알려줘", "refund"],
    ["카드 결제 되나요", "payment"],
  ])("'%s' → %s (정해지지 않았다고 답한다)", (input, expected) => {
    expect(findFaqCandidates(input)[0]?.id).toBe(expected);
  });

  /*
    ⚠️ **오탐 회귀 방지.** 범용어("무엇"·"코드"·"어디")를 키워드에 넣으면 아래가 전부
       엉뚱한 항목으로 걸린다 — 못 찾는 것보다 틀린 답이 나쁘다.
  */
  it.each(["할인 코드 있나요?", "쿠폰 코드 어디에 넣어요?", "화장실이 어디에 있나요"])(
    "'%s'는 아무 것도 안 걸린다",
    (input) => {
      expect(findFaqCandidates(input)).toHaveLength(0);
    },
  );

  it("빈 입력은 후보가 없다", () => {
    expect(findFaqCandidates("")).toHaveLength(0);
    expect(findFaqCandidates("   ")).toHaveLength(0);
  });

  // 여러 갈래에 걸치는 말이면 **되물어야** 한다 — 바로 답하면 잘못 짚는다
  it("여러 개가 걸리면 여러 개를 돌려준다", () => {
    expect(findFaqCandidates("무료로 쓰면 요금이 안 드나요?").length).toBeGreaterThan(1);
  });

  it("후보는 네 개를 넘지 않는다 — 고르는 게 일이 되면 안 된다", () => {
    expect(findFaqCandidates("어떻게 시작 가격 권한 브라우저").length).toBeLessThanOrEqual(4);
  });

  it("긴 키워드가 이긴다", () => {
    expect(findFaqCandidates("기업코드")[0]?.id).toBe("company-code");
  });

  /*
    ⚠️ **`~는 뭔가`와 `~는 어떻게 만드나`는 다른 질문이다.** 구조 설명(`org-structure`)은
       만드는 방법을 말하지 않는데, 만드는 법을 물어도 그 항목 하나만 걸리면 되묻지도 않고
       엉뚱한 답이 나간다 — 실제로 온보딩에서 `팀 체계`를 뺐다가 그렇게 됐다.
       둘 다 걸려서 **되묻는 것**이 맞다.
  */
  it.each(["팀 체계는 어떻게 만드나요", "부서 체계 어떻게 잡나요"])(
    "`%s`는 구조 설명과 온보딩 둘 다에 걸려 되묻는다",
    (question) => {
      const ids = findFaqCandidates(question).map((found) => found.id);

      expect(ids).toContain("onboarding");
      expect(ids).toContain("org-structure");
    },
  );

  /*
    ⚠️ **한 글자 키워드(`팀`)가 아무 문장이나 끌어오면 안 된다.** 회의·액션을 물었는데
       조직 구조 설명이 같이 뜨면 고르는 일만 늘어난다 — 문턱(`MIN_SCORE`)이 그걸 막는데,
       키워드를 늘릴 때 같이 무너지기 쉬워서 여기서 잡아 둔다.
  */
  it.each(["우리 팀 회의 일정 어디서 봐요", "팀 액션은 누가 배정하나요"])(
    "`%s`는 조직 구조 설명을 끌어오지 않는다",
    (question) => {
      expect(findFaqCandidates(question).map((found) => found.id)).not.toContain("org-structure");
    },
  );

  /*
    ⚠️ **동점은 버그가 아니라 되묻기다.** 토끼(CodeRabbit)가 `팀장 직급`·`역할`이 두 항목에
       동점이라며 키워드를 좁히라고 했는데, 이 위젯은 **하나로 좁히는 게 목표가 아니다** —
       여러 갈래에 걸치는 말이면 잘못 짚느니 되묻는 쪽이 낫다(§match).
    ⚠️ 좁혀 놓으면 `팀장 직급`이 권한 설명으로만 가는데, 조직 구조를 물은 사람은 엉뚱한
       답을 받고 되물을 기회도 잃는다. 대신 **되묻는다는 사실을 여기서 못 박는다** —
       키워드를 손댈 때 조용히 하나로 좁혀지는 걸 막는 게 이 테스트의 일이다.
  */
  it.each(["팀장 직급", "Leader 직급", "역할"])(
    "`%s`는 권한 설명과 구조 설명 둘 다에 걸려 되묻는다",
    (question) => {
      const ids = findFaqCandidates(question).map((found) => found.id);

      expect(ids).toContain("roles");
      expect(ids).toContain("org-structure");
    },
  );

  it("`권한`만 물으면 권한 항목 하나로 좁혀진다 — 걸치지 않는 말은 되묻지 않는다", () => {
    expect(findFaqCandidates("권한").map((found) => found.id)).toEqual(["roles"]);
  });

  /*
    ⚠️ **새 용어로도 걸려야 한다.** 부서→팀으로 용어를 바꾸면서 `부서 만들기`는 걸리는데
       `팀 만들기`는 후보가 **0개**였다 — `팀`은 한 글자라 문턱을 혼자 못 넘고 `팀 체계`는
       `체계`가 있어야 걸린다. 화면 문구를 팀으로 바꿔 놓고 챗봇이 그 말을 못 알아들으면
       바꾸다 만 것이다(적대적 검토 #163).
  */
  it.each(["팀 만들기", "팀 추가", "팀 생성", "팀 이름 변경"])(
    "`%s`는 온보딩 항목에 닿는다 — 새 용어로 물어도 빈손이 아니다",
    (question) => {
      expect(findFaqCandidates(question).map((found) => found.id)).toContain("onboarding");
    },
  );

  it("모든 항목은 대표 질문으로 자기 자신을 찾을 수 있다", () => {
    for (const entry of FAQ_ENTRIES) {
      expect(findFaqCandidates(entry.question).map((found) => found.id)).toContain(entry.id);
    }
  });

  /*
    ⚠️ **되돌릴 수 없는 일에 대한 질문은 반드시 그 항목에 닿아야 한다.** 답에만 적어 두고
       키워드를 안 넣었더니 `임시저장 있나요`가 데이터 항목으로, `인수인계 취소`가 환불로
       갔다 — 초안으로 저장된다고 잘못 알고 [생성]을 누르면 그 자리에서 결재가 올라간다.
  */
  it.each([
    "임시저장 있나요",
    "인수인계 초안으로 저장되나요",
    "인수인계 취소할 수 있나요",
    "인수인계 되돌릴 수 있나요",
  ])("`%s`는 인수인계 절차 항목에 닿는다", (question) => {
    expect(findFaqCandidates(question).map((found) => found.id)).toContain("handover-flow");
  });

  /*
    ⚠️ **"무료"는 화면 전체 답변에서 금지다**(CLAUDE.md §요금제 — "화면에 '무료'·'결제 없이'라고
       쓰지 않는다"). 부정형("무료 요금제는 없습니다")이어도 "무료"라는 글자가 남으면 훑어보는
       사람은 맥락 없이 그 단어만 본다(§정직성) — id="free" 하나만 검사하면 다른 항목(trial 등)에서
       같은 위반이 새로 생겨도 안 잡힌다. **모든 답변**을 훑는다(2026-08-13 적대적 검증에서
       "free"·"trial" 두 항목이 이 검사 없이 빠져나간 걸 잡았다).
  */
  it("어느 답변에도 화면에 '무료'라는 글자가 남지 않는다", () => {
    const violations = FAQ_ENTRIES.filter((entry) => entry.answer.includes("무료"));

    expect(violations.map((entry) => entry.id)).toEqual([]);
  });

  /*
    ⚠️ **BE 코드값을 답변에 그대로 쓰지 않는다**(CLAUDE.md §도메인 상수 — "코드엔 영문 상수,
       화면엔 한글 라벨"). "무료"를 피하려다 `ACTIVE`·`UNPAID`로 바꿔 쓴 답변이 한 번 들어왔다
       (2026-08-13) — 위젯은 로그인 전에도 열려서 내부 어휘가 그대로 밖으로 나간다.
       상태를 말해야 하면 `SUBSCRIPTION_STATUS_LABEL`의 한글(이용 중·해지 예정·결제 전·만료)을 쓴다.
  */
  it("어느 답변에도 구독 상태 코드값이 그대로 나오지 않는다", () => {
    const codes = ["ACTIVE", "CANCELING", "UNPAID", "EXPIRED"];
    const violations = FAQ_ENTRIES.filter((entry) =>
      codes.some((code) => entry.answer.includes(code)),
    );

    expect(violations.map((entry) => entry.id)).toEqual([]);
  });
});
