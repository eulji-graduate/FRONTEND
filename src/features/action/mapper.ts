import { ACTION_STATUS } from "@/constants/action";
import type { ActionStatus } from "@/constants/domain";
import type { MemberAction } from "@/features/member/types";
import { type BeAttachment, toProjectAttachment } from "@/features/project/mapper";
import type { TeamActionDetail } from "@/features/project/types";

import type {
  MyActionListItem,
  PersonalActionDetail,
  TeamActionListItem,
  TeamActionProjectGroup,
} from "./types";

/**
 * BE shape → UI 계약 (§Mock 격리막).
 * [확인] 잇다(Z) REST API 연동 가이드 최종본(2026-08-10) + BACKEND 실코드 대조
 *   `action/presentation/api/response/{ActionSummaryResponse,ActionDetailResponse}.java`
 *
 * ⚠️ `description`·`projectId`·`projectName`은 2026-08-11 이홍근 요청으로 추가됨(내 액션
 *    리스트·프로젝트별 그룹핑용). `projectName`은 목록 2경로(개인·팀 액션 목록)에서만 채워지고
 *    타임라인·회의별 조회에서는 "이미 그 화면 안이라 중복"이라 `null`로 온다.
 */
export interface BeActionSummary {
  id: number;
  actionType: "PERSONAL" | "TEAM";
  title: string;
  description: string;
  status: ActionStatus;
  /** "아직 시작 안 함" 액션은 `null`이 정상이다(마이그레이션 문제 아님, BE 주석 확인). */
  startDate: string | null;
  /**
   * 검토 화면에서 사람이 정한 예정 시작일(2026-08-12 #386으로 전 경로 추가 — [확인]
   * `ActionSummaryResponse.java`). `startDate`가 비어 있을 때 이 값을 먼저 쓴다 —
   * **실값이 있는데 날짜를 지어내면 안 된다**(§정직성).
   */
  plannedStartDate: string | null;
  dueDate: string;
  needsReview: boolean;
  isDelayed: boolean;
  assigneeName: string | null;
  projectId: number;
  projectTag: string | null;
  projectName: string | null;
  teamName: string | null;
  sourceMeetingTitle: string | null;
  parentActionId: number | null;
  parentActionTitle: string | null;
  /**
   * 하위 개인 액션 진척(2026-08-11 #355 — [확인] BE 실코드). **`null`과 0/0이 다르다**:
   * `null`은 "하위 개념 자체가 없음"(개인 액션), 0/0은 "하위가 비어 있음"(BE 주석).
   * `GET /api/team/actions` 경로에서만 실값이 온다.
   */
  childDoneCount: number | null;
  childTotalCount: number | null;
}

/**
 * ⚠️ 목록·타임라인 호출부는 **`startDate ?? plannedStartDate`를 넘긴다**(2026-08-12 고침).
 *    전에는 `startDate`만 넘겨서, 검토 화면에서 사람이 정한 예정 시작일이 있는데도 **내일
 *    날짜를 지어내고 있었다** — 지어내는 건 둘 다 없을 때뿐이어야 한다.
 * ⚠️ **보드(`board/server.ts`)는 예외로 `startDate`만 본다**(2026-08-13 명시). 칸 배치가
 *    BE 상태 파생과 같아야 하는데, 예정 시작일은 "아직 시작 안 함"인 액션에도 들어 있어
 *    그걸 시작일로 치면 할일 칸에 있어야 할 카드가 진행중으로 넘어간다.
 *
 * 보드 카드가 요구하는 `startDate`는 `null`을 못 받는다(`getBoardColumn`이 문자열로 가정) —
 * 시작 전 액션은 "아직 시작 안 함"이 곧 **할일 칸**이라는 뜻이므로, 오늘보다 하루 뒤 날짜로
 * 채워 항상 할일 칸에 떨어지게 한다(프로젝트 쪽 "과거 기록 없음 → 진행중으로 본다"와는
 * 정반대 방향 — 여기는 "시작 안 한 게 확실"이라 근거가 있다).
 */
