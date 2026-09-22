import { render, screen } from "@testing-library/react";

import { CancelSubscription } from "./cancel-subscription";

/**
 * 구독 해지 카드 — **돈과 계약이 걸린 문장**이라 날짜가 틀리면 안 된다.
 *
 * ⚠️ 여기서 보는 건 날짜 **표기**가 아니라 날짜를 못 읽을 때의 **물러섬**이다.
 *    날짜 함수는 못 읽으면 원문을 그대로 돌려주는데(지어내지 않으려고), 그 원문이
 *    `2026-02-30` 같은 ISO라 문장 한가운데 들어가면 개발자용 표기가 계약 문장에 뜬다.
 */

function renderCard(periodEnd: string, isCanceling = false) {
  return render(
    <CancelSubscription
      periodEnd={periodEnd}
      isCanceling={isCanceling}
      canManage
      onConfirm={jest.fn()}
    />,
  );
}

describe("CancelSubscription", () => {
  it("언제까지 쓸 수 있는지 연도까지 말한다 — 해를 넘기는 값이라 연도가 빠지면 안 된다", () => {
    renderCard("2026-09-01");

    expect(screen.getByText(/2026년 9월 1일\(화\)까지/)).toBeInTheDocument();
  });

  it("해지 예약 상태에서도 같은 날짜를 말한다", () => {
    renderCard("2026-09-01", true);

    expect(screen.getByText(/2026년 9월 1일\(화\)까지/)).toBeInTheDocument();
  });

  /*
    ⚠️ `2026-02-30`은 형식은 맞지만 **없는 날짜**다. 그대로 두면
       `2026-02-30까지 이용할 수 있습니다`가 된다 — 날짜 절만 빼고 문장은 살린다.
  */
  it.each(["2026-02-30", "", "내일"])(
    "읽을 수 없는 날짜(%s)는 화면에 안 내보내고 날짜 절을 뺀다",
    (periodEnd) => {
      renderCard(periodEnd);

      // 날짜 자리에 원문이 아니라 **말로 된 자리표시**가 들어간다
      expect(screen.getByText(/이번 결제 주기까지/)).toBeInTheDocument();
      if (periodEnd) expect(screen.queryByText(periodEnd)).not.toBeInTheDocument();
    },
  );

  it("해지 예약 상태에서도 날짜 절만 빠지고 문장은 남는다", () => {
    renderCard("2026-02-30", true);

    expect(screen.getByText(/이번 결제 주기까지/)).toBeInTheDocument();
    expect(screen.queryByText("2026-02-30")).not.toBeInTheDocument();
  });
});
