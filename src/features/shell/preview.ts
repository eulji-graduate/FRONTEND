import { AUTHORITY, type Authority } from "@/constants/authority";

/**
 * 목 전용 **미리보기 스위치** — 주소 뒤에 붙여 다른 사람의 화면을 본다.
 *
 *   `?as=member`            그 권한으로 본다 (owner · leader · member)
 *   `?as=member&admin=1`    그 권한에 **관리자 겸직**을 얹어 본다
 *
 * ⚠️ 주소로만 역할을 정하면 `/owner`는 언제나 대표라, **막히는 화면(403)을 확인할 길이 없다** —
 *    가드가 실제로 도는지 눈으로 보려면 다른 사람으로 그 주소를 열어 봐야 한다.
 * ⚠️ **관리자 겸직은 권한이 아니라 위에 얹히는 값이다**(WORKFLOW §9). 그래서 `as`와 따로 받는다 —
 *    겸직자를 보려면 팀장·사원 시점에 `admin=1`을 얹어야 하고, `as=admin`이라는 권한은 없다.
 * ⚠️ 여기서는 **읽기만** 한다. Owner에게 겸직을 얹을 수 있는지는 `canGrantAdmin`이 판정한다 —
 *    판정이 두 곳에 있으면 정책이 바뀔 때 갈린다(§권한: 판정은 `lib/permission.ts` 한 곳).
 * ⚠️ 로그인이 붙으면 이 값은 안 읽힌다(`isMock`) — 세션이 사람을 정한다.
 */
const AUTHORITY_BY_NAME: Record<string, Authority> = {
  OWNER: AUTHORITY.OWNER,
  LEADER: AUTHORITY.LEADER,
  MEMBER: AUTHORITY.MEMBER,
};

/** `admin` 값으로 인정하는 표기 — 그 밖의 값(`admin=0`, `admin=no`)은 겸직이 아니다 */
const ADMIN_ON = new Set(["1", "true"]);

export interface Preview {
  /** `as`가 가리킨 권한. 없거나 모르는 값이면 `null` — 주소가 정한다 */
  role: Authority | null;
  /** 관리자 겸직을 얹어 보는가 — 얹을 수 있는 권한인지는 부르는 쪽이 판정한다 */
  isAdmin: boolean;
}

/** 주소의 쿼리(`as=member&admin=1`)에서 미리보기 설정을 읽는다. `?`는 있어도 없어도 된다 */
export function readPreview(search: string): Preview {
  const params = new URLSearchParams(search);

  const name = params.get("as")?.toUpperCase();
  const role = name ? (AUTHORITY_BY_NAME[name] ?? null) : null;

  const isAdmin = ADMIN_ON.has(params.get("admin")?.toLowerCase() ?? "");

  return { role, isAdmin };
}