export function fallbackActionStartDate(startDate: string | null): string {
  if (startDate) return startDate;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

/**
 * 팀 액션 상세의 타임라인 탭(`GET /api/team/actions/{id}?tab=timeline`) 한 줄 → UI 계약.
 * ⚠️ `assigneeRoleLabel`은 못 채운다 — `ActionSummaryResponse`에 직급 라벨이 없다(이름만 옴).
 *    타입이 optional이라 없어도 화면은 이름만 보여주는 쪽으로 정상 동작한다.
 */
export function toTeamActionPersonalItem(be: BeActionSummary): {
  id: number;
  title: string;
  assigneeName: string;
  startDate: string;
  dueDate: string;
  status: ActionStatus;
} {
  return {
    id: be.id,
    title: be.title,
    assigneeName: be.assigneeName ?? "",
    startDate: fallbackActionStartDate(be.startDate ?? be.plannedStartDate),
    dueDate: be.dueDate,
    status: be.status,
  };
}

/**
 * 사원 대시보드 "처리할 액션" 타임라인 한 줄(`GET /api/actions`) → UI 계약.
 * ⚠️ **TEAM 타입은 걸러야 한다** — 이 대시보드는 "내" 개인 액션만 보여준다(호출자는
 *    `GET /api/actions`로 이미 본인 소유분만 받지만, 그중에서도 PERSONAL만 남긴다).
 */
export function toMemberAction(be: BeActionSummary): MemberAction {
  return {
    id: String(be.id),
    title: be.title,
    projectTag: be.projectTag ?? "",
    status: be.status,
    startDate: fallbackActionStartDate(be.startDate ?? be.plannedStartDate),
    dueDate: be.dueDate,
  };
}

/**
 * 내 액션 리스트(`/app/my/actions`) 한 줄(`GET /api/actions`) → UI 계약.
 * ⚠️ `team`은 `teamName`이 없으면(수동 추가 등) "-"로 채운다 — 배지에 빈 문자열을 그대로
 *    보여주면 빈 배지처럼 보인다.
 */
export function toMyActionListItem(be: BeActionSummary): MyActionListItem {
  return {
    id: be.id,
    title: be.title,
    description: be.description,
    team: be.teamName ?? "-",
    projectId: be.projectId,
    projectName: be.projectName ?? "",
    projectTag: be.projectTag ?? "",
    startDate: fallbackActionStartDate(be.startDate ?? be.plannedStartDate),
    dueDate: be.dueDate,
    status: be.status,
  };
}

/**
 * 팀 액션 목록(`GET /api/team/actions`) 한 줄 → 평평한 UI 계약.
 * ⚠️ 여기서 그룹을 만들지 않는다 — 페이지 단위로 이어 붙인 뒤 화면이
 *    `groupTeamActionsByProject`로 매번 다시 묶는다(§목록·페이지네이션).
 */
export function toTeamActionListItem(be: BeActionSummary): TeamActionListItem {
  return {
    id: be.id,
    name: be.title,
    /*
      ⚠️ **BE 필드를 읽는 자리는 여기 하나다**(2026-08-13 병합). 그룹핑이 `BeActionSummary`가
         아니라 UI 계약(`TeamActionListItem`)을 받게 바뀌면서, 예정 시작일 fallback도 진척
         값도 이 매퍼가 한 번에 흡수한다 — 그룹핑 쪽에서 다시 BE 모양을 알 필요가 없다.
    */
    startDate: fallbackActionStartDate(be.startDate ?? be.plannedStartDate),
    dueDate: be.dueDate,
    status: be.status,
    childDoneCount: be.childDoneCount,
    childTotalCount: be.childTotalCount,
    projectId: be.projectId,
    projectName: be.projectName ?? "",
    projectTag: be.projectTag ?? "",
  };
}

/**
 * 팀 액션 목록 → 프로젝트별 그룹 — **지금까지 이어 붙인 전체**를 대상으로 매번 다시 묶는다.
 * ⚠️ 목록 순서를 유지한 채 `projectId`로 묶는다(첫 등장 순서가 그룹 순서다). 서버 정렬이
 *    `sort=dueDate&order=asc`라 그룹 순서는 대체로 안정적이지만, 새 페이지가 오면 이미
 *    그려진 그룹이 자랄 수 있다 — 그게 정직한 동작이다(전량을 받아 미리 묶지 않는다).
 */
export function groupTeamActionsByProject(items: TeamActionListItem[]): TeamActionProjectGroup[] {
  const groups = new Map<number, TeamActionProjectGroup>();
  for (const item of items) {
    let group = groups.get(item.projectId);
    if (!group) {
      group = {
        projectId: item.projectId,
        projectName: item.projectName,
        projectTag: item.projectTag,
        teamActions: [],
      };
      groups.set(item.projectId, group);
    }
    group.teamActions.push({
      id: item.id,
      name: item.name,
      startDate: item.startDate,
      dueDate: item.dueDate,
      status: item.status,
      /* 하위 진척 "3/5" — 값은 여기까지 나르고, 게이지 UI는 #421(화면 담당 몫) */
      childDoneCount: item.childDoneCount,
      childTotalCount: item.childTotalCount,
    });
  }
  return [...groups.values()];
}

/** 내 액션 목록(`/app/my/actions`)의 프로젝트별 그룹 — 팀 액션과 같은 규칙으로 다시 묶는다. */
export interface MyActionProjectGroup {
  projectId: number;
  projectName: string;
  projectTag: string;
  actions: MyActionListItem[];
}

/**
 * 내 액션 목록 → 프로젝트별 그룹 — 이어 붙인 전체를 대상으로 매번 다시 묶는다.
 * ⚠️ 마감 임박순(`sort=dueDate&order=asc`)으로 이미 정렬된 목록이라 그룹 안 순서도 그대로다.
 *    새 페이지가 도착하면 그룹이 자랄 수 있다(§목록·페이지네이션 — 위 함수와 같은 이유).
 */
export function groupMyActionsByProject(actions: MyActionListItem[]): MyActionProjectGroup[] {
  const groups = new Map<number, MyActionProjectGroup>();
  for (const action of actions) {
    let group = groups.get(action.projectId);
    if (!group) {
      group = {
        projectId: action.projectId,
        projectName: action.projectName,
        projectTag: action.projectTag,
        actions: [],
      };
      groups.set(action.projectId, group);
    }
    group.actions.push(action);
  }
  return [...groups.values()];
}

/**
 * 개인 액션 상세(`GET /api/actions/{id}`) 응답.
 * [확인] `ActionDetailResponse.java`(2026-08-11, 이홍근 요청 필드 4개 반영·PR #337 머지 완료)
 *
 * ⚠️ `sourceMeetingId`·`parentActionId`가 전부 `null`일 수 있다 — `POST /api/actions`(예외
 *    경로)로 수동 추가한 액션은 출처 회의도 상위 팀 액션도 없다. 목 시절엔 항상 있다고
 *    가정했던 값들이라 매퍼에서 그 경우를 반드시 갈라야 한다(§정직성 — 없는 값을 지어내지 않는다).
 */
export interface BeActionDetail {
  id: number;
  projectId: number;
  title: string;
  /**
   * BE `action.description`은 `TEXT NULL`(V1__init_schema.sql:173)이고 `CreateActionRequest`에
   * `@NotBlank`가 없다 — 수동 추가 액션은 `null`로 저장된다.
   */
  description: string | null;
  status: ActionStatus;
  startDate: string | null;
  dueDate: string;
  needsReview: boolean;
  /** 담당자 미지정이면 `null`(BE `ActionService.getActionDetail`:258 `assignee == null ? null : assignee.name()`). */
  assigneeName: string | null;
  /** 역할(sub_team) 미지정이면 `null`. */
  assigneeRoleLabel: string | null;
  /** 프로젝트 참조 조회 실패면 `null`(BE `ActionService`:288 `project == null ? null : project.tag()`). */
  projectTag: string | null;
  /** 프로젝트 참조 조회 실패면 `null`(BE `ActionService`:289 `project == null ? null : project.name()`). */
  projectName: string | null;
  /**
   * ⚠️ **개인 액션은 항상 `null`이다.** `ActionTypeShapePolicy.checkTeamShape`
   *    (ActionTypeShapePolicy.java:52-53)가 "PERSONAL 액션은 팀을 가질 수 없다"를 강제해
   *    `teamId`가 늘 null이고, BE는 `teamId == null ? null : ...`(ActionService:267-269)로
   *    이름을 만든다.
   */
  teamName: string | null;
  parentActionId: number | null;
  parentActionTitle: string | null;
  parentActionTeamName: string | null;
  parentActionDueDate: string | null;
  sourceMeetingId: number | null;
  sourceMeetingTitle: string | null;
  /** ISO datetime, `LocalDateTime` 문자열 그대로 온다. */
  sourceMeetingScheduledAt: string | null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

/**
 * 응답이 우리가 읽는 모양인가 — `serverApi<BeActionDetail>`는 **단언일 뿐 검사가 아니다**
 * (회의 상세 `isBeMeetingDetail`과 같은 이유·같은 범위: 화면이 읽는 필드만 본다).
 *
 * ⚠️ nullable 5필드(`description`·`assigneeName`·`projectTag`·`projectName`·`teamName`)는
 *    `null`을 통과시킨다 — BE record가 항상 키를 내려보내므로 확장 필드가 아니라 필수 필드다.
 */
function isBeActionDetail(value: unknown): value is BeActionDetail {
  if (typeof value !== "object" || value === null) return false;
  const detail = value as Partial<BeActionDetail>;

  return (
    typeof detail.id === "number" &&
    typeof detail.projectId === "number" &&
    typeof detail.title === "string" &&
    isNullableString(detail.description) &&
    typeof detail.status === "string" &&
    (Object.values(ACTION_STATUS) as string[]).includes(detail.status) &&
    (detail.startDate === null || typeof detail.startDate === "string") &&
    typeof detail.dueDate === "string" &&
    typeof detail.needsReview === "boolean" &&
    isNullableString(detail.assigneeName) &&
    isNullableString(detail.assigneeRoleLabel) &&
    isNullableString(detail.projectTag) &&
    isNullableString(detail.projectName) &&
    isNullableString(detail.teamName) &&
    (detail.parentActionId === null || typeof detail.parentActionId === "number") &&
    isNullableString(detail.parentActionTitle) &&
    isNullableString(detail.parentActionTeamName) &&
    isNullableString(detail.parentActionDueDate) &&
    (detail.sourceMeetingId === null || typeof detail.sourceMeetingId === "number") &&
    isNullableString(detail.sourceMeetingTitle) &&
    isNullableString(detail.sourceMeetingScheduledAt)
  );
}

export function parseActionDetail(raw: unknown): BeActionDetail {
  if (!isBeActionDetail(raw)) {
    throw new Error("액션 상세 응답이 약속한 모양이 아닙니다.");
  }
  return raw;
}

export function toPersonalActionDetail(be: BeActionDetail): PersonalActionDetail {
  return {
    id: be.id,
    name: be.title,
    /* description은 TEXT NULL이라 없을 수 있다 — 화면 계약(non-null string)에 맞춰 빈 문자열로 접는다. */
    description: be.description ?? "",
    /* ⚠️ 개인 액션은 팀이 없다(ActionTypeShapePolicy) — 없으면 칩 자체를 안 그린다 */
    team: be.teamName ?? undefined,
    projectId: be.projectId,
    /* ⚠️ `null`을 그대로 넘기면 `pickPaletteColor`가 `null.length`에서 던진다(palette.ts:105) */
    projectTag: be.projectTag ?? undefined,
    assigneeName: be.assigneeName ?? undefined,
    assigneeRoleLabel: be.assigneeRoleLabel ?? undefined,
    sourceMeeting:
      be.sourceMeetingId !== null && be.sourceMeetingTitle && be.sourceMeetingScheduledAt
        ? {
            id: be.sourceMeetingId,
            title: be.sourceMeetingTitle,
            scheduledAt: be.sourceMeetingScheduledAt,
          }
        : undefined,
    parentTeamAction:
      be.parentActionId !== null &&
      be.parentActionTitle !== null &&
      be.parentActionTeamName !== null &&
      be.parentActionDueDate !== null
        ? {
            id: be.parentActionId,
            name: be.parentActionTitle,
            team: be.parentActionTeamName,
            dueDate: be.parentActionDueDate,
          }
        : undefined,
  };
}

/**
 * 팀 액션 상세(`GET /api/team/actions/{id}`) 응답.
 * [확인] `TeamActionDetailResponse.java`(2026-08-11, BACKEND PR #339 머지 완료)
 *
 * ⚠️ `assigneeName`·`assigneeRoleLabel`은 **저장된 값이 아니라 BE가 그 팀의 현재 팀장을
 *    그때그때 유도**해서 채운다(`"{팀명}장"` 고정 포맷도 BE가 조립) — 팀장 공석이면 둘 다
 *    `null`(정상 상태). `sourceMeetingId`도 없을 수 있다(수동 추가된 팀 액션 등).
 */
export interface BeTeamActionDetail {
  id: number;
  projectId: number;
  title: string;
  description: string;
  status: ActionStatus;
  dueDate: string;
  projectTag: string;
  teamName: string;
  assigneeName: string | null;
  assigneeRoleLabel: string | null;
  sourceMeetingId: number | null;
  sourceMeetingTitle: string | null;
  sourceMeetingScheduledAt: string | null;
  attachments: BeAttachment[];
}

export function toTeamActionDetail(be: BeTeamActionDetail): TeamActionDetail {
  return {
    id: be.id,
    name: be.title,
    description: be.description,
    team: be.teamName,
    projectId: be.projectId,
    projectTag: be.projectTag,
    status: be.status,
    dueDate: be.dueDate,
    assigneeName: be.assigneeName ?? undefined,
    assigneeRoleLabel: be.assigneeRoleLabel ?? undefined,
    sourceMeeting:
      be.sourceMeetingId !== null && be.sourceMeetingTitle && be.sourceMeetingScheduledAt
        ? {
            id: be.sourceMeetingId,
            title: be.sourceMeetingTitle,
            scheduledAt: be.sourceMeetingScheduledAt,
          }
        : undefined,
    attachments: be.attachments.map(toProjectAttachment),
  };
}
