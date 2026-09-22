/**
 * 액션 상수 — 화면엔 한글 라벨, 코드엔 영문 상수 (CONVENTIONS §6).
 *
 * ⚠️ 코드값은 **FE 제안**이다. 담당자 도메인 문서를 받으면 여기부터 맞춘다(CLAUDE.md §연동 검증).
 */

export const ACTION_STATUS = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
} as const;
export type ActionStatus = (typeof ACTION_STATUS)[keyof typeof ACTION_STATUS];

export const ACTION_STATUS_LABEL: Record<ActionStatus, string> = {
  /* ⚠️ `대기`가 아니라 **`할 일`**이다(팀 워크플로우 2026-08-05). 보드 첫 열과 같은 말이어야 한다 */
  TODO: "할 일",
  IN_PROGRESS: "진행중",
  DONE: "완료",
};

/**
 * 지연 표시 라벨. **상태가 아니라 파생값**(마감 경과)이라 `ACTION_STATUS_LABEL`에 넣지 않는다.
 * 라벨 하드코딩을 막으려고 화면이 `isDelayed`로 판정한 뒤 이 값을 쓴다(§도메인 상수).
 */
export const ACTION_DELAYED_LABEL = "지연";

export const ACTION_TYPE = {
  /** 팀 단위 — 팀장이 받아 개인에게 쪼갠다 */
  TEAM: "TEAM",
  /** 개인 — parentActionId로 TEAM을 참조한다 */
  PERSONAL: "PERSONAL",
} as const;
export type ActionType = (typeof ACTION_TYPE)[keyof typeof ACTION_TYPE];

/**
 * `YYYY-MM-DD` 마감일이 이미 지났는가 — **로컬 자정 기준**이다.
 *
 * ⚠️ `new Date("2026-08-05")`는 UTC 자정이라 KST(+9)에선 '오늘 마감'이 오전 9시부터 지연으로
 *    잘못 뜬다 — 마감일은 시각이 아니라 날짜다. **이 프로젝트에서 마감 경과를 판정하는
 *    구현은 이 함수 하나뿐이다.** 자정 계산이 두 벌이면 서버 시각과 브라우저 시각이 갈리는
 *    자정 무렵에 목록과 보드가 다른 배지를 단다.
 * ⚠️ `today`를 주입 가능하게 둔다 — 테스트가 시각을 못 박고, 보드가 렌더 시점 `today`를
 *    한 번 만들어 여러 카드에 넘길 수 있다.
 */
export function isPastDue(dueDate: string, today: Date = new Date()): boolean {
  const due = new Date(`${dueDate}T00:00:00`);
  const midnight = new Date(today);
  midnight.setHours(0, 0, 0, 0);
  return due < midnight;
}

/**
 * ⚠️ DELAYED는 **상태가 아니라 파생값**이다(마감 경과).
 * ⚠️ **진행중 한정이다**(팀 확정 · docs/WORKFLOW.md §7 "진행중 칸 안의 배지").
 *    할일은 아직 안 늦은 것이고 완료는 지연이 아니다 — BE `ActionSummaryResponse`도 같은
 *    식을 쓴다(`status == IN_PROGRESS && dueDate.isBefore(today)`). 여기를 `status !== DONE`
 *    으로 되돌리면 같은 액션이 화면과 서버에서 다른 배지를 단다.
 * ⚠️ 마감 경과 비교는 `isPastDue` 하나뿐이다 — 자정 계산을 여기 다시 쓰지 않는다.
 */
export function isDelayed(
  action: { status: ActionStatus; dueDate: string },
  today: Date = new Date(),
): boolean {
  if (action.status !== ACTION_STATUS.IN_PROGRESS) return false;
  return isPastDue(action.dueDate, today);
}
