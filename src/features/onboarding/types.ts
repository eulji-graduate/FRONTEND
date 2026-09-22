import { ASSIGNABLE_AUTHORITIES, AUTHORITY } from "@/constants/domain";

/** 조직 트리 노드. 2계층(부서 > 역할)까지 쓴다(DECISIONS · CONVENTIONS §6). */
export interface DepartmentNode {
  id: string;
  name: string;
  children: DepartmentNode[];
}

/** 조직 트리 최대 깊이 — **2계층**(부서 > 역할). DECISIONS 참고. */
export const MAX_DEPARTMENT_DEPTH = 2;

/**
 * 부서·역할·직급 이름의 최대 글자 수.
 *
 * ⚠️ **3단계(사원 초대) 칸에서 역산한 값이다.** 거기서 이 이름들이 좁은 셀렉트에 들어가는데,
 *    길면 잘려서 무엇을 고른 건지 알 수 없어진다. 자르는 대신 **적을 때 막는다** —
 *    다 적고 나서 잘린 걸 발견하는 것보다 낫다.
 * ⚠️ 계산: 12px 한글 5자 = 60px, 좌우 여백 16 + 화살표 16을 더해 **칸 92px**이다.
 *    이 값을 올리려면 3단계 칸도 같이 넓혀야 한다 — 한쪽만 고치면 다시 잘린다.
 * ⚠️ "개발팀"·"경영지원"·"프론트엔드"처럼 실제로 쓰는 이름은 대부분 5자 안에 들어간다.
 */
export const MAX_ORG_NAME_LENGTH = 5;

/**
 * 화면 안에서만 쓰는 **역할 예약값 둘.**
 *
 * BE는 `리더`(roleId 1)와 `없음`(roleId 2)을 **전역 시드 행**으로 들고 있다 — 둘 다 실재하는
 * 역할이고, 서로 다른 뜻이다. 팀장은 `리더`를 갖고, 세부 역할이 없는 일반 팀원은 `없음`을 갖는다.
 *
 * ⚠️ **하나로 뭉뚱그리면 안 된다.** 전에는 `없음` 하나로 둘 다 표현했는데, 그러면 BE에 보낼 때
 *    리더인지 그냥 무라벨 팀원인지 구분이 안 된다. 화면에서도 팀장 줄에 `없음`이라 적혀
 *    "역할을 안 정했다"로 읽혔다.
 * ⚠️ 실제 역할 id와 겹치지 않게 예약어 꼴로 둔다. 역할 id는 트리 노드 id(`r1` 등)라 안 겹친다.
 * ⚠️ **BE 실제 id로 바꾸는 건 매퍼가 한다.** 여기 값은 화면 안에서만 산다 —
 *    지금은 ERD 미확정이라 매퍼를 안 짠다(§연동 검증).
 */
export const LEADER_ROLE_ID = "__leader-role__";
export const NO_ROLE_ID = "__no-role__";

/** 화면에 적는 말 — 값과 라벨이 갈라지지 않게 옆에 둔다 */
export const LEADER_ROLE_LABEL = "리더";
export const NO_ROLE_LABEL = "없음";

/**
 * 트리 두 계층의 이름.
 * 윗단은 **부서**(개발팀), 아랫단은 그 안에서 맡는 **역할**(프론트엔드·백엔드)이다.
 * 팀장은 역할이 `리더`로 자동으로 정해지고, 역할이 하나도 없는 부서의 사원은 `없음`이 된다 —
 * 둘 다 **고르는 게 아니라 정해지는 값**이다(`LEADER_ROLE_ID`·`NO_ROLE_ID`).
 */
const DEPTH_LABEL = ["팀", "역할"] as const;

export function getDepthLabel(depth: number): string {
  return DEPTH_LABEL[depth] ?? "역할";
}

/**
 * 온보딩 단계 — 화면 하단 스텝퍼와 헤더 `단계 n / 4`에 함께 쓴다.
 *
 * ⚠️ **결제가 마지막 단계다**(2026-08-04). 무료 요금제가 없어져 결제를 마쳐야 워크스페이스가
 *    열린다 — 온보딩을 다 해놓고 결제 화면을 따로 찾아가게 두면 조직만 만들고 멈춘다.
 * ⚠️ 결제 화면도 **온보딩 셸 안**이다. 사이드바가 있으면 이미 들어온 것처럼 보여
 *    "결제해야 넘어간다"가 전달되지 않는다.
 */
export const ONBOARDING_STEP = {
  DEPARTMENT: 1,
  POSITION: 2,
  INVITE: 3,
  PAYMENT: 4,
} as const;
export type OnboardingStep = (typeof ONBOARDING_STEP)[keyof typeof ONBOARDING_STEP];

export const ONBOARDING_STEP_LABEL: Record<OnboardingStep, string> = {
  1: "팀 체계",
  2: "직급 체계",
  3: "사원 초대",
  4: "결제",
};

export const ONBOARDING_TOTAL_STEPS = 4;

/* ───────── 2단계 · 직급 체계 ───────── */

/**
 * 직급 한 줄. **직급명과 권한은 분리된다** — 이름은 회사마다 다르게 쓰고,
 * 권한은 이름과 무관하게 직접 고른다(Owner·Leader·Member).
 * ⚠️ Admin은 여기 없다. 직급이 아니라 **사람에게** 붙는 겸직 권한이다.
 */
