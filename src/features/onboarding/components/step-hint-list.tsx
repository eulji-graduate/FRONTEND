import { CheckMark } from "@/components/common/check-mark";

/**
 * 좌측 설명 목록. 온보딩 각 단계가 같은 형태로 쓴다.
 * 표시는 완료 화면과 같은 `CheckMark`다 — 화면끼리 모양이 이어진다.
 */
export function StepHintList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-[7px]">
      {items.map((item) => (
        <li
          key={item}
          className="text-muted-foreground flex gap-[7px] text-[12px] leading-[19px] break-keep"
        >
          <CheckMark size={14} className="mt-[3px]" />
          {item}
        </li>
      ))}
    </ul>
  );
}
