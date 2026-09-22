import type { Metadata } from "next";

import { StatusActionLink, StatusScreen } from "@/components/common/status-screen";

export const metadata: Metadata = {
  title: "로그인이 필요한 화면 — Z",
  robots: { index: false, follow: false },
};

/**
 * 401 — **세션이 없거나 만료됐을 때.**
 *
 * ⚠️ 아직 이 화면으로 보내는 곳이 없다. 라우트 보호(`src/proxy.ts` — Next 16에서 `middleware.ts`가 이 이름이다)가 쿠키만 보고,
 *    로그인 화면으로 곧장 보내고 있어, 이 화면은 **그 문지기가 rewrite할 자리**로 미리 세워
 *    둔 것이다(§렌더링·데이터: 라우트 보호는 문지기 + 서버 재검사). 쓸지 말지는 팀이 정한다.
 * ⚠️ 로그인 화면으로 **바로 튕기지 않는 이유**가 있다. 아무 설명 없이 로그인 폼이 뜨면
 *    "왜 로그아웃됐지"를 알 수 없다 — 세션이 끊겼다는 사실을 먼저 말하고 보낸다(§정직성).
 * ⚠️ 기업 코드는 로그인 화면에서 다시 받는다 — 여기서 묻지 않는다(§라우트 그룹).
 */
export default function UnauthorizedPage() {
  return (
    <StatusScreen
      code="401"
      title="로그인이 필요합니다"
      description="세션이 만료되었거나 로그인하지 않은 상태입니다. 다시 로그인한 뒤 이용해 주세요."
      action={<StatusActionLink href="/login" label="로그인하러 가기" />}
    />
  );
}
