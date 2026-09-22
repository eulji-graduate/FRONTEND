import "server-only";

import { redirect } from "next/navigation";

import { AUTHORITY } from "@/constants/authority";
import { getMe } from "@/features/auth/me";
import { isMock } from "@/mocks/config";

/**
 * 온보딩 1·2·3단계에 **머물 수 있는가** — 서버 판정.
 *
 * ⚠️ 지금까지 이 판정은 `sessionStorage`(`useCommittedRedirect`)뿐이었다. 그건 UX일 뿐
 *    보안이 아니고, 탭을 새로 열면 아예 안 걸린다 — 이미 온보딩을 끝낸 회사가 1단계로
 *    돌아가 부서를 다시 만들면 커밋에서 409를 맞고 그제야 알게 된다.
 * ⚠️ **4단계(결제)·완료 화면은 막지 않는다.** BE는 [완료]를 누른 그 순간
 *    `isOnboarded`를 켜므로, 온보딩 완료를 이유로 막으면 방금 커밋한 사람이
 *    결제 화면에 들어가는 순간 튕겨 나간다.
 * ⚠️ 온보딩은 **OWNER 전용**이다(BE `@PreAuthorize("hasRole('OWNER')")`). 사원이 주소로
 *    들어오면 자기 자리로 돌려보낸다 — 커밋 버튼을 누를 때 403을 보여 주는 건 늦다.
 */
export async function guardOnboardingStep(): Promise<void> {
  if (isMock) return;

  const me = await getMe();
  // 로그인 자체가 없으면 `middleware.ts`가 앞에서 막는다 — 여기까지 오면 쿠키가 상한 경우다
  if (!me) redirect("/login");

  // ⚠️ 갈 곳은 서버가 준 값이다 — 권한으로 프론트가 계산하지 않는다
  if (me.authority !== AUTHORITY.OWNER) redirect(me.landingPath);
  if (me.isOnboarded) redirect(me.landingPath);
}

/**
 * 반대 방향 — **온보딩을 안 끝냈으면 워크스페이스에 못 들어온다.**
 *
 * ⚠️ 부서·직급이 하나도 없는 회사에서 셸을 그리면 메뉴는 뜨는데 안쪽이 전부 빈 목록이라,
 *    무엇이 잘못됐는지 알 수 없다. 온보딩부터 끝내게 돌려보낸다.
 * ⚠️ **온보딩을 못 하는 사람(사원)은 여기 걸리지 않는다.** 초대로 만들어진 계정은
 *    회사가 이미 온보딩을 마친 뒤에 생기므로 `isOnboarded`가 켜져 있다 — 혹시 꺼져 있다면
 *    그 사람을 1단계로 보내 봐야 OWNER 가드에 다시 걸려 무한히 튕긴다. 권한도 같이 본다.
 */
export async function guardWorkspaceEntry(): Promise<void> {
  if (isMock) return;

  const me = await getMe();
  if (!me) redirect("/login");
  if (me.isOnboarded) return;

  if (me.authority === AUTHORITY.OWNER) redirect("/onboarding/1");

  /*
    ⚠️ 사원인데 회사가 온보딩 전이다 — 정상 흐름에서는 생길 수 없다(계정이 온보딩에서 난다).
       조용히 통과시키지 않는다. 로그인 화면으로 돌리면 다시 들어와 같은 자리에 서므로,
       무슨 일인지 말해 주고 멈춘다(§정직성).
  */
  throw new Error("회사의 초기 설정이 아직 끝나지 않았습니다. 대표에게 문의해 주세요.");
}