export interface Position {
  id: string;
  name: string;
  role: AssignableRole;
  /**
   * 직급 권한 요약.
   *
   * ⚠️ **화면에 안 보이지만 버리면 안 된다.** BE가 `@NotBlank`로 필수라(`CreatePositionRequest`·
   *    `UpdatePositionRequest`) 저장할 때 다시 보내야 한다 — 안 들고 다니면 왕복 한 번에
   *    남이 적어 둔 설명이 지워지거나 400이 난다.
   * ⚠️ 온보딩에서 새로 만들 때는 비어 있다 — 그때는 저장하는 쪽이 채운다.
   */
  description?: string;
}

/** 기업이 고를 수 있는 권한. `SYSTEM`은 서비스 운영자라 제외된다. */
export type AssignableRole = (typeof ASSIGNABLE_AUTHORITIES)[number];

/**
 * 기업 승인 때 **시스템이 발급하는 계정.**
 * 직급 매핑 대상이 아니라, 전체 권한 구조를 보여주려고 미리보기에 고정으로 띄운다.
 *
 * ⚠️ **대표 하나뿐이다.** Admin은 역할이 아니라 사람에게 붙는 겸직 권한이라,
 *    가입 시점엔 붙일 사람이 없다 — 사원이 들어온 뒤 대표가 지정한다.
 */
export const SYSTEM_ISSUED_POSITIONS = [
  { name: "대표", role: AUTHORITY.OWNER },
] as const satisfies readonly { name: string; role: AssignableRole }[];

/* ───────── 3단계 · 사원 초대 ───────── */

/**
 * 초대 한 줄. 계정이 만들어지면 여기 지정한 부서·직급으로 자동 배정된다.
 * 부서는 **말단 부서만** 고를 수 있다(DECISIONS: 사원은 말단에만 소속).
 */
export interface Invite {
  id: string;
  /**
   * 받는 사람 이름.
   * ⚠️ 주소만 있으면 목록에서 **누가 누군지 알 수 없다** — 회사 메일이 `dev01@`처럼
   *    사람 이름과 무관한 경우가 흔하다. 계정이 만들어질 때 표시 이름으로도 쓴다.
   * ⚠️ 필수는 아니다. 비어 있으면 서버가 메일 주소 앞부분을 쓴다(BE 협의 필요).
   */
  name: string;
  email: string;
  /** 소속 부서(트리 윗단) */
  departmentId: string;
  /**
   * 부서 안에서 맡는 역할(트리 아랫단).
   *
   * - `""` — **아직 안 골랐다.** 부서를 고르기 전이거나 고르는 중이다.
   * - `LEADER_ROLE_ID` — **리더**다. 리더 직급을 고르면 자동으로 채워지고 칸이 잠긴다.
   * - `NO_ROLE_ID` — **`없음`**이다. 세부 역할이 없는 일반 팀원 — 그 부서에 고를 역할이
   *   하나도 없을 때만 나온다.
   * - 그 밖 — 그 역할의 id.
   *
   * ⚠️ 안 고른 것과 `없음`을 **같은 값으로 두지 않는다.** 둘을 구분해야 직급 칸을
   *    언제 열지 알 수 있고, "역할을 안 골랐다"고 알릴 수도 있다.
   * ⚠️ **`리더`와 `없음`도 다른 값이다.** BE에서 둘 다 실재하는 역할 행이라(전역 시드 1·2)
   *    하나로 보내면 팀장인지 무라벨 팀원인지 구분이 안 된다.
   * ⚠️ BE 실제 id로 바꾸는 건 **매퍼**가 맡는다 — 이 값들은 화면 안에서만 쓴다.
   */
  roleId: string;
  positionId: string;
  /**
   * Admin 겸직 여부.
   * ⚠️ Admin은 **직급이 아니라 사람에게** 붙는 권한이라 2단계(직급 체계)에서 정할 수 없다.
   *    초대하는 이 자리에서 켜야 회사에 관리자가 처음부터 있다.
   * ⚠️ 역할을 대체하지 않는다 — 이 사람은 여전히 Leader 또는 Member이고 그 위에 Admin이 얹힌다.
   */
  isAdmin: boolean;
  /** 이미 초대장이 나간 줄 — 다시 보내거나 고칠 수 없다 */
  isSent: boolean;
}

/*
  ⚠️ `INVITE_LINK_VALID_DAYS`를 지웠다. 초대는 **링크를 보내 본인이 가입하는 방식이 아니라**
     보내는 순간 계정이 만들어지고 아이디·첫 비밀번호가 메일로 나가는 방식이다(팀 확정 2026-08-03).
     유효기간이라는 개념 자체가 없다. `/invite/[token]` 라우트도 같은 이유로 필요 없다.
*/

/**
 * 이름 목록에서 하나를 고르는 칸(`OptionSelect`)에 넘기는 항목.
 *
 * ⚠️ **여기 한 곳에만 정의한다.** 선택지를 추리는 쪽(`invite-choices.ts`)과 그리는 쪽
 *    (`option-select.tsx`)이 각자 들고 있으면, 한쪽에 필드를 더할 때 다른 쪽이 조용히 떨어뜨린다.
 */
export interface SelectOption {
  id: string;
  name: string;
  /**
   * 고를 수 없는 항목.
   * ⚠️ **왜 못 고르는지 항목 옆에 적지 않는다.** 좁은 목록에 설명이 붙으면 이름이 밀리고
   *    글자 크기도 섞여 무엇을 고를 수 있는지가 더 안 보인다 — 흐린 것으로 충분하다.
   */
  disabled?: boolean;
}
