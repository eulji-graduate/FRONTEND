"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { loadDraft } from "./draft";

/**
 * **제출을 마쳤으면 이 화면에 머물 수 없다** — 결제로 돌려보낸다. 1·2·3단계가 같이 쓴다.
 *
 * ⚠️ 세 단계가 **한 번에** 커밋된다(3단계 [완료]). 그래서 3단계만 막으면 소용이 없다 —
 *    뒤로가기로 1단계에 들어가 부서를 지우면 화면과 서버가 갈라진다.
 * ⚠️ 4단계에서 [이전]을 없앴어도 주소창·뒤로가기로는 들어올 수 있다. 링크를 지우는 것과
 *    들어오지 못하게 하는 것은 다른 일이다.
 * ⚠️ 판정은 **첫 렌더 뒤**에 한다. `sessionStorage`는 서버에 없어서, 서버 렌더 결과와
 *    맞추려면 브라우저에서 한 번 더 읽어야 한다(hydration 불일치 방지).
 * ⚠️ 서버 세션이 붙으면 이 훅 대신 `middleware.ts`가 막는다 — 화면에서 막는 건 UX일 뿐
 *    보안이 아니다(CLAUDE.md §권한).
 */
export function useCommittedRedirect(): void {
  const router = useRouter();

  useEffect(() => {
    if (loadDraft().isCommitted) router.replace("/onboarding/payment");
  }, [router]);
}
