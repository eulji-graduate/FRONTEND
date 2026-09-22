import type { DepartmentNode } from "./types";

/** 부서 트리 조작 — 전부 순수 함수다(원본을 바꾸지 않는다). */

export function countDepartments(nodes: DepartmentNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countDepartments(node.children), 0);
}

export function createDepartment(name: string): DepartmentNode {
  return { id: crypto.randomUUID(), name, children: [] };
}

/** 같은 계층에 이름이 겹치지 않게 뒤에 번호를 붙인다 — `새 팀` → `새 팀 2`. */
export function nextAvailableName(siblings: DepartmentNode[], base: string): string {
  const taken = new Set(siblings.map((node) => node.name));
  if (!taken.has(base)) return base;

  let index = 2;
  while (taken.has(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}

export function findNode(nodes: DepartmentNode[], id: string): DepartmentNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}

/** 특정 부모의 자식 목록을 찾는다(없으면 최상위). */
export function findSiblings(nodes: DepartmentNode[], parentId: string | null): DepartmentNode[] {
  if (parentId === null) return nodes;

  for (const node of nodes) {
    if (node.id === parentId) return node.children;
    const found = findSiblings(node.children, parentId);
    if (found.length > 0) return found;
  }
  return [];
}

export function appendChild(
  nodes: DepartmentNode[],
  parentId: string,
  child: DepartmentNode,
): DepartmentNode[] {
  return nodes.map((node) =>
    node.id === parentId
      ? { ...node, children: [...node.children, child] }
      : { ...node, children: appendChild(node.children, parentId, child) },
  );
}

export function renameDepartment(
  nodes: DepartmentNode[],
  id: string,
  name: string,
): DepartmentNode[] {
  return nodes.map((node) =>
    node.id === id
      ? { ...node, name }
      : { ...node, children: renameDepartment(node.children, id, name) },
  );
}

/** 하위 부서도 함께 사라진다. 호출부에서 확인을 받는다. */
export function removeDepartment(nodes: DepartmentNode[], id: string): DepartmentNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({ ...node, children: removeDepartment(node.children, id) }));
}

/**
 * 부서를 **다른 상위 부서로** 옮긴다. 조직 개편은 흔하므로 지우고 다시 만들게 하지 않는다.
 * `position`이 `inside`면 대상의 하위로 들어가고, `before`/`after`면 대상의 형제가 된다.
 * ⚠️ 계층 제한(2단계)은 호출부에서 검사한다 — 여기서는 트리 조작만 한다.
 */
export function moveNodeTo(
  nodes: DepartmentNode[],
  draggedId: string,
  targetId: string,
  position: "before" | "after" | "inside",
): DepartmentNode[] {
  if (draggedId === targetId) return nodes;

  // 자기 자손 안으로는 못 들어간다(트리가 끊긴다)
  const dragged = findNode(nodes, draggedId);
  if (!dragged || findNode(dragged.children, targetId)) return nodes;

  const detached = removeDepartment(nodes, draggedId);
  return position === "inside"
    ? insertInside(detached, targetId, dragged)
    : insertBeside(detached, targetId, dragged, position);
}

function insertInside(
  nodes: DepartmentNode[],
  parentId: string,
  node: DepartmentNode,
): DepartmentNode[] {
  return nodes.map((current) =>
    current.id === parentId
      ? { ...current, children: [...current.children, node] }
      : { ...current, children: insertInside(current.children, parentId, node) },
  );
}

function insertBeside(
  nodes: DepartmentNode[],
  targetId: string,
  node: DepartmentNode,
  position: "before" | "after",
): DepartmentNode[] {
  const index = nodes.findIndex((current) => current.id === targetId);
  if (index !== -1) {
    const next = [...nodes];
    next.splice(position === "before" ? index : index + 1, 0, node);
    return next;
  }
  return nodes.map((current) => ({
    ...current,
    children: insertBeside(current.children, targetId, node, position),
  }));
}

/** 트리를 평탄화해 미리보기 목록으로 만든다. */
export function flattenDepartments(
  nodes: DepartmentNode[],
  depth = 0,
): Array<{ id: string; name: string; depth: number }> {
  return nodes.flatMap((node) => [
    { id: node.id, name: node.name, depth },
    ...flattenDepartments(node.children, depth + 1),
  ]);
}

/** 소속 부서 후보 — 트리 윗단(부서)만. */
export function rootDepartments(nodes: DepartmentNode[]): Array<{ id: string; name: string }> {
  return nodes.map((node) => ({ id: node.id, name: node.name }));
}

/** 그 부서 안의 역할 목록 — 트리 아랫단. 없으면 빈 배열이다. */
export function departmentRoles(
  nodes: DepartmentNode[],
  departmentId: string,
): Array<{ id: string; name: string }> {
  const department = nodes.find((node) => node.id === departmentId);
  return (department?.children ?? []).map((child) => ({ id: child.id, name: child.name }));
}
