"use client";

import { useState } from "react";

import {
  appendChild,
  createDepartment,
  findNode,
  findSiblings,
  moveNodeTo,
  nextAvailableName,
  removeDepartment,
  renameDepartment,
} from "./tree";
import { demoteNode, promoteNode, shiftNode } from "./tree-keyboard";
import type { DepartmentNode } from "./types";

const NEW_CHILD_NAME = "새 역할";

/**
 * 부서 트리 편집 상태.
 * 트리 조작 자체는 `tree.ts`의 순수 함수가 하고, 여기서는 **무엇을 언제 부를지**만 정한다.
 */
export function useDepartmentTree(initial: DepartmentNode[]) {
  const [departments, setDepartments] = useState(initial);
  /** 이름을 편집 중인 부서 — 새로 만든 부서는 바로 편집 상태로 연다 */
  const [editingId, setEditingId] = useState<string | null>(null);
  /** 안에 든 역할까지 사라지는 삭제는 확인을 받는다 */
  const [pendingDelete, setPendingDelete] = useState<DepartmentNode | null>(null);

  const addRoot = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    setDepartments((prev) => [...prev, createDepartment(trimmed)]);
    return true;
  };

  const addChild = (parentId: string) => {
    const name = nextAvailableName(findSiblings(departments, parentId), NEW_CHILD_NAME);
    const child = createDepartment(name);
    setDepartments((prev) => appendChild(prev, parentId, child));
    setEditingId(child.id);
  };

  const requestRemove = (id: string) => {
    const target = findNode(departments, id);
    if (!target) return;
    if (target.children.length > 0) setPendingDelete(target);
    else setDepartments((prev) => removeDepartment(prev, id));
  };

  const confirmRemove = (id: string) => {
    setDepartments((prev) => removeDepartment(prev, id));
    setPendingDelete(null);
  };

  return {
    departments,
    /** 임시 보관함에서 되돌릴 때만 쓴다(draft.ts) */
    reset: (next: DepartmentNode[]) => setDepartments(next),
    editingId,
    setEditingId,
    pendingDelete,
    cancelRemove: () => setPendingDelete(null),
    addRoot,
    addChild,
    requestRemove,
    confirmRemove,
    rename: (id: string, name: string) =>
      setDepartments((prev) => renameDepartment(prev, id, name)),
    move: (draggedId: string, targetId: string, position: "before" | "after" | "inside") =>
      setDepartments((prev) => moveNodeTo(prev, draggedId, targetId, position)),
    shift: (id: string, offset: 1 | -1) => setDepartments((prev) => shiftNode(prev, id, offset)),
    promote: (id: string) => setDepartments((prev) => promoteNode(prev, id)),
    demote: (id: string) => setDepartments((prev) => demoteNode(prev, id)),
  };
}
