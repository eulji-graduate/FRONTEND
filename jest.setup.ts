import "@testing-library/jest-dom";

/*
  jsdom에 없는 브라우저 기능을 채운다.

  ⚠️ **제품 코드를 테스트에 맞춰 고치지 않는다.** 없는 건 여기서 메운다 —
     화면이 실제 브라우저에서 하는 일을 테스트 때문에 빼면 그건 다른 화면이다.
  ⚠️ `scrollTo`는 jsdom이 구현하지 않는다(목록에 항목이 붙을 때 아래로 따라가는 데 쓴다).
*/
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

/*
  ⚠️ jsdom엔 Pointer Events가 없다 — `@base-ui/react`의 Checkbox 등 여러 컴포넌트가 클릭 시
     `new window.PointerEvent(...)`를 직접 만든다. 없으면 "PointerEvent is not a constructor"로
     터진다. MouseEvent를 뼈대로 최소 필드만 얹는다(user-event가 실제로 채우는 값 정도).
*/
if (typeof window !== "undefined" && !window.PointerEvent) {
  class PointerEventPolyfill extends MouseEvent {
    public pointerId?: number;
    public pointerType?: string;
    public isPrimary?: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId;
      this.pointerType = params.pointerType;
      this.isPrimary = params.isPrimary;
    }
  }

  // @ts-expect-error — jsdom 환경에 맞춘 최소 폴리필이라 lib.dom.d.ts와 완전히 같지 않다.
  window.PointerEvent = PointerEventPolyfill;
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}

/*
  ⚠️ jsdom엔 ResizeObserver가 없다 — 목록 넘침을 감지하는 화면(`calendar-day-detail-panel.tsx`)이
     실제로 이걸 쓴다. 크기 변화를 흉내 낼 필요는 없고, 생성·해제가 안 터지기만 하면 된다.
*/
if (typeof window !== "undefined" && !window.ResizeObserver) {
  class ResizeObserverPolyfill {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  window.ResizeObserver = ResizeObserverPolyfill;
}
