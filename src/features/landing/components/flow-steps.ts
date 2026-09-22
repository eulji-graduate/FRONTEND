import { FileText, type LucideIcon, Mic, Send, Sparkles } from "lucide-react";

/**
 * 흐름 네 단계 — 회의 한 번이 어떻게 굴러가는지.
 *
 * ⚠️ 아이콘은 lucide만 쓴다(§디자인 토큰: 이모지 금지).
 * ⚠️ 문구는 명세에 있는 것만 적는다 — 자막은 화자 없는 청크, AI 산출물은 액션 할당이다.
 */
export interface FlowStep {
  step: string;
  title: string;
  body: string;
  mock: "capture" | "analyze" | "assign" | "handover";
  icon: LucideIcon;
}

export const FLOW_STEPS: readonly FlowStep[] = [
  {
    step: "01",
    title: "회의 캡처",
    body: "녹음하면 자막이 실시간으로 쌓입니다",
    mock: "capture",
    icon: Mic,
  },
  {
    step: "02",
    title: "AI 분석",
    body: "결정과 할 일을 가려냅니다",
    mock: "analyze",
    icon: Sparkles,
  },
  {
    step: "03",
    title: "액션 하달",
    body: "담당자에게 바로 배정됩니다",
    mock: "assign",
    icon: Send,
  },
  {
    step: "04",
    title: "인수인계",
    body: "쌓인 기록이 문서가 됩니다",
    mock: "handover",
    icon: FileText,
  },
] as const;

export type FlowMock = FlowStep["mock"];

/**
 * 스크롤 진행도(0~1)를 **몇 번째 단계**로 바꾼다.
 *
 * ⚠️ `floor`만 쓰면 진행도가 정확히 1일 때 칸을 하나 넘어간다(네 칸인데 4번). 끝을 감싼다.
 * ⚠️ 진행도는 음수로도 온다 — 구간 위쪽에서 스크롤을 되올릴 때다. 그때는 첫 칸이다.
 */
export function stepIndexFromProgress(progress: number, count: number): number {
  if (count <= 0) return 0;
  const index = Math.floor(progress * count);
  return Math.min(count - 1, Math.max(0, index));
}
