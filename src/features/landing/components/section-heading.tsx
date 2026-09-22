/**
 * 섹션 제목 — 랜딩 전체가 같은 크기·간격을 쓴다.
 *
 * ⚠️ 섹션마다 제목 크기를 다르게 잡지 않는다. 스크롤로 훑을 때 제목 줄이 들쭉날쭉하면
 *    같은 페이지가 아니라 여러 페이지를 이어 붙인 것처럼 보인다.
 */
interface SectionHeadingProps {
  /** 제목 위 작은 영문 꼬리표 — 없는 섹션도 있다 */
  label?: string;
  title: string;
}

export function SectionHeading({ label, title }: SectionHeadingProps) {
  return (
    <div className="reveal-on-scroll flex flex-col items-center gap-2.5 text-center">
      {label && (
        <p className="text-landing-accent text-[11px] leading-4 font-semibold tracking-[1.1px] uppercase">
          {label}
        </p>
      )}
      <h2 className="text-[32px] leading-[40px] font-semibold tracking-[-0.7px] break-keep lg:text-[36px] lg:leading-[44px]">
        {title}
      </h2>
    </div>
  );
}
