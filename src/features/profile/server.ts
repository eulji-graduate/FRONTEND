import "server-only";

import { getMe } from "@/features/auth/me";
import { isMock } from "@/mocks/config";

import { MY_PROFILE_MOCK } from "./mock/profile";
import type { MyProfile } from "./types";

/**
 * "발급받은 비밀번호를 아직 쓰는가" — 종 목록(`NotificationBell`)에 임시 비밀번호 안내를
 * 끼워 넣을지 판정(`(shell)/layout.tsx` → `NotificationProvider`의 `showPasswordChangeNotice`).
 *
 * ⚠️ 목에서는 **켜 둔 채로 데모한다**(2026-08-19 변경 — 이전엔 `getMe()`가 늘 `null`이라
 *    꺼진 채로 뒀는데, 그러면 이 화면이 실제로 어떻게 뜨는지 목에서 아예 볼 수가 없었다).
 *    임시 비밀번호를 아직 안 바꾼 계정의 **success 예시 하나**를 그대로 보여 주는 것뿐이라
 *    정직한 목업 원칙에 어긋나지 않는다 — 실제 판정(`me.passwordChanged`)은 여전히
 *    실연동 모드에서만 값을 낸다.
 */
export async function shouldShowPasswordChangeBanner(): Promise<boolean> {
  if (isMock) return true;

  const me = await getMe();
  return me !== null && !me.passwordChanged;
}

/**
 * 마이페이지 기본 정보 — 격리막(CLAUDE.md).
 *
 * ⚠️ **부트스트랩(`GET /api/auth/me`)을 다시 쓴다.** 같은 값을 주는 경로가 하나뿐이라
 *    따로 부르면 한 화면에서 같은 요청이 두 번 나간다 — `getMe`가 요청 단위로 묶어 준다.
 * ⚠️ **팀·직급이 비어 있을 수 있다**(온보딩 전 오너). 화면은 문자열을 기대하므로 여기서
 *    `-`로 메운다 — 빈 칸으로 두면 값을 못 불러온 것처럼 읽힌다.
 */
export async function getMyProfile(): Promise<MyProfile> {
  if (isMock) return MY_PROFILE_MOCK;

  const me = await getMe();
  if (!me) throw new Error("로그인이 필요합니다.");

  return {
    id: me.id,
    name: me.name,
    email: me.email,
    role: me.authority,
    companyName: me.companyName,
    teamName: me.teamName ?? "-",
    roleLabel: me.roleLabel,
    position: me.positionName ?? "-",
    joinedAt: me.joinedOn ?? "-",
  };
}
