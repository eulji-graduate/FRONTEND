import type { ReactNode } from "react";

interface StepNoteListProps {
  /** 안내 한 줄씩. 서로 이어지지 않는 **독립된 사실**만 넣는다 */
  children: ReactNode;
}

/**
 * 단계 안내 상자 — 1·2·3단계가 **같은 것을 쓴다.**
 *
 * ⚠️ 세 단계에 같은 클래스를 복붙해 두면 한 곳만 손봐도 단계마다 상자가 달라진다.
 *    실제로 3단계만 문단 간격과 표식이 달라진 적이 있다.
 * ⚠️ 서로 이어지지 않는 사실들이라 **목록**(`ul`)이다. 문단으로만 두면 글 벽이 된다.
 * ⚠️ `break-keep` — 한글은 기본값이면 **단어 중간에서 끊긴다**(`메일로 갑 / 니다`).
 *    폭이 320px뿐이라 줄바꿈이 잦아서, 이게 없으면 읽는 내내 눈이 걸린다.
 * ⚠️ 위쪽 `StepHintList`(✓)와 표식이 다른 건 의도다 — 그쪽은 **좋은 점**,
 *    이쪽은 **알아둘 것**이라 같은 표식을 쓰면 무엇이 이득인지 흐려진다.
 */
export function StepNoteList({ children }: StepNoteListProps) {
  return (
    <ul className="border-border bg-background/80 text-muted-foreground/70 flex flex-col gap-2 rounded-md border p-[10.5px] text-[11px] leading-[18px] break-keep">
      {children}
    </ul>
  );
}

/**
 * 안내 한 줄.
 *
 * ⚠️ 점은 **연하게**(`/35`) 둔다. 진한 점을 여러 개 찍으면 11px 본문보다 점이 먼저 읽힌다 —
 *    점이 할 일은 강조가 아니라 문단 머리를 짚는 것뿐이다.
 * ⚠️ 점을 첫 줄 가운데(줄높이 18px의 절반)에 맞춰 내린다. 위에 붙이면 글자와 어긋나 보인다.
 */
export function StepNote({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-1.5">
      <span
        className="bg-muted-foreground/35 mt-[7.5px] size-[3px] shrink-0 rounded-full"
        aria-hidden
      />
      <span className="min-w-0">{children}</span>
    </li>
  );
}
