import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import type { Authority } from "@/constants/authority";
import { ApiError, serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { isMock } from "@/mocks/config";

import { getAccessToken } from "./session";

/**
 * 부트스트랩 — `GET /api/auth/me`([확인] BE `AuthController.me`).
 *
 * 로그인한 사람이 누구이고, 온보딩·결제를 어디까지 했는지가 **전부 이 한 번**에 온다.
 * 사이드바 메뉴·라우트 가드·마이페이지가 같은 값을 본다.
 *
 * ⚠️ **한 요청 안에서는 한 번만 부른다**(`cache`). 셸 레이아웃과 그 안의 페이지가 각각
 *    부르면 화면 한 장에 BE 왕복이 두 번 생긴다 — React가 요청 단위로 묶어 준다.
 * ⚠️ **`authority`(권한)와 `roleName`(역할 라벨)은 다른 값이다.** 인가에 쓰는 건 `authority`
 *    (OWNER·LEADER·MEMBER)이고, `roleName`은 팀 안의 라벨(프론트엔드·백엔드)이라 화면 표시용이다.
 *    바꿔 쓰면 역할 칸에 `LEADER`가 찍힌다.
 * ⚠️ **온보딩 전 오너는 `teamId`·`roleName`·`positionId`가 전부 null이다.** 여기서 필수로
 *    가정하면 대표가 로그인한 직후 터진다 — 가장 잘 터지는 지점이다.
 */

/** BE 응답 그대로. 이 모양을 아는 건 이 파일뿐이다(§격리막). */
interface MyProfileResponse {
  memberId: number;
  companyId: number;
  companyName: string;
  companyCode: string;
  name: string;
  email: string;
  phone: string | null;
  teamId: number | null;
  teamName: string | null;
  roleName: string | null;
  positionId: number | null;
  positionName: string | null;
  authority: string;
  isAdmin: boolean;
  landingPath: string;
  isOnboarded: boolean;
  workStatus: string;
  joinedOn: string | null;
  plan: string | null;
  passwordChanged: boolean;
}

/** 화면이 보는 계약. BE 키 이름(`authority`·`roleName`)은 여기서 우리 말로 바뀐다. */
export interface Me {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  /** 인가 축 — BE `authority` */
  authority: Authority;
  isAdmin: boolean;
  companyId: number;
  companyName: string;
  companyCode: string;
  /** 온보딩 전 오너는 없다 */
  teamId: number | null;
  teamName: string | null;
  /** 팀 안의 세부 역할 라벨 — BE `roleName`. 인가에 쓰지 않는다 */
  roleLabel: string | null;
  positionId: number | null;
  positionName: string | null;
  /** 서버가 정한 첫 화면 — 프론트가 계산하지 않는다 */
  landingPath: string;
  isOnboarded: boolean;
  joinedOn: string | null;
  plan: string | null;
  /** `false`면 발급받은 비밀번호를 아직 쓰고 있다는 뜻 — 강제 변경은 아니다(`mustChangePassword`가 아니다). */
  passwordChanged: boolean;
}

/**
 * 로그인 안 했으면 `null`.
 * ⚠️ 던지지 않는다 — 부르는 쪽이 "로그인 화면으로 보낼지"를 정한다. 여기서 터뜨리면
 *    비로그인 접근이 500 화면이 된다.
 */
export const getMe = cache(async (): Promise<Me | null> => {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    return toMe(await serverApi<MyProfileResponse>(ep.me(), { accessToken: token }));
  } catch (error) {
    /*
      ⚠️ **죽은 토큰은 "로그인 안 함"과 같게 본다.** 30분이 지났거나, 권한이 바뀌어 BE가
         토큰을 폐기했을 수 있다 — 그때 터뜨리면 랜딩·로그인 화면까지 500이 되어
         **다시 로그인할 방법이 없어진다.**
      ⚠️ 401·403만 그렇게 본다. 500이나 통신 실패까지 삼키면 BE가 죽은 걸 로그아웃으로
         착각해 조용히 로그인 화면만 뜬다(§정직성).
    */
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
    throw error;
  }
});

/**
 * **이미 로그인했으면 자기 자리로 보낸다** — 랜딩·로그인 화면이 부른다.
 *
 * ⚠️ 미들웨어가 아니라 여기서 한다. 미들웨어는 쿠키가 있는지만 알아서, 만료된 토큰을 든
 *    사람을 로그인 화면 밖으로 밀어 버린다 — 다시 로그인할 자리가 사라진다.
 * ⚠️ 갈 곳은 **서버가 준 `landingPath`** 다. 온보딩 전 오너면 그 값이 온보딩을 가리킨다.
 * ⚠️ `redirect`는 예외를 던진다 — 부르는 쪽의 try/catch 밖이어야 한다(§렌더링·데이터).
 */
export async function redirectIfSignedIn(): Promise<void> {
  if (isMock) return;

  const me = await getMe();
  if (me) redirect(me.landingPath);
}

function toMe(data: MyProfileResponse): Me {
  return {
    id: data.memberId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    // ⚠️ BE ENUM 원값(`MEMBER`)이 그대로 온다 — 한글 라벨은 화면이 붙인다(§도메인 상수)
    authority: data.authority as Authority,
    isAdmin: data.isAdmin,
    companyId: data.companyId,
    companyName: data.companyName,
    companyCode: data.companyCode,
    teamId: data.teamId,
    teamName: data.teamName,
    roleLabel: data.roleName,
    positionId: data.positionId,
    positionName: data.positionName,
    landingPath: data.landingPath,
    isOnboarded: data.isOnboarded,
    joinedOn: data.joinedOn,
    plan: data.plan,
    passwordChanged: data.passwordChanged,
  };
}
