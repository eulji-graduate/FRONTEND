"use client";

import type { DepartmentNode, Invite, Position } from "./types";
import { MAX_DEPARTMENT_DEPTH } from "./types";

/**
 * 온보딩 임시 보관함 — **BE 연동 전까지만 쓰는 코드다.**
 *
 * 온보딩은 [완료]에서 한 번에 커밋할 예정이다. 그래서 1~3단계를 오가는 동안에는
 * 브라우저가 입력을 들고 있어야 한다.
 *
 * ⚠️ **커밋 엔드포인트는 아직 없다 — 가정도 적지 않는다.** BE 레포 실코드로 확인한 뒤 적는다
 *    (CLAUDE.md §연동 검증). 여기에 추측 경로를 적어두면 그게 계약처럼 굳는다.
 *
 * ⚠️ `sessionStorage`를 쓴다 — 탭을 닫으면 사라진다.
 *    `localStorage`면 다른 계정으로 로그인해도 이전 기업의 부서·직급이 남아 위험하다.
 * ⚠️ 서버 저장이 붙으면 **이 파일과 각 화면의 `saveDraft*` 호출만 지우면 된다.**
 *    다른 곳에서 `sessionStorage`를 직접 만지지 않는다.
 */

const KEY = "z:onboarding-draft";

interface OnboardingDraft {
  departments?: DepartmentNode[];
  positions?: Position[];
  invites?: Invite[];
  /**
   * 3단계 [완료]로 **제출을 마쳤는가.**
   *
   * ⚠️ 초대 줄의 `isSent`로 추측하지 않는다 — 주소를 한 줄도 안 적고 마친 회사는
   *    `isSent`가 하나도 없어서 "아직 안 했다"로 읽힌다. 제출은 초대와 별개의 사실이다.
   * ⚠️ 이 값이 켜지면 **1·2·3단계에 머물 수 없다**(`useCommittedRedirect`).
   *    부서·직급·초대를 한 번에 보내는 구조라, 보낸 뒤에 앞 단계를 고치면
   *    화면과 서버가 갈라진다.
   */
  isCommitted?: boolean;
}

/**
 * 저장된 값의 모양을 실제로 확인한다.
 *
 * ⚠️ `JSON.parse` 결과를 그냥 단언하면 **깨진 값이 그대로 화면까지 간다.** 스키마가 바뀐 뒤
 *    남아 있던 값이나 손으로 고친 값이 들어오면 `.map()`에서 터진다. 통과 못 한 항목은 버린다.
 */
function isDepartmentNode(value: unknown, depth = 0): value is DepartmentNode {
  if (typeof value !== "object" || value === null) return false;
  const node = value as Record<string, unknown>;
  if (typeof node.id !== "string" || typeof node.name !== "string") return false;
  if (!Array.isArray(node.children)) return false;

  // ⚠️ 깊이도 본다 — 화면은 2계층(부서 > 역할)만 만들지만 타입은 재귀라 막아주지 않는다.
  //    3계층이 들어오면 트리도 요약 숫자도 어긋난다.
  if (node.children.length > 0 && depth + 1 >= MAX_DEPARTMENT_DEPTH) return false;

  return node.children.every((child) => isDepartmentNode(child, depth + 1));
}

function isPosition(value: unknown): value is Position {
  if (typeof value !== "object" || value === null) return false;
  const position = value as Record<string, unknown>;
  return (
    typeof position.id === "string" &&
    typeof position.name === "string" &&
    typeof position.role === "string"
  );
}

function isInvite(value: unknown): value is Invite {
  if (typeof value !== "object" || value === null) return false;
  const invite = value as Record<string, unknown>;
  return (
    typeof invite.id === "string" &&
    // ⚠️ 이름은 나중에 생긴 칸이다 — 옛 보관값에는 없어서 `undefined`도 통과시킨다
    (invite.name === undefined || typeof invite.name === "string") &&
    typeof invite.email === "string" &&
    typeof invite.departmentId === "string" &&
    typeof invite.roleId === "string" &&
    typeof invite.positionId === "string" &&
    typeof invite.isSent === "boolean"
  );
}

/**
 * 배열이고 모든 항목이 통과할 때만 되살린다. 하나라도 깨졌으면 그 목록은 없는 셈 친다.
 *
 * ⚠️ `value.every(guard)`로 넘기지 않는다 — `every`는 콜백에 **(항목, 인덱스, 배열)** 을 준다.
 *    `isDepartmentNode(node, depth)`처럼 둘째 인자를 받는 가드에 인덱스가 깊이로 새어 들어가,
 *    두 번째 항목부터 엉뚱하게 걸러진다. 항목 하나만 넘긴다.
 */
function pick<T>(value: unknown, guard: (item: unknown) => item is T): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.every((item) => guard(item)) ? value : undefined;
}

function parseDraft(value: unknown): OnboardingDraft {
  if (typeof value !== "object" || value === null) return {};
  const draft = value as Record<string, unknown>;

  return {
    departments: pick(draft.departments, isDepartmentNode),
    positions: pick(draft.positions, isPosition),
    /*
      ⚠️ **되살릴 때 빈 칸을 채운다.** 이름은 나중에 생긴 칸이라 옛 보관값에는 없다 —
         `undefined`가 그대로 입력칸의 `value`로 들어가면 React가 그 칸을
         **uncontrolled로 시작했다가 controlled로 바뀌었다**며 경고를 뱉고,
         첫 글자를 칠 때까지 값이 안 잡힌다. 경계에서 한 번만 메운다.
    */
    invites: pick(draft.invites, isInvite)?.map((invite) => ({
      ...invite,
      name: invite.name ?? "",
    })),
    isCommitted: draft.isCommitted === true,
  };
}

function read(): OnboardingDraft {
  // SSR에는 sessionStorage가 없다. 서버 렌더에서는 항상 빈 값이다.
  if (typeof window === "undefined") return {};

  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? parseDraft(JSON.parse(raw)) : {};
  } catch {
    // 사파리 프라이빗 모드 등에서 접근이 막히거나 값이 깨졌을 때 — 없는 셈 친다
    return {};
  }
}

function write(next: OnboardingDraft): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 저장 실패는 무시한다. 화면 동작은 메모리 상태로 계속된다.
  }
}

export function loadDraft(): OnboardingDraft {
  return read();
}

export function saveDraftDepartments(departments: DepartmentNode[]): void {
  write({ ...read(), departments });
}

export function saveDraftPositions(positions: Position[]): void {
  write({ ...read(), positions });
}

export function saveDraftInvites(invites: Invite[]): void {
  write({ ...read(), invites });
}

/**
 * 제출 완료 도장 — 3단계 [완료]의 확인 창에서 [등록하기]를 누른 순간 찍는다.
 *
 * ⚠️ 서버 커밋이 붙으면 **응답이 성공한 뒤에** 찍는다. 지금은 목이라 바로 찍는다.
 */
export function markDraftCommitted(): void {
  write({ ...read(), isCommitted: true });
}

/**
 * 온보딩을 마쳤거나 로그아웃할 때 — 다음 사람의 화면에 남지 않게 지운다.
 *
 * ⚠️ **아직 부르는 곳이 없다. 일부러 그렇다.** 지금은 [완료]가 서버에 아무것도 보내지 않아서,
 *    여기서 지우면 저장된 적 없는 입력이 그냥 사라진다. **서버 커밋이 붙는 순간** 커밋 성공 뒤와
 *    로그아웃 흐름에서 부른다.
 */
export function clearDraft(): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}
