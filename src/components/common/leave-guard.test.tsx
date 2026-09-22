import { render } from "@testing-library/react";

import { LeaveGuard } from "./leave-guard";

/**
 * 이탈 경고.
 *
 * ⚠️ 실제로 창을 띄우는 건 브라우저라 여기서 볼 수 있는 건 **리스너를 걸었는지**와
 *    **이벤트를 막았는지**뿐이다. 그 둘이 이 컴포넌트가 하는 일의 전부이기도 하다.
 */
function fireBeforeUnload() {
  const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
  window.dispatchEvent(event);
  return event;
}

describe("LeaveGuard", () => {
  it("적어 둔 게 있으면 떠나려는 걸 막는다", () => {
    render(<LeaveGuard hasUnsaved />);

    const event = fireBeforeUnload();

    /*
      ⚠️ `returnValue` 값 자체는 검사하지 않는다. jsdom의 `Event.returnValue`는 불리언이라
         빈 문자열을 넣으면 `false`가 되는데, 그건 **jsdom의 사정**이지 우리 동작이 아니다.
         브라우저가 실제로 보는 건 `defaultPrevented`다.
    */
    expect(event.defaultPrevented).toBe(true);
  });

  // 아무것도 안 한 사람까지 붙잡으면 그냥 성가신 창이다
  it("적어 둔 게 없으면 붙잡지 않는다", () => {
    render(<LeaveGuard hasUnsaved={false} />);

    expect(fireBeforeUnload().defaultPrevented).toBe(false);
  });

  it("적어 둔 게 사라지면 다시 통과시킨다", () => {
    const { rerender } = render(<LeaveGuard hasUnsaved />);
    rerender(<LeaveGuard hasUnsaved={false} />);

    expect(fireBeforeUnload().defaultPrevented).toBe(false);
  });

  // 화면을 떠난 뒤에도 리스너가 남으면 엉뚱한 곳에서 경고가 뜬다
  it("언마운트하면 리스너를 뗀다", () => {
    const { unmount } = render(<LeaveGuard hasUnsaved />);
    unmount();

    expect(fireBeforeUnload().defaultPrevented).toBe(false);
  });
});
