/**
 * 도움말의 뼈대 — 갈래·타입·문구.
 *
 * ⚠️ **AI가 아니다.** 키워드로 찾아 주는 검색이고, 화면에서도 그렇게 말한다
 *    (CLAUDE.md §AI 기능: AI 아닌 것을 AI라 부르지 않는다).
 * ⚠️ **묻고 끝이 아니라 좁혀 들어간다.** 갈래를 고르고 → 그 안의 질문을 고르면 → 답이 나온다.
 *    자유롭게 친 말도 여러 개가 걸리면 바로 답하지 않고 **되묻는다** — 잘못 짚는 것보다 낫다.
 * ⚠️ 상수는 `as const` + 라벨맵이다(`enum` 금지, §도메인 상수).
 */
import type { LucideIcon } from "lucide-react";
import { CreditCard, MonitorCog, Rocket, ShieldCheck, Sparkles } from "lucide-react";

export const FAQ_CATEGORY = {
  SERVICE: "SERVICE",
  PRICING: "PRICING",
  START: "START",
  ACCOUNT: "ACCOUNT",
  ENV: "ENV",
} as const;
export type FaqCategory = (typeof FAQ_CATEGORY)[keyof typeof FAQ_CATEGORY];

/** 처음에 보여줄 갈래 — 여기서 좁혀 들어간다 */
export const FAQ_CATEGORY_LABEL: Record<FaqCategory, string> = {
  SERVICE: "서비스가 궁금합니다",
  PRICING: "요금이 궁금합니다",
  START: "시작하는 방법",
  ACCOUNT: "계정과 권한",
  ENV: "이용 환경 · 정책",
};

/**
 * 갈래마다 그림 하나.
 * ⚠️ **이모지를 쓰지 않는다**(§디자인 토큰) — lucide만. 글자만 늘어놓으면 다섯 개가 다 같아 보인다.
 */
export const FAQ_CATEGORY_ICON: Record<FaqCategory, LucideIcon> = {
  SERVICE: Sparkles,
  PRICING: CreditCard,
  START: Rocket,
  ACCOUNT: ShieldCheck,
  ENV: MonitorCog,
};

export interface FaqLink {
  label: string;
  href: string;
}

export interface FaqEntry {
  id: string;
  category: FaqCategory;
  /** 목록에 보여줄 대표 질문 */
  question: string;
  /** 이 말들이 들어오면 이 항목이다 */
  keywords: readonly string[];
  /**
   * 답. **문단은 빈 줄로 나눈다** — 화면에서 그대로 문단이 된다.
   * ⚠️ 한 덩어리로 쓰면 말풍선 안에서 글이 벽처럼 보여 아무도 안 읽는다.
   */
  answer: string;
  links?: readonly FaqLink[];
}

/**
 * 첫 화면에서 갈래를 고르라고 물을 때.
 * ⚠️ 인사는 **위쪽 안내 블록**이 한다 — 여기서 또 인사하면 같은 말이 두 번이다.
 */
export const FAQ_GREETING = "어떤 게 궁금하신가요?";

/** 여러 개가 걸렸을 때 — 바로 답하지 않고 되묻는다 */
export const FAQ_NARROW = "이 중에 어떤 게 궁금하신가요?";

/**
 * 답을 못 찾았을 때.
 *
 * ⚠️ 아무 답이나 내놓지 않는다. **모르는 건 모른다고 말한다** — 고객센터에서 틀린 답은
 *    답이 없는 것보다 나쁘다(§정직성).
 * ⚠️ 환불 규정·데이터 보관 기간처럼 아직 팀이 정하지 않은 것도 여기로 온다.
 */
export const FAQ_FALLBACK =
  /*
    ⚠️ 줄을 **직접 나눈다.** 한 문장으로 흘리면 창 폭에 따라 "있습니다."만 셋째 줄에 남아
       토막처럼 보인다 — 의미 단위로 끊어 두면 어디서 접혀도 읽힌다.
  */
  "그건 제가 아직 모릅니다.\n\n아래 갈래에서 찾아보시거나,\n담당자에게 직접 문의해 주세요.";

/**
 * 문의 받는 곳.
 *
 * ⚠️ **임시 주소다**(팀 공용 주소가 생기면 이 한 줄만 고친다). 쓰는 곳이 여러 군데라
 *    상수로 둔다 — 화면마다 박아 두면 바꿀 때 하나씩 놓친다.
 */
export const SUPPORT_EMAIL = "hyun030514@g.eulji.ac.kr";
