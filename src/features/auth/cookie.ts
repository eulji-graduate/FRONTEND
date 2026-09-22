/**
 * 세션 쿠키의 **이름과 수명 한 곳** — `session.ts`와 `proxy.ts`가 같이 본다.
 *
 * ⚠️ `session.ts`는 `server-only`라 `proxy.ts`(Next 16 미들웨어)가 import할 수 없다.
 *    그래서 이름·수명만 이 파일로 떼어 놓는다 — 두 곳에 각자 적어 두면 한쪽만 고치는 날
 *    쿠키를 굽는 이름과 읽는 이름이 갈라진다.
 * ⚠️ 여기엔 `cookies()`를 부르는 코드가 없다. 값과 규칙만 있다.
 */

export const ACCESS_TOKEN_COOKIE = "z_access_token";
export const REFRESH_TOKEN_COOKIE = "z_refresh_token";

/**
 * "로그인 상태 유지"를 켰는지 — **토큰이 아니다.**
 *
 * ⚠️ 재발급(`POST /api/auth/refresh`)에 이 값을 같이 보내야 BE가 갱신표 수명을
 *    1일로 줄지 14일로 줄지 정한다. 로그인 때 고른 값을 기억해 둘 곳이 필요하다.
 * ⚠️ 비밀이 아니지만 그래도 httpOnly로 굽는다 — 브라우저 JS가 읽을 이유가 없다.
 */
export const KEEP_SIGNED_IN_COOKIE = "z_keep_signed_in";

/**
 * 액세스 토큰 쿠키 수명 — **BE의 `access-ttl: 30m`과 맞춘다**(application.yaml).
 *
 * ⚠️ **토큰보다 길게 두면 안 된다.** 전에는 14일로 뒀는데, 그러면 30분이 지나 서버에서
 *    죽은 토큰이 쿠키에는 멀쩡히 남아 있어 **재발급할 때를 알 수 없다** — 사용자는
 *    아무 화면에서나 401을 맞고 로그인 화면으로 떨어졌다.
 * ⚠️ 쿠키가 토큰과 같이 사라지므로, "액세스 쿠키가 없는데 갱신표는 있다"가 곧
 *    **"재발급할 때다"** 라는 신호가 된다(`proxy.ts`).
 */
export const ACCESS_TOKEN_MAX_AGE = 60 * 30;

/**
 * 갱신표 쿠키 수명 — BE `refresh-ttl-extended: 14d`와 맞춘다.
 *
 * ⚠️ "로그인 상태 유지"를 **끄면 수명을 안 준다**(세션 쿠키). 브라우저를 닫으면 사라진다 —
 *    공용 PC에서 체크를 끄는 사람이 기대하는 동작이고, BE의 `refresh-ttl-default: 1d`보다
 *    짧아지는 건 안전한 쪽이라 괜찮다.
 */
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 14;

/**
 * 이 요청이 **HTTPS로 들어왔는가** — `secure` 플래그를 여기서 정한다.
 *
 * ⚠️ **`NODE_ENV`로 판단하면 안 된다.** 전에는 `secure: NODE_ENV === "production"`이었는데,
 *    도커 이미지가 `NODE_ENV=production`으로 굳어 있어서 **http로 띄운 서버에서도 `secure`가
 *    켜졌다.** 브라우저는 http에서 `Secure` 쿠키를 **조용히 버린다** — 로그인은 성공하고
 *    리다이렉트까지 가는데 쿠키가 없어서 `proxy.ts`가 로그인 화면으로 되돌렸다.
 *    303(로그인 성공) → 307(가드가 되돌림) → 200(로그인 화면)이 그 흔적이다.
 * ⚠️ 배포 방식이 아니라 **지금 이 요청의 프로토콜**을 본다. 그래야 http로 띄운 데모에서도
 *    로그인이 되고, 나중에 앞단에 HTTPS를 붙이는 순간 **설정을 안 고쳐도** 다시 켜진다.
 * ⚠️ `x-forwarded-proto`는 앞단(ALB·nginx)이 붙여 준다. 없으면 앞단이 없다는 뜻이라 http로 본다.
 *    값이 여럿이면(`https,http`) 맨 앞이 사용자와 맺은 프로토콜이다.
 */
export function isSecureRequest(forwardedProto: string | null | undefined): boolean {
  if (!forwardedProto) return false;
  return forwardedProto.split(",")[0]?.trim().toLowerCase() === "https";
}

/**
 * 쿠키 공통 속성 — 토큰이 브라우저 JS에 안 보이게 하는 게 핵심이다.
 *
 * ⚠️ `isSecure`는 부르는 쪽이 정한다. Server Action은 `headers()`로, `proxy.ts`는
 *    `request.headers`로 읽는다 — 이 파일은 요청을 모른다(Edge에서도 읽히므로 `server-only`를 못 쓴다).
 */
export function tokenCookieOptions(maxAge: number | undefined, isSecure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecure,
    path: "/",
    ...(maxAge === undefined ? {} : { maxAge }),
  };
}
