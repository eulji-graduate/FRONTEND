/**
 * 로딩 표시 — Z 로고의 세 조각이 날아와 맞춰졌다가 다시 흩어지길 반복한다.
 *
 * ⚠️ 스피너 대신 이걸 쓴다. 로고 자체가 세 조각이라 조립이 곧 브랜드가 된다.
 * ⚠️ `prefers-reduced-motion`이면 조각이 움직이지 않고 완성된 로고로 보인다(globals 처리).
 */
export function ZAssembleLoader({ label = "불러오는 중입니다" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-4">
      <svg
        viewBox="0 0 100 100"
        fill="currentColor"
        className="text-foreground size-14"
        aria-hidden
      >
        <path className="animate-z-piece-top" d="M0 0 L63 0 L45.5 25 L0 25 Z" />
        <path className="animate-z-piece-slash" d="M70 0 L100 0 L30 100 L0 100 Z" />
        <path className="animate-z-piece-bottom" d="M54.5 75 L100 75 L100 100 L37 100 Z" />
      </svg>
      <p className="text-muted-foreground text-[13px] leading-5">{label}</p>
    </div>
  );
}
