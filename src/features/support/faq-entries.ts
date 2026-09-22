import { ACCOUNT_ENTRIES } from "./entries-account";
import { ENV_ENTRIES } from "./entries-env";
import { PRODUCT_ENTRIES } from "./entries-product";
import { START_ENTRIES } from "./entries-start";
import type { FaqCategory, FaqEntry } from "./faq";

/**
 * 도움말이 실제로 답하는 것들 — 갈래별 파일을 한 줄로 잇는다.
 *
 * ⚠️ 순서가 곧 **되물을 때 보여줄 순서**다. 점수가 같으면 먼저 적힌 것이 앞에 온다.
 * ⚠️ 파일을 나눈 이유는 길이뿐이다(§200줄). 답을 고칠 땐 갈래 파일만 보면 된다.
 */
export const FAQ_ENTRIES: readonly FaqEntry[] = [
  ...PRODUCT_ENTRIES,
  ...START_ENTRIES,
  ...ACCOUNT_ENTRIES,
  ...ENV_ENTRIES,
];

/** 갈래별로 묶어 준다 — 고른 갈래 안의 질문만 보여줄 때 쓴다 */
export function entriesOfCategory(category: FaqCategory) {
  return FAQ_ENTRIES.filter((entry) => entry.category === category);
}
