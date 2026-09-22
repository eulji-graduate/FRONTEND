"use client";

import { useState } from "react";

import { AUTHORITY } from "@/constants/domain";

import {
  changePositionRole,
  createPosition,
  enforceSingleLeader,
  isLeaderTaken,
  movePosition,
  nextAvailablePositionName,
  removePosition,
  renamePosition,
  shiftPosition,
} from "./positions";
import type { AssignableRole, Position } from "./types";

/**
 * 직급 목록 편집 상태.
 * 목록 조작은 `positions.ts`의 순수 함수가 하고, 여기서는 **무엇을 언제 부를지**만 정한다.
 */
export function usePositionList(initial: Position[]) {
  const [positions, setPositions] = useState(initial);
  /** 이름을 편집 중인 직급 — 새로 만든 직급은 바로 편집 상태로 연다 */
  const [editingId, setEditingId] = useState<string | null>(null);

  const add = (name: string, role: AssignableRole) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    setPositions((prev) => {
      // 리더가 이미 있으면 멤버로 낮춰 들어간다 — 조용히 둘이 되게 두지 않는다
      const safeRole = role === AUTHORITY.LEADER && isLeaderTaken(prev) ? AUTHORITY.MEMBER : role;
      return [...prev, createPosition(nextAvailablePositionName(prev, trimmed), safeRole)];
    });
    return true;
  };

  return {
    positions,
    /**
     * 임시 보관함에서 되돌릴 때만 쓴다(draft.ts).
     * ⚠️ 보관함 값은 `add`·`changeRole`의 검사를 지나지 않는다 — 리더가 둘이면 여기서 정리한다.
     */
    reset: (next: Position[]) => setPositions(enforceSingleLeader(next)),
    editingId,
    setEditingId,
    add,
    rename: (id: string, name: string) => setPositions((prev) => renamePosition(prev, id, name)),
    /** 리더가 이미 있으면 바꾸지 않는다 — 화면에서도 그 항목을 잠근다 */
    changeRole: (id: string, role: AssignableRole) =>
      setPositions((prev) =>
        role === AUTHORITY.LEADER && isLeaderTaken(prev, id)
          ? prev
          : changePositionRole(prev, id, role),
      ),
    remove: (id: string) => setPositions((prev) => removePosition(prev, id)),
    move: (draggedId: string, targetId: string, position: "before" | "after") =>
      setPositions((prev) => movePosition(prev, draggedId, targetId, position)),
    shift: (id: string, offset: 1 | -1) => setPositions((prev) => shiftPosition(prev, id, offset)),
    /** 새 직급의 기본 권한 — 가장 좁은 권한에서 시작해 필요한 만큼 올린다 */
    defaultRole: AUTHORITY.MEMBER as AssignableRole,
  };
}
