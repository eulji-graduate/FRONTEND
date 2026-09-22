import { AUTHORITY } from "@/constants/domain";

import type { AssignableRole, Position } from "./types";

/** 직급 목록 조작 — 전부 순수 함수다(원본을 바꾸지 않는다). */

export function createPosition(name: string, role: AssignableRole): Position {
  return { id: crypto.randomUUID(), name, role };
}

/** 이름이 겹치지 않게 뒤에 번호를 붙인다 — `새 직급` → `새 직급 2`. */
export function nextAvailablePositionName(positions: Position[], base: string): string {
  const taken = new Set(positions.map((position) => position.name));
  if (!taken.has(base)) return base;

  let index = 2;
  while (taken.has(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}

export function renamePosition(positions: Position[], id: string, name: string): Position[] {
  return positions.map((position) => (position.id === id ? { ...position, name } : position));
}

export function changePositionRole(
  positions: Position[],
  id: string,
  role: AssignableRole,
): Position[] {
  return positions.map((position) => (position.id === id ? { ...position, role } : position));
}

export function removePosition(positions: Position[], id: string): Position[] {
  return positions.filter((position) => position.id !== id);
}

/** 드래그 이동 — 대상의 앞/뒤로 옮긴다. 직급은 서열이라 순서 자체가 의미를 가진다. */
export function movePosition(
  positions: Position[],
  draggedId: string,
  targetId: string,
  position: "before" | "after",
): Position[] {
  if (draggedId === targetId) return positions;

  const from = positions.findIndex((item) => item.id === draggedId);
  const hasTarget = positions.some((item) => item.id === targetId);
  if (from === -1 || !hasTarget) return positions;

  const next = [...positions];
  const [moved] = next.splice(from, 1);
  if (!moved) return positions;

  const targetIndex = next.findIndex((item) => item.id === targetId);
  next.splice(position === "before" ? targetIndex : targetIndex + 1, 0, moved);
  return next;
}

/** 키보드용 — 한 칸 위/아래로 옮긴다. */
export function shiftPosition(positions: Position[], id: string, offset: 1 | -1): Position[] {
  const from = positions.findIndex((item) => item.id === id);
  if (from === -1) return positions;

  const to = from + offset;
  if (to < 0 || to >= positions.length) return positions;

  const next = [...positions];
  const [moved] = next.splice(from, 1);
  if (!moved) return positions;
  next.splice(to, 0, moved);
  return next;
}

/**
 * 리더 직급이 이미 있는지.
 * **리더는 기업에 하나뿐**이다 — 팀장 같은 직급 하나에만 붙이고 나머지는 멤버로 둔다.
 */
/**
 * 리더는 한 직급뿐이다 — 첫 번째만 남기고 나머지는 멤버로 낮춘다.
 *
 * ⚠️ `add`·`changeRole`은 들어오는 값을 하나씩 막지만, **임시 보관함에서 통째로 되돌릴 때는
 *    그 문을 지나지 않는다.** 옛 보관함에 리더가 둘 있으면 그대로 살아난다 — 여기서 정리한다.
 */
export function enforceSingleLeader(positions: Position[]): Position[] {
  let hasLeader = false;

  return positions.map((position) => {
    if (position.role !== AUTHORITY.LEADER) return position;
    if (hasLeader) return { ...position, role: AUTHORITY.MEMBER as AssignableRole };

    hasLeader = true;
    return position;
  });
}

export function isLeaderTaken(positions: Position[], exceptId?: string): boolean {
  return positions.some(
    (position) => position.role === AUTHORITY.LEADER && position.id !== exceptId,
  );
}

/** 이 줄에서 고를 수 없는 권한 — 화면에서 잠근다. */
export function blockedRoles(positions: Position[], exceptId?: string): AssignableRole[] {
  return isLeaderTaken(positions, exceptId) ? [AUTHORITY.LEADER] : [];
}
