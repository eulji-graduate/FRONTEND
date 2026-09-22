/**
 * 역할 × 기능 표.
 *
 * ⚠️ **명세에 있는 것만 적는다.** 없는 기능을 표에 넣으면 그게 거짓말이 된다.
 * ⚠️ `"partial"`은 "되긴 되는데 범위가 좁다"는 뜻이다 — 조건을 `note`에 반드시 적는다.
 *    조건 없이 세모만 두면 읽는 사람이 무엇이 다른지 알 수 없다.
 * ⚠️ **`admin` 열은 겸직 권한이다.** Owner·Leader·Member와 나란한 역할이 아니라 그 위에
 *    덧붙는 것이라, 여기 `yes`가 오는 건 **Admin 자체가 주는 운영 기능**뿐이다.
 *    회의 참여·액션 조회처럼 역할이 정하는 일은 `no`다 — Admin을 켠다고 늘지 않는다.
 */
export type Access = "yes" | "no" | "partial";

export interface PermissionRow {
  feature: string;
  owner: Access;
  leader: Access;
  member: Access;
  /** 겸직 권한이 주는 것인지 — 역할이 정하는 일은 여기 `yes`가 오지 않는다 */
  admin: Access;
  /** `partial`이 있으면 무엇이 다른지 적는다 */
  note?: string;
}

export interface PermissionGroup {
  title: string;
  rows: readonly PermissionRow[];
}

/** 표의 열 순서. 겸직이라 Admin이 맨 뒤에 온다. */
export const ROLE_COLUMNS = ["Owner", "Leader", "Member", "+Admin"] as const;

export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    title: "화면 접근",
    rows: [
      { feature: "내 업무 보기", owner: "yes", leader: "yes", member: "yes", admin: "no" },
      { feature: "팀 관리", owner: "no", leader: "yes", member: "no", admin: "no" },
      { feature: "회사 운영", owner: "yes", leader: "no", member: "no", admin: "no" },
    ],
  },
  {
    title: "프로젝트",
    rows: [
      { feature: "프로젝트 생성", owner: "yes", leader: "no", member: "no", admin: "no" },
      { feature: "기획 열람", owner: "yes", leader: "yes", member: "yes", admin: "no" },
      { feature: "타임라인 조회", owner: "yes", leader: "yes", member: "yes", admin: "no" },
    ],
  },
  {
    title: "회의",
    rows: [
      { feature: "프로젝트 회의 개설", owner: "yes", leader: "no", member: "no", admin: "no" },
      { feature: "팀 회의 개설", owner: "yes", leader: "yes", member: "yes", admin: "no" },
      { feature: "회의 참여", owner: "yes", leader: "yes", member: "yes", admin: "no" },
      {
        feature: "회의 캡처 · 종료",
        owner: "partial",
        leader: "partial",
        member: "partial",
        admin: "no",
        note: "권한과 무관하게 해당 회의 담당자만 가능합니다",
      },
    ],
  },
  {
    title: "액션",
    rows: [
      { feature: "팀 액션 보기", owner: "yes", leader: "yes", member: "yes", admin: "no" },
      { feature: "내 액션 보기", owner: "yes", leader: "yes", member: "yes", admin: "no" },
      { feature: "인수인계로 재배정", owner: "no", leader: "yes", member: "no", admin: "no" },
    ],
  },
  {
    title: "인수인계",
    rows: [
      { feature: "신청", owner: "no", leader: "yes", member: "yes", admin: "no" },
      { feature: "중간 승인", owner: "no", leader: "yes", member: "no", admin: "no" },
      {
        feature: "최종 승인",
        owner: "yes",
        leader: "no",
        member: "no",
        admin: "no",
        note: "2026-08-06부터 Owner 전용입니다 — Admin은 승인 대상 화면엔 들어가지만 승인 버튼은 없습니다",
      },
    ],
  },
  {
    title: "관리",
    rows: [
      {
        feature: "계정 발급",
        owner: "yes",
        leader: "no",
        member: "no",
        admin: "yes",
        note: "사원 관리 화면 안 버튼입니다 — 별도 화면이 아닙니다",
      },
      {
        feature: "직급 · 권한 변경",
        owner: "yes",
        leader: "no",
        member: "no",
        admin: "yes",
        note: "Admin 겸직은 Leader · Member에게만 줄 수 있습니다 — Owner는 겸할 수 없습니다",
      },
      { feature: "회의실 관리", owner: "no", leader: "no", member: "no", admin: "yes" },
      { feature: "구독", owner: "yes", leader: "no", member: "no", admin: "yes" },
    ],
  },
];
