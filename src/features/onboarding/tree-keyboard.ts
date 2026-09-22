import type { DepartmentNode } from "./types";

/**
 * 키보드로 트리를 옮기는 조작 — 드래그의 대체 경로다(CLAUDE.md §a11y).
 * 드래그와 같은 규칙(2계층 유지)을 따르고, 전부 순수 함수다.
 */

/** 키보드용 — 하위 부서를 최상위로 빼낸다(원래 상위 부서 바로 아래에 놓는다). */
export function promoteNode(nodes: DepartmentNode[], id: string): DepartmentNode[] {
  for (let index = 0; index < nodes.length; index += 1) {
    const parent = nodes[index];
    if (!parent) continue;

    const child = parent.children.find((node) => node.id === id);
    if (!child) continue;

    const next = [...nodes];
    next[index] = { ...parent, children: parent.children.filter((node) => node.id !== id) };
    next.splice(index + 1, 0, child);
    return next;
  }
  return nodes;
}

/** 키보드용 — 바로 위 형제의 하위로 넣는다. 최상위에서만 가능하다(2계층). */
export function demoteNode(nodes: DepartmentNode[], id: string): DepartmentNode[] {
  const index = nodes.findIndex((node) => node.id === id);
  if (index <= 0) return nodes;

  const node = nodes[index];
  const previous = nodes[index - 1];
  if (!node || !previous || node.children.length > 0) return nodes;

  const next = [...nodes];
  next.splice(index, 1);
  next[index - 1] = { ...previous, children: [...previous.children, node] };
  return next;
}

/** 키보드용 — 형제 안에서 한 칸 위/아래로 옮긴다. */
export function shiftNode(nodes: DepartmentNode[], id: string, offset: 1 | -1): DepartmentNode[] {
  const from = nodes.findIndex((node) => node.id === id);

  if (from !== -1) {
    const to = from + offset;
    return to < 0 || to >= nodes.length ? nodes : reorder(nodes, from, to);
  }

  return nodes.map((node) => ({ ...node, children: shiftNode(node.children, id, offset) }));
}

function reorder(nodes: DepartmentNode[], from: number, to: number): DepartmentNode[] {
  const next = [...nodes];
  const [moved] = next.splice(from, 1);
  if (!moved) return nodes;
  next.splice(to, 0, moved);
  return next;
}
